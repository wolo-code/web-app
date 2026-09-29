'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');

function createClassList(initial) {
	const classes = new Set(initial || []);
	return {
		contains: (name) => classes.has(name),
		add: (name) => { classes.add(name); },
		remove: (name) => { classes.delete(name); },
		toggle: (name, force) => {
			if(force === false)
				classes.delete(name);
			else if(force === true)
				classes.add(name);
			else if(classes.has(name))
				classes.delete(name);
			else
				classes.add(name);
			return classes.has(name);
		}
	};
}

function loadOverlay(document) {
	const code = fs.readFileSync(path.join(repoRoot, 'Root/JS/Component/Root/Overlay.js'), 'utf8');
	const context = { document };
	vm.createContext(context);
	vm.runInContext(code, context);
	return context;
}

test('showOverlay does not throw when the panel is missing', () => {
	const overlay = {
		classList: createClassList(['hide']),
		children: [{ firstChild: null }]
	};
	const document = {
		getElementById: (id) => id === 'overlay' ? overlay : null
	};
	const ctx = loadOverlay(document);
	assert.doesNotThrow(() => ctx.showOverlay(null));
	assert.doesNotThrow(() => ctx.showOverlay(document.getElementById('invalid_code_message')));
	assert.equal(overlay.classList.contains('hide'), true);
});

test('showOverlay reveals an existing hidden panel', () => {
	const panel = { classList: createClassList(['hide']), nodeType: 1, nextSibling: null };
	const overlay = {
		classList: createClassList(['hide']),
		children: [{ firstChild: panel }]
	};
	const document = {
		getElementById: (id) => {
			if(id === 'overlay')
				return overlay;
			return null;
		}
	};
	const ctx = loadOverlay(document);
	ctx.showOverlay(panel);
	assert.equal(overlay.classList.contains('hide'), false);
	assert.equal(panel.classList.contains('hide'), false);
});

test('hideOverlay does not treat a missing panel as the visible overlay', () => {
	const visible = { classList: createClassList([]), nodeType: 1, nextSibling: null };
	const overlay = {
		classList: createClassList([]),
		children: [{ firstChild: visible }]
	};
	const document = {
		getElementById: (id) => id === 'overlay' ? overlay : null
	};
	const ctx = loadOverlay(document);
	assert.doesNotThrow(() => ctx.hideOverlay(null));
	assert.equal(overlay.classList.contains('hide'), false);
	assert.equal(visible.classList.contains('hide'), false);
});

