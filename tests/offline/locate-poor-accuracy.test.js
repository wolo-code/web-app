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
	const ticks = [];
	const sandbox = {
		locating: true,
		locate_button_pressed: false,
		processed: null,
		Date,
		setInterval: function(fn) {
			ticks.push(fn);
			return 1;
		},
		clearInterval: function() {
			ticks.length = 0;
		},
		processPosition: function(pos) {
			sandbox.processed = pos;
		}
	};
	sandbox.ticks = ticks;
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

test('a stuck 99+ reading still counts one sample per second until fast-forward', () => {
	const api = loadPoorAccuracyApi();
	const pos = {lat: 12.9, lng: 77.6};
	assert.equal(api.noteWatchAccuracy(120, pos), false);
	assert.equal(api.ticks.length, 1);
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	assert.equal(api.processed, null);
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	assert.equal(api.processed, pos);
	api.resetPoorAccuracyStreak();
});

test('locate auto-proceed from 99+ streak is skipped while long-press override is held', () => {
	const api = loadPoorAccuracyApi();
	api.locate_button_pressed = true;
	const pos = {lat: 1, lng: 2};
	assert.equal(api.noteWatchAccuracy(99.5, pos), false);
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	api.lastPoorAccuracySampleAt = 0;
	api.ticks[0]();
	assert.equal(api.processed, null);
	api.resetPoorAccuracyStreak();

	assert.match(locateJs, /focusLocateWatchPosition\(pos\);\s*var fastForwardPoor = noteWatchAccuracy\(position\.coords\.accuracy, pos\)/);
	assert.match(locateJs, /locateLoaderHeld = true/);
	assert.match(locateJs, /hideLocateWatchLoader\(\)/);
	assert.match(locateJs, /if\(locateDidFocus\) \{\s*pendingFocusPos = pos;\s*return;/);

	const focusJs = fs.readFileSync(path.join(repoRoot, 'Root/JS/Component/Root/Focus.js'), 'utf8');
	const finish = focusJs.slice(focusJs.indexOf('function finishSmoothZoomToBounds'), focusJs.indexOf('function smoothZoomOut'));
	assert.doesNotMatch(finish, /fitBounds/);
	assert.doesNotMatch(finish, /focus___/);
	assert.match(finish, /applyMapChromePan/);
	assert.match(locateJs, /press_duration > location_button_PRESS_THRESHOLD && addClassIfPresent\(location_dot, 'blinking'\)/);
});
