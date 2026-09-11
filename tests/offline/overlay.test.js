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
