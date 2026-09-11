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

function classListMock() {
	return {
		add: function() {},
		remove: function() {},
		toggle: function() {},
		contains: function() {
			return false;
		}
	};
}

function elementMock() {
	return {
		classList: classListMock(),
		style: {},
		addEventListener: function() {},
		setAttribute: function() {},
		getAttribute: function() {
			return null;
		},
		querySelectorAll: function() {
			return [];
		}
	};
}

function makeConcatContext(readyState) {
	const documentElement = elementMock();
	const body = elementMock();
	const document = {
		readyState: readyState,
		documentElement: documentElement,
		body: body,
		querySelectorAll: function() {
			return [];
		},
		querySelector: function() {
			return null;
		},
		getElementById: function() {
			return elementMock();
		},
		addEventListener: function() {}
	};
	const context = {
		document: document,
		window: {
			document: document,
			matchMedia: function() {
				return {
					matches: false,
					addEventListener: function() {},
					addListener: function() {}
				};
			},
			addEventListener: function() {},
			innerHeight: 800
		},
		localStorage: {
			getItem: function() {
				return null;
			},
			setItem: function() {}
		},
		WOLO_APPLE_MAPS_TOKEN: '',
		initLoadDone: false,
		showNotification: function() {},
		firebaseInit: function() {},
		initApp: function() {},
		dbInit: function() {},
		initOfflineStatus: function() {},
		versionCheck: function() {
			return false;
		},
		urlDecode: function() {
			return false;
		},
		syncInitMap: function() {},
		setupControls: function() {},
		console: console
	};
	context.window.document = document;
	return context;
}

test('root initLoad is late-bound so concatenated /root.js cannot call it before MapLayers vars exist', () => {
	const rootScript = read('Root/JS/Component/Root/Script.js');
	assert.match(rootScript, /var initLoad = function\s*\(/);
	assert.doesNotMatch(rootScript, /function initLoad\s*\(/);
	assert.match(rootScript, /document\.readyState !== 'loading'/);
	assert.match(rootScript.trim().split('\n').slice(-2).join('\n'), /initLoad\(\)/);
});

test('console initLoad is late-bound the same way as the root bundle', () => {
	const consoleScript = read('Root/JS/Component/Console/Script.js');
	assert.match(consoleScript, /var initLoad = function\s*\(/);
	assert.doesNotMatch(consoleScript, /function initLoad\s*\(/);
	assert.match(consoleScript, /document\.readyState !== 'loading'/);
	assert.match(consoleScript.trim().split('\n').slice(-2).join('\n'), /initLoad\(\)/);
});

test('function-declaration initLoad reads MAP_SOURCE_IDS before the concatenated assignment', () => {
	const kickoff = read('Root/JS/Script.js');
	assert.throws(() => {
		vm.runInNewContext(
			[
				'function initMapSource() { MAP_SOURCE_IDS.length; }',
				'function initLoad() { if(document.readyState !== "loading") initMapSource(); }',
				kickoff,
				'var MAP_SOURCE_IDS = ["google"];'
			].join('\n'),
			{ document: { readyState: 'interactive' } }
		);
	}, /MAP_SOURCE_IDS|undefined/);
});

test('production concat order can run initMapSource after MapLayers.js assigns MAP_SOURCE_IDS', () => {
	const context = makeConcatContext('interactive');
	vm.runInNewContext(
		[
			read('Root/JS/Script.js'),
			read('Root/JS/Component/Root/MapLayers.js'),
			read('Root/JS/Component/Root/Theme.js'),
			[
				'var initLoad = function() {',
				'	if(!initLoadDone && document.readyState !== "loading") {',
				'		initTheme();',
				'		initMapSource();',
				'		initLoadDone = true;',
				'	}',
				'};',
				'if(typeof initLoad !== "undefined")',
				'	initLoad();'
			].join('\n')
		].join('\n'),
		context
	);
	assert.equal(context.initLoadDone, true);
	assert.equal(context.mapSourcePrefs.google, 'default');
	assert.equal(context.MAP_SOURCE_IDS.length, 5);
});

test('late async bundle still inits when document.readyState is complete', () => {
	const context = makeConcatContext('complete');
	vm.runInNewContext(
		[
			read('Root/JS/Script.js'),
			read('Root/JS/Component/Root/MapLayers.js'),
			[
				'var initLoad = function() {',
				'	if(!initLoadDone && document.readyState !== "loading") {',
				'		initMapSource();',
				'		initLoadDone = true;',
				'	}',
				'};',
				'if(typeof initLoad !== "undefined")',
				'	initLoad();'
			].join('\n')
		].join('\n'),
		context
	);
	assert.equal(context.initLoadDone, true);
	assert.equal(context.MAP_SOURCE_IDS[0], 'google');
});
