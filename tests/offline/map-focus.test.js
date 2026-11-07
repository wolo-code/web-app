'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root/Focus.js'), 'utf8');

function camera({zoom = 5, min = 0, max = 22, synchronousPan = false} = {}) {
	const events = new Map();
	const inputs = new Map();
	const timers = new Map();
	const changes = [];
	let id = 0;
	let center = {lat: 0, lng: 0};
	const canvas = {clientWidth: 800, clientHeight: 600,
		addEventListener: (name, fn) => inputs.set(name, fn)};
	const map = {
		addListener(name, fn) {
			if(!events.has(name)) events.set(name, new Set());
			const listener = {fn, remove() { events.get(name).delete(listener); }};
			events.get(name).add(listener);
			return listener;
		},
		getZoom: () => zoom,
		setZoom(value) {
			const next = Math.max(min, Math.min(max, value));
			if(next === zoom) return;
			zoom = next;
			changes.push(zoom);
			emit('zoom_changed');
		},
		getCenter: () => ({lat: () => center.lat, lng: () => center.lng}),
		panTo(pos) { center = pos; if(synchronousPan) emit('idle'); },
		getDiv: () => canvas,
		getMapTypeId: () => 'roadmap',
		mapTypes: {get: () => ({minZoom: min, maxZoom: max})},
		getProjection: () => ({fromLatLngToPoint: point => point}),
		fitBounds() { changes.push('fit'); }
	};
	const api = {
		map, pendingFocusPos: null, programmaticMapFocus: false, selfBoundsChangedCount: 1,
		DEFAULT_LOCATE_ZOOM: 18, DEFAULT_INIT_ZOOM: 2,
		getMinZoomToFillMapHeight: () => min,
		getActiveMapTypeMaxZoom: () => max,
		hideNoCityMessage() {}, applyMapChromePan() { changes.push('pan'); },
		document: {body: {clientWidth: 1600, clientHeight: 1200, scrollWidth: 1600, scrollHeight: 1200},
			getElementById: () => canvas},
		google: {maps: {event: {addListener: (target, name, fn) => target.addListener(name, fn),
			removeListener: listener => listener && listener.remove()}}},
		setTimeout(fn) { timers.set(++id, fn); return id; },
		clearTimeout: timer => timers.delete(timer)
	};
	vm.runInNewContext(source, api);
	function emit(name) { for(const listener of [...(events.get(name) || [])]) listener.fn(); }
	function drain() {
		let count = 0;
		while(timers.size) {
			assert.ok(count++ < 100, 'camera animation must terminate');
			const [timer, fn] = timers.entries().next().value;
			timers.delete(timer);
			fn();
		}
	}
	return {api, map, timers, inputs, changes, emit, drain,
		queuedEvent: name => [...(events.get(name) || [])].map(listener => listener.fn)};
}

test('manual zoom interrupts automatic zoom without snapping back to its old target', () => {
	for(const requested of [9, 3, 5.5]) {
		const c = camera();
		c.api.beginProgrammaticMapFocus();
		c.api.smoothZoomToBounds(undefined, c.map, 7, 5);
		c.map.setZoom(requested);
		c.drain();
		assert.equal(c.map.getZoom(), requested);
		assert.equal(c.api.programmaticMapFocus, false);
	}
});

test('cancelling the final delay prevents a late fit or locate pan', () => {
	for(const skipFinalFit of [false, true]) {
		const c = camera();
		c.api.beginProgrammaticMapFocus();
		c.api.pendingFocusPos = skipFinalFit ? {lat: 2, lng: 3} : null;
		c.api.finishSmoothZoomToBounds({}, c.map, skipFinalFit);
		c.api.stopZoom();
		c.drain();
		assert.deepEqual(c.changes, []);
		assert.equal(c.api.programmaticMapFocus, false);
	}
});

test('a camera zoom during the final delay cancels the pending bounds fit', () => {
	const c = camera();
	c.api.beginProgrammaticMapFocus();
	c.api.finishSmoothZoomToBounds({}, c.map, false);
	c.map.setZoom(8);
	c.drain();
	assert.deepEqual(c.changes, [8]);
	assert.equal(c.api.programmaticMapFocus, false);
});

test('a newer focus discards an earlier pan-idle continuation, even if already queued', () => {
	const c = camera();
	c.api.focus_({lat: 1, lng: 2});
	const [oldCallback] = c.queuedEvent('idle');
	c.api.focus_({lat: 3, lng: 4});
	oldCallback();
	c.emit('idle');
	c.drain();
	assert.equal(c.map.getCenter().lat(), 3);
	assert.equal(c.map.getZoom(), 18);
	assert.equal(c.changes.filter(value => value === 6).length, 1);
	assert.equal(c.api.programmaticMapFocus, false);
});

test('focusing the current center and synchronous pan completion both start zoom', () => {
	for(const synchronousPan of [false, true]) {
		const c = camera({synchronousPan});
		c.api.focus_(synchronousPan ? {lat: 1, lng: 2} : {lat: 0, lng: 0});
		c.drain();
		assert.equal(c.map.getZoom(), 18);
		assert.equal(c.api.programmaticMapFocus, false);
	}
});