test('locate and map hide accuracy chrome through presence guards', () => {
	const locate = fs.readFileSync(path.join(repoRoot, 'Root/JS/Base/Locate.js'), 'utf8');
	const mapJs = fs.readFileSync(path.join(repoRoot, 'Root/JS/Component/Root/Map.js'), 'utf8');
	assert.match(locate, /removeClassIfPresent\(document\.getElementById\('proceed_container'\)/);
	assert.match(locate, /addClassIfPresent\(document\.getElementById\('accuracy_container'\)/);
	assert.doesNotMatch(locate, /getElementById\('proceed_container'\)\.classList/);
	assert.doesNotMatch(mapJs, /getElementById\('accuracy_container'\)\.classList/);
	assert.doesNotMatch(mapJs, /getElementById\('proceed_container'\)\.classList/);
});

const CLASSLIST_GUARD_FILES = [
	'Root/JS/Base/Loader.js',
	'Root/JS/Base/Base.js',
	'Root/JS/Base/LocateRight.js',
	'Root/JS/Notification.js',
	'Root/JS/Incompatible_browser.js',
	'Root/JS/Component/Root/Script.js',
	'Root/JS/Component/Root/Authentication.js',
	'Root/JS/Component/Root/Account.js',
	'Root/JS/Component/Root/QR.js',
	'Root/JS/Component/Root/Code/Core.js',
	'Root/JS/Component/Root/Code/Model.js',
	'Root/JS/Component/Root/Code/Code.js',
	'Root/JS/Component/Root/City.js',
	'Root/JS/Component/Root/NoCity.js'
];

function readRepo(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function extractFrom(source, startMarker) {
	const start = source.indexOf(startMarker);
	assert.ok(start > -1, 'missing ' + startMarker);
	return source.slice(start);
}

function extractFunction(source, name) {
	const start = source.indexOf('function ' + name);
	assert.ok(start > -1, 'missing ' + name);
	const next = source.indexOf('\nfunction ', start + 1);
	return next === -1 ? source.slice(start) : source.slice(start, next);
}

function loadClassListHelpers(document) {
	const locate = readRepo('Root/JS/Base/Locate.js');
	const context = {
		document,
		loaderCount: 1,
		initialLoaderPending: true,
		NOTIFICATION_DURATION_DEFAULT: 2500
	};
	vm.createContext(context);
	vm.runInContext(extractFrom(locate, 'function addClassIfPresent'), context);
	return context;
}

test('remaining hot classList sites no longer chain getElementById into classList', () => {
	for (const filePath of CLASSLIST_GUARD_FILES) {
		assert.doesNotMatch(
			readRepo(filePath),
			/getElementById\([^)]+\)\.classList/,
			filePath
		);
	}
	assert.match(readRepo('Root/JS/Base/Loader.js'), /removeClassIfPresent\(getWaitLoader\(\), 'hide'\)/);
	assert.match(readRepo('Root/JS/Base/Base.js'), /addClassIfPresent\(document\.getElementById\('info_agency'\)/);
	assert.match(readRepo('Root/JS/Component/Root/Code/Core.js'), /addClassIfPresent\(mapEl, 'current_city'\)/);
});

test('null classList throws the Sentry TypeError', () => {
	assert.throws(
		() => {
			const node = null;
			node.classList.add('hide');
		},
		{
			name: 'TypeError',
			message: /Cannot read properties of null \(reading 'classList'\)/
		}
	);
});

test('loader, info overlay, notifications, and map city classes no-op when nodes are missing', () => {
	const document = {
		getElementById: () => null
	};
	const ctx = loadClassListHelpers(document);
	vm.runInContext(readRepo('Root/JS/Base/Loader.js'), ctx);
	vm.runInContext(extractFrom(readRepo('Root/JS/Base/Base.js'), 'function activateOverlayInfo_full'), ctx);
	vm.runInContext(extractFrom(readRepo('Root/JS/Notification.js'), 'function getNotificationBottom'), ctx);
	vm.runInContext(extractFunction(readRepo('Root/JS/Component/Root/Code/Core.js'), 'setCurrentCity_status'), ctx);
	vm.runInContext(extractFunction(readRepo('Root/JS/Component/Root/Script.js'), 'showSignedOutAccountChrome'), ctx);
	assert.doesNotThrow(() => ctx.pushLoader());
	assert.doesNotThrow(() => ctx.popLoader());
	assert.doesNotThrow(() => ctx.clearLoader());
	assert.doesNotThrow(() => ctx.activateOverlayInfo_full());
	assert.doesNotThrow(() => ctx.activateOverlayInfo_links());
	assert.doesNotThrow(() => ctx.showNotification('offline'));
	assert.doesNotThrow(() => ctx.fadeOutNotification());
	assert.doesNotThrow(() => ctx.setCurrentCity_status(true));
	assert.doesNotThrow(() => ctx.setCurrentCity_status(false));
	assert.doesNotThrow(() => ctx.showSignedOutAccountChrome());
});

test('setCurrentCity_status still toggles map classes when the map node exists', () => {
	const mapEl = { classList: createClassList(['different_city']) };
	const document = {
		getElementById: (id) => id === 'map' ? mapEl : null
	};
	const ctx = loadClassListHelpers(document);
	vm.runInContext(extractFunction(readRepo('Root/JS/Component/Root/Code/Core.js'), 'setCurrentCity_status'), ctx);
	ctx.setCurrentCity_status(true);
	assert.equal(mapEl.classList.contains('current_city'), true);
	assert.equal(mapEl.classList.contains('different_city'), false);
});
