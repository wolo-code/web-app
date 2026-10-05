'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function extractFunction(source, name, stopMarker) {
	const start = source.indexOf('function ' + name);
	assert.ok(start > -1, 'missing ' + name);
	const next = source.indexOf('\nfunction ', start + 1);
	const stop = stopMarker ? source.indexOf(stopMarker, start + 1) : -1;
	let end = source.length;
	if(next !== -1)
		end = Math.min(end, next);
	if(stop !== -1)
		end = Math.min(end, stop);
	return source.slice(start, end);
}

function loadFirebaseApi(options) {
	const scripts = options && options.scripts ? options.scripts : {};
	const appended = [];
	const sandbox = {
		firebase: options && 'firebase' in options ? options.firebase : undefined,
		database: null,
		refCityCenter: null,
		geoFire: null,
		FIREBASE_CONFIG: {},
		Date,
		Sentry: { captureException: function() {} },
		sessionStorage: {},
		prompted: [],
		notifications: [],
		initLoadCalls: 0,
		appended: appended,
		document: {
			querySelector: function(selector) {
				if(selector.indexOf('firebase-app.js') !== -1)
					return scripts.app || null;
				if(selector.indexOf('firebase-database.js') !== -1)
					return scripts.database || null;
				return null;
			},
			createElement: function() {
				return { src: '', onload: null, onerror: null };
			},
			head: {
				appendChild: function(node) {
					appended.push(node);
				}
			}
		},
		window: {
			addEventListener: function() {},
			location: { reload: function() {} }
		},
		showErrorPrompt: function(error) {
			sandbox.prompted.push(error);
		},
		showNotification: function(message) {
			sandbox.notifications.push(message);
		},
		pushLoader: function() {},
		popLoader: function() {}
	};
	sandbox.initLoad = function() {
		sandbox.initLoadCalls += 1;
	};
	vm.createContext(sandbox);
	vm.runInContext(read('Root/JS/Firebase.js'), sandbox);
	return sandbox;
}

function loadOfflineModeApi() {
	const sandbox = { firebaseClientUnavailable: false, navigator: { onLine: true } };
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(read('Root/JS/Component/Root/Base/OfflineStore.js'), 'isOfflineMode'), sandbox);
	return sandbox;
}

function loadServiceWorkerNetworkApi() {
	const sw = read('Root/sw.js');
	const hostsStart = sw.indexOf('var NETWORK_ONLY_HOSTS');
	const hostsEnd = sw.indexOf('];', hostsStart) + 2;
	assert.ok(hostsStart > -1, 'missing NETWORK_ONLY_HOSTS');
	const sandbox = {
		TILE_HOST_SUFFIXES: [
			'maps.googleapis.com',
			'maps.gstatic.com'
		]
	};
	vm.createContext(sandbox);
	vm.runInContext(sw.slice(hostsStart, hostsEnd), sandbox);
	vm.runInContext(extractFunction(sw, 'isTileHost'), sandbox);
	vm.runInContext(extractFunction(sw, 'isMapTileRequest'), sandbox);
	vm.runInContext(extractFunction(sw, 'isFirebaseSdkRequest'), sandbox);
	vm.runInContext(extractFunction(sw, 'isNetworkOnlyRequest'), sandbox);
	return sandbox;
}

test('firebaseInit continues without a crash when the Database SDK never loads', () => {
	const api = loadFirebaseApi();
	assert.equal(api.firebaseInit(), true);
	assert.equal(api.firebaseClientUnavailable, true);
	assert.equal(api.database, null);
	assert.equal(api.prompted.length, 0);
	assert.match(api.notifications[0] || '', /cached data while Firebase is unavailable/);
});

test('firebaseInit retries a missing Database SDK and resumes startup after success', () => {
	const databaseScript = { src: 'https://www.gstatic.com/firebasejs/7.14.2/firebase-database.js' };
	const api = loadFirebaseApi({
		firebase: {},
		scripts: { database: databaseScript }
	});
	assert.equal(api.firebaseInit(), false);
	assert.equal(api.appended.length, 1);
	assert.match(api.appended[0].src, /firebase-database\.js\?_retry=/);
	api.firebase = {
		database: function() {
			return { ref: function() { return {}; } };
		},
		initializeApp: function() {}
	};
	api.appended[0].onload();
	assert.equal(api.initLoadCalls, 1);
	assert.equal(api.prompted.length, 0);
	assert.equal(api.firebaseInit(), true);
	assert.equal(api.firebaseClientUnavailable, false);
	assert.ok(api.database);
});

test('a failed Database SDK retry does not open the crash dialog', () => {
	const databaseScript = { src: 'https://www.gstatic.com/firebasejs/7.14.2/firebase-database.js' };
	const api = loadFirebaseApi({
		firebase: {},
		scripts: { database: databaseScript }
	});
	assert.equal(api.firebaseInit(), false);
	api.appended[0].onerror();
	assert.equal(api.initLoadCalls, 1);
	assert.equal(api.prompted.length, 0);
	assert.equal(api.firebaseInit(), true);
	assert.equal(api.firebaseClientUnavailable, true);
	assert.match(api.notifications[0] || '', /cached data while Firebase is unavailable/);
});

test('isOfflineMode treats a missing Firebase client as offline data mode', () => {
	const api = loadOfflineModeApi();
	assert.equal(api.isOfflineMode(), false);
	api.firebaseClientUnavailable = true;
	assert.equal(api.isOfflineMode(), true);
	api.firebaseClientUnavailable = false;
	api.navigator.onLine = false;
	assert.equal(api.isOfflineMode(), true);
});

test('dbInit uses the cached word list when the Database SDK is missing', () => {
	const sandbox = {
		database: null,
		offlineInits: 0
	};
	sandbox.initOfflineWordList = function() {
		sandbox.offlineInits += 1;
	};
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(read('Root/JS/Component/Root/Database.js'), 'dbInit'), sandbox);
	sandbox.dbInit();
	assert.equal(sandbox.offlineInits, 1);
});

test('initApp shows signed-out chrome when Firebase Auth is missing', () => {
	const sandbox = {
		firebase: undefined,
		signedOut: 0
	};
	sandbox.showSignedOutAccountChrome = function() {
		sandbox.signedOut += 1;
	};
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(read('Root/JS/Component/Root/Script.js'), 'initApp'), sandbox);
	sandbox.initApp();
	assert.equal(sandbox.signedOut, 1);
});

test('geoFireInit fails closed without a CityCenter ref', () => {
	const api = loadFirebaseApi();
	api.refCityCenter = null;
	assert.equal(api.geoFireInit(), false);
	api.refCityCenter = {};
	api.GeoFire = function() {
		this.ready = true;
	};
	assert.equal(api.geoFireInit(), true);
	assert.equal(api.geoFire.ready, true);
});

test('service worker does not force Firebase SDK scripts onto the network', () => {
	const sw = read('Root/sw.js');
	const api = loadServiceWorkerNetworkApi();
	const sdkUrl = new URL('https://www.gstatic.com/firebasejs/7.14.2/firebase-database.js');
	assert.equal(api.isFirebaseSdkRequest(sdkUrl), true);
	assert.equal(api.isNetworkOnlyRequest(sdkUrl), false);
	assert.equal(api.isNetworkOnlyRequest(new URL('https://wolo-prod.firebaseio.com/CityCenter.json')), true);
	assert.match(sw, /function isFirebaseSdkRequest/);
	assert.match(sw, /if \(isFirebaseSdkRequest\(url\)\) \{\s*return;/);
	assert.ok(!api.NETWORK_ONLY_HOSTS.includes('gstatic.com/firebasejs'));
});
