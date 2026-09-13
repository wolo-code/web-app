'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..');
const locateJs = fs.readFileSync(path.join(repoRoot, 'Root/JS/Base/Locate.js'), 'utf8');

function loadPoorAccuracyApi() {
	const start = locateJs.indexOf('var WATCH_LOCATION_POOR_ACCURACY');
	const end = locateJs.indexOf('function initLocate(');
	const sandbox = {};
	vm.createContext(sandbox);
	vm.runInContext(locateJs.slice(start, end), sandbox);
	return sandbox;
}

test('five consecutive 99+ samples fast-forward, and a better sample resets the streak', () => {
	const api = loadPoorAccuracyApi();
	assert.equal(api.WATCH_LOCATION_POOR_ACCURACY, 99.5);
	assert.equal(api.WATCH_LOCATION_POOR_ACCURACY_STREAK, 5);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(120), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(200), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), true);
	assert.equal(api.shouldFastForwardPoorAccuracy(40), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), false);
	assert.equal(api.shouldFastForwardPoorAccuracy(99.5), true);
});

test('locate auto-proceed from 99+ streak is skipped while long-press override is held', () => {
	assert.match(locateJs, /resetPoorAccuracyStreak\(\)/);
	assert.match(locateJs, /var fastForwardPoor = shouldFastForwardPoorAccuracy\(position\.coords\.accuracy\)/);
	assert.match(
		locateJs,
		/if\(!locate_button_pressed &&\s*\(position\.coords\.accuracy <= WATCH_LOCATION_MIN_ACCURACY \|\| fastForwardPoor\)\)/
	);
	assert.match(locateJs, /press_duration > location_button_PRESS_THRESHOLD && addClassIfPresent\(location_dot, 'blinking'\)/);
});