test('wheel, touch, camera keys, and drag cancel all pending focus phases', () => {
	for(const name of ['wheel', 'pointerdown', 'touchstart', 'click', 'dblclick', 'keydown', 'dragstart']) {
		const c = camera();
		assert.equal(typeof c.api.initMapFocusCancellation, 'function');
		c.api.initMapFocusCancellation();
		c.api.focus_({lat: 1, lng: 2});
		if(name === 'dragstart') c.emit(name);
		else c.inputs.get(name)({key: '+', target: {}});
		c.emit('idle');
		c.drain();
		assert.equal(c.map.getZoom(), 5, name);
		assert.equal(c.api.programmaticMapFocus, false, name);
	}
});

test('trackpad pinch ignores small reversals while allowing deliberate direction changes', () => {
	const c = camera();
	c.api.initMapFocusCancellation();
	c.api.focus_({lat: 1, lng: 2});
	function wheel(deltaY, timeStamp, ctrlKey = true, deltaMode = 0) {
		let prevented = false;
		let stopped = false;
		c.inputs.get('wheel')({
			deltaY, timeStamp, ctrlKey, deltaMode,
			preventDefault() { prevented = true; },
			stopPropagation() { stopped = true; }
		});
		assert.equal(prevented, stopped);
		return stopped;
	}
	assert.equal(wheel(20, 0), false);
	assert.equal(c.api.programmaticMapFocus, false);
	assert.equal(wheel(-2, 15), true);
	assert.equal(wheel(3, 30), false);
	assert.equal(wheel(-7, 45), true);
	assert.equal(wheel(-5, 60), false);
	assert.equal(wheel(-2, 75), false);
	assert.equal(wheel(2, 275), false);
	assert.equal(wheel(-1, 290, false), false);
	assert.equal(wheel(1, 305, true, 1), false);
});

test('provider zoom clamps and viewport minimums terminate without repeated steps', () => {
	const c = camera({zoom: 5, max: 6});
	c.api.getActiveMapTypeMaxZoom = () => 22; // SDK has a tighter limit than metadata.
	c.api.beginProgrammaticMapFocus();
	c.api.smoothZoomToBounds(undefined, c.map, 10, 5);
	c.drain();
	assert.deepEqual(c.changes, [6]);
	assert.equal(c.api.programmaticMapFocus, false);
	const low = camera({zoom: 5, min: 3});
	low.api.beginProgrammaticMapFocus();
	let done = 0;
	low.api.smoothZoomOut(low.map, 5, 0, () => { done++; });
	low.drain();
	assert.equal(low.map.getZoom(), 3);
	assert.equal(done, 1);
});

test('bounds zoom uses full projected extents, actual canvas size, and final-fit padding', () => {
	const c = camera();
	const bounds = {getNorthEast: () => ({x: 100.125, y: 90}),
		getSouthWest: () => ({x: 100, y: 90.125})};
	// At zoom 12 the full bounds occupy 512px plus 72px padding.
	assert.equal(c.api.getZoomByBounds(c.map, bounds), 12);
	const crossing = {getNorthEast: () => ({x: 0.0625, y: 90}),
		getSouthWest: () => ({x: 255.9375, y: 90.125})};
	assert.equal(c.api.getZoomByBounds(c.map, crossing), 12);
	const tiny = camera({min: 3});
	tiny.map.getDiv().clientWidth = 100;
	tiny.map.getDiv().clientHeight = 100;
	const world = {getNorthEast: () => ({x: 256, y: 0}), getSouthWest: () => ({x: 0, y: 256})};
	assert.equal(tiny.api.getZoomByBounds(tiny.map, world), 3);
});

test('retained input additions fit every marker instead of zooming to the newest point', () => {
 const c = camera({zoom: 18});
 const positions = [{lat: 27, lng: 85}, {lat: 28, lng: 84}, {lat: 29, lng: 83}];
 c.api.mapSelectionVersion = 4;
 c.api.mapFitPlacesSelectionVersion = 4;
 c.api.mapPlaces = positions.slice(0, 2).map(position => ({marker: {getPosition: () => position}}));
 c.api.google.maps.LatLngBounds = function() {this.points = []; this.extend = p => {this.points.push(p);};};
 c.api.showMarker = p => c.api.mapPlaces.push({marker: {getPosition: () => p}});
 let fitted;
 c.map.fitBounds = (bounds, padding) => {fitted = {bounds, padding};};
 c.api.focus___(positions[2]);
 assert.deepEqual(fitted.bounds.points, positions);
 assert.equal(fitted.padding, 80);
 assert.equal(c.timers.size, 0);
 assert.equal(c.changes.includes(18), false);
 c.api.mapFitPlacesSelectionVersion = 3;
 assert.equal(c.api.fitInputMapPlaces(), false);
 c.api.mapFitPlacesSelectionVersion = null;
 assert.equal(c.api.fitInputMapPlaces(), false);
 c.api.mapFitPlacesSelectionVersion = 4;
 c.api.mapPlaces = c.api.mapPlaces.slice(0, 1);
 assert.equal(c.api.fitInputMapPlaces(), false);
});
