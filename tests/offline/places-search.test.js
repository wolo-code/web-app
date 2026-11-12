'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function loadGetSearchBoxPlaceList() {
	const src = read('Root/JS/Base/Script.js');
	const match = src.match(/function getSearchBoxPlaceList\([\s\S]*?\n\}/);
	assert.ok(match, 'getSearchBoxPlaceList should be defined in Script.js');
	return new Function(match[0] + '\nreturn getSearchBoxPlaceList;')();
}

test('getSearchBoxPlaceList treats missing SearchBox results as empty', () => {
	const getSearchBoxPlaceList = loadGetSearchBoxPlaceList();
	assert.deepEqual(getSearchBoxPlaceList(null), []);
	assert.deepEqual(getSearchBoxPlaceList({}), []);
	assert.deepEqual(getSearchBoxPlaceList({ getPlaces: function() { return undefined; } }), []);
	assert.deepEqual(getSearchBoxPlaceList({ getPlaces: function() { return []; } }), []);
});

test('getSearchBoxPlaceList returns the Places result list when present', () => {
	const getSearchBoxPlaceList = loadGetSearchBoxPlaceList();
	const places = [{ name: 'Park' }];
	assert.equal(getSearchBoxPlaceList({ getPlaces: function() { return places; } }), places);
});

test('map SearchBox listeners guard undefined getPlaces results', () => {
	const rootMap = read('Root/JS/Component/Root/Map.js');
	const consoleMap = read('Root/JS/Component/Console/Map.js');
	assert.match(rootMap, /getSearchBoxPlaceList\(searchBox\)/);
	assert.match(rootMap, /if\s*\(\s*!places\s*\|\|\s*!places\.length\s*\)/);
	assert.match(consoleMap, /getSearchBoxPlaceList\(searchBox\)/);
	assert.match(consoleMap, /if\s*\(\s*!places\s*\|\|\s*!places\.length\s*\)/);
});

const point = { lat: 12.85, lng: 77.63 };
const parent = {
	id: 'bengaluru', gp_id: 'parent', name: 'Bengaluru', country: 'India',
	administrative_level_1: 'Karnataka', center: { lat: 12.97, lng: 77.59 }
};
const suburb = { id: 'vittasandra', gp_id: 'suburb', name: 'Vittasandra', center: point };
const farCity = { ...parent, id: 'far', gp_id: 'far', center: { lat: 14, lng: 78 } };
const locality = place_id => ({ types: ['locality'], place_id });
const sublocality = { types: ['sublocality'], place_id: 'suburb' };
const nestedLocality = {
	types: ['street_address'],
	address_components: [
		{ types: ['locality'], long_name: ' BENGALURU ' },
		{ types: ['administrative_area_level_1'], long_name: 'Karnataka' },
		{ types: ['country'], long_name: 'India' }
	]
};

function loadEncoder({ results, nearby = [suburb, parent], catalog = [parent, suburb, farCity], deferCities = false }) {
	const vm = require('node:vm');
	const encoded = [];
	const lookedUp = [];
	const pending = [];
	const timers = new Map();
	let timerId = 0;
	const context = vm.createContext();
	for (const file of ['Code/Core.js', 'Code/Code.js', 'City.js', 'Util.js']) {
		vm.runInContext(read('Root/JS/Component/Root/' + file), context);
	}
	Object.assign(context, {
		setTimeout(callback, delay) { timers.set(++timerId, { callback, delay }); return timerId; },
		clearTimeout(id) { timers.delete(id); },
		clearCode() {},
		getAddress(_position, session, callback) { context.sessionForwarder(session, callback, [results]); },
		getCityFromCityGp_id(id, session, success, failure) {
			lookedUp.push(id);
			const city = catalog.find(candidate => candidate.gp_id === id);
			const complete = () => context.sessionForwarder(session, city ? success : failure, city ? [city] : []);
			if (deferCities) pending.push(complete);
			else complete();
		},
		getCityCenterFromId(city, callback) { callback(city); },
		getCityFromId(id, callback) { callback(nearby.find(city => city.id === id)); },
		geoFireInit() { return true; },
		CITY_RANGE_RADIUS: 32.767,
		geoFire: {
			query() {
				const listeners = {};
				return {
					cancel() {},
					on(event, callback) {
						listeners[event] = callback;
						if (event === 'key_entered') {
							nearby.forEach((city, index) => callback(city.id, [city.center.lat, city.center.lng], index));
							listeners.ready();
						}
					}
				};
			}
		},
		pushLoader() {},
		popLoader() {},
		chooseCity_by_periphery(choices, select) {
			context.choices = Array.from(choices, entry => entry.city);
			context.select = select;
		},
		marker: { getPosition: () => point },
		resolveLatLng: position => position,
		document: { getElementById() {} },
		addClassIfPresent() {},
		removeClassIfPresent() {},
		pendingCity: false,
		encodeRegionFallback() { encoded.push('region'); return true; },
		current_city_gp_id: null
	});
	context.encode_ = city => encoded.push(city.id);
	return { context, encoded, lookedUp, pending, timers };
}

