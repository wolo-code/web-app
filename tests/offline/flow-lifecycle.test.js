'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const read = file => fs.readFileSync(path.join(__dirname, '../../Root', file), 'utf8');

test('background worker activation preserves an open location result', async () => {
	for (const controller of [null, {}]) {
		const handlers = {};
		let reloads = 0;
		const result = { code: 'selected location', layer: 'osm' };
		const worker = { postMessage() {} };
		const registration = { waiting: worker, addEventListener() {}, update: async () => {} };
		const api = {
			navigator: { serviceWorker: { controller, register: async () => registration,
				addEventListener: (name, fn) => { handlers[name] = fn; } } },
			window: { addEventListener: (name, fn) => { handlers[name] = fn; },
				location: { reload: () => { reloads++; } } },
			sessionStorage: { removeItem() {} }, result
		};
		vm.runInNewContext(read('JS/Component/Root/sw_init.js'), api);
		handlers.load();
		await new Promise(resolve => setImmediate(resolve));
		if (handlers.controllerchange) handlers.controllerchange();
		assert.equal(reloads, 0);
		assert.equal(api.result, result);
	}
});

function locateApi() {
	const watches = [];
	const nodes = new Map();
	const node = id => {
		if (!nodes.has(id)) nodes.set(id, { classList: { add() {}, remove() {} }, style: {} });
		return nodes.get(id);
	};
	const api = {
		locating: false, watch_location_timer: 0, watch_location_notice_timer: 0,
		watch_location_id: 0, myLocDot: null, accuCircle: undefined,
		location_button: { addEventListener() {}, removeEventListener() {} },
		document: { getElementById: node, removeEventListener() {} },
		navigator: { geolocation: { clearWatch() {}, watchPosition(success, error) {
			watches.push({ success, error }); return watches.length;
		} } },
		pushLoader() {}, popLoader() {}, hideNotication() {}, hideAddress() {},
		setTimeout() { return 1; }, clearTimeout() {}, clearInterval() {},
		showNotification() {}, setLocationAccess() {},
		LOCATION_PERMISSION_DENIED: 'denied'
	};
	vm.createContext(api);
	vm.runInContext(read('JS/Base/Locate.js'), api);
	return { api, watches };
}

test('queued geolocation results and errors cannot overwrite a completed result or a newer watch', () => {
	const { api, watches } = locateApi();
	api.locateExec();
	api.clearLocating(false);
	// An obsolete callback must return before touching position.coords or UI.
	assert.doesNotThrow(() => watches[0].success(null));
	assert.doesNotThrow(() => watches[0].error(null));
	api.locateExec();
	assert.equal(watches.length, 2);
	assert.doesNotThrow(() => watches[0].success(null));
	assert.doesNotThrow(() => watches[0].error(null));
	assert.equal(api.locating, true);
});

test('timeout and unavailable errors are distinct from permission denial', () => {
	for (const code of [1, 2, 3]) {
		const { api, watches } = locateApi();
		let failures = 0;
		let denied = 0;
		let genericErrors = 0;
		api.setLocationAccess = value => { if (!value) denied++; };
		api.handleLocationError = () => { genericErrors++; };
		api.locateExec(() => { failures++; });
		const error = { code, PERMISSION_DENIED: 1 };
		watches[0].error(error);
		assert.equal(error.code, code);
		assert.equal(denied, code === 1 ? 1 : 0);
		assert.equal(failures, code === 1 ? 1 : 0);
		assert.equal(genericErrors, code === 1 ? 0 : 1);
	}
});

test('a delayed Apple Maps load cannot reveal the layer after switching away', () => {
	let reveals = 0;
	const api = {
		document: { getElementById: () => ({}) }, mapkit: {},
		getCurrentMapLayer: () => 'osm',
		showAppleMapStage: () => { reveals++; }
	};
	vm.createContext(api);
	vm.runInContext(read('JS/Component/Root/MapLayers.js'), api);
	api.getCurrentMapLayer = () => 'osm';
	api.showAppleMapStage = () => { reveals++; };
	api.createAppleMap();
	assert.equal(reveals, 0);
});

test('entering code input hides the Apple stage and cancels its pending follow frame', () => {
	const classes = new Set(['apple']);
	let cancelled = 0;
	const stage = { classList: { add: name => classes.add(name) }, setAttribute() {}, style: {} };
	const api = { document: { getElementById: () => stage,
		body: { classList: { remove: (...names) => names.forEach(name => classes.delete(name)) } } },
		cancelAnimationFrame: () => { cancelled++; } };
	vm.createContext(api);
	vm.runInContext(read('JS/Component/Root/MapLayers.js'), api);
	api.appleMapFollowRaf = 1;
	api.clearMapViewClasses();
	assert.equal(classes.has('apple'), false);
	assert.equal(classes.has('hide'), true);
	assert.equal(cancelled, 1);
});

test('non-Google layers resolve coordinates instead of underlying Google POIs', () => {
	for (const layer of ['roadmap', 'satellite', 'osm', 'apple', 'esri', 'microsoft']) {
		let details = 0;
		let addresses = 0;
		let stops = 0;
		const api = {
			getCurrentMapLayer: () => layer,
			scheduleFocusMapSearchInput() {},
			resolveLatLng: value => value,
			getAddress: () => { addresses++; }
		};
		vm.createContext(api);
		vm.runInContext(read('JS/ClickHandler.js'), api);
		api.ClickEventHandler.prototype.handleClick.call({ getPlaceInformation() { details++; } },
			{ placeId: 'hidden-google-poi', latLng: {}, stop() { stops++; } });
		const googleLayer = layer === 'roadmap' || layer === 'satellite';
		assert.equal(details, googleLayer ? 1 : 0, layer);
		assert.equal(addresses, googleLayer ? 0 : 1, layer);
		assert.equal(stops, 1, layer);
	}
});