test('encoding tries locality IDs in order and keeps the closer sublocality selectable', () => {
	const { context, encoded, lookedUp } = loadEncoder({
		results: [sublocality, locality('unknown'), locality('far'), locality('parent')]
	});
	context.encode(point);
	assert.deepEqual(lookedUp, ['unknown', 'far', 'parent']);
	assert.deepEqual(encoded, ['bengaluru']);
	context.select(context.choices.find(city => city.id === suburb.id));
	assert.deepEqual(encoded, ['bengaluru', 'vittasandra']);
});

test('encoding matches a nested locality by name and geographic context', () => {
	const wrongState = { ...parent, id: 'other', administrative_level_1: 'Goa' };
	const { context, encoded, lookedUp } = loadEncoder({
		results: [sublocality, nestedLocality], nearby: [suburb, wrongState, parent]
	});
	context.encode(point);
	assert.deepEqual(encoded, ['bengaluru']);
	assert.deepEqual(lookedUp, []);
});

test('ambiguous, missing, or non-covering parent evidence preserves the address-derived fallback', () => {
	const cases = [
		{ results: [sublocality, nestedLocality], nearby: [suburb, parent, { ...parent, id: 'duplicate' }] },
		{ results: [sublocality], nearby: [parent, suburb] },
		{ results: [sublocality, nestedLocality], nearby: [suburb, farCity] }
	];
	for (const options of cases) {
		const { context, encoded } = loadEncoder(options);
		context.encode(point);
		assert.deepEqual(encoded, ['vittasandra']);
	}
});

test('encoding tries the nearest covering city before falling back to a region', () => {
	for (const [nearby, expected] of [[[farCity, suburb], 'vittasandra'], [[farCity], 'region']]) {
		const { context, encoded } = loadEncoder({ results: [], nearby });
		context.encode(point);
		assert.deepEqual(encoded, [expected]);
	}
});

test('an older city lookup cannot overwrite a later click, even in the same clock tick', () => {
	const { context, encoded, pending } = loadEncoder({ results: [locality('parent')], deferCities: true });
	context.encode({ lat: 12.9, lng: 77.6 });
	context.encode(point);
	pending[1]();
	pending[0]();
	assert.deepEqual(encoded, ['bengaluru']);
});

test('a nearby city without a detail record does not block regional encoding', () => {
	const { context, encoded, timers } = loadEncoder({ results: [], nearby: [suburb] });
	context.getCityFromId = (_id, callback, options) => {
		if (options?.notify === false) callback(null);
	};
	context.encode(point);
	assert.deepEqual(encoded, ['region']);
	assert.equal(timers.size, 0);
});

test('a stalled nearby query is cancelled and falls back to a regional code', () => {
	const { context, encoded, timers } = loadEncoder({ results: [] });
	let ready;
	let cancellations = 0;
	let loaders = 0;
	context.geoFire.query = () => ({
		cancel() { cancellations++; },
		on(event, callback) { if (event === 'ready') ready = callback; }
	});
	context.pushLoader = () => { loaders++; };
	context.popLoader = () => { loaders--; };
	context.encode(point);
	[...timers.values()].find(timer => timer.delay === 10000).callback();
	ready();
	assert.equal(cancellations, 1);
	assert.equal(loaders, 0);
	assert.deepEqual(encoded, ['region']);
	assert.equal(timers.size, 0);
});

test('a stalled address lookup falls back and a late reply cannot overwrite the code', () => {
	const { context, encoded, timers } = loadEncoder({ results: [] });
	let reply;
	context.getAddress = (_position, session, callback) => {
		reply = () => context.sessionForwarder(session, callback, [[locality('parent')]]);
	};
	context.encode(point);
	[...timers.values()][0].callback();
	reply();
	assert.deepEqual(encoded, ['region']);
	assert.equal(timers.size, 0);
});
