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

test('encoding prefers a covering city over regional fallback', () => {
	const vm = require('node:vm');
	const position = { lat: 27.7, lng: 85.3 };
	const locality = { id: 'city', center: position };
	const results = [
		{ types: ['sublocality'], place_id: 'suburb' },
		{ types: ['administrative_area_level_2'], place_id: 'district' },
		{ types: ['locality'], place_id: 'locality' },
		{ types: ['country'], place_id: 'country' }
	];
	const nearby = {
		outside: { city: { id: 'outside', center: { lat: 28.0, lng: 85.3 } }, distance: 33 },
		inside: { city: { id: 'nearby', center: { lat: 27.95, lng: 85.55 } }, distance: 37 }
	};
	const details = { outside: { city: {} }, inside: { city: {} } };
	const encoded = [];
	let geocodedCity = locality;
	let nearbyCities = nearby;
	const context = vm.createContext();
	for (const file of ['Code/Core.js', 'Code/Code.js', 'City.js']) {
		vm.runInContext(read('Root/JS/Component/Root/' + file), context);
	}
	Object.assign(context, {
		clearCode() {},
		getAddress(_position, _session, callback) { callback(results); },
		getCityFromCityGp_id(id, _session, success, failure) {
			assert.equal(id, 'locality');
			if (geocodedCity) success(geocodedCity);
			else failure();
		},
		getCityCenterFromId_session(city, _session, callback) { callback(city); },
		getCity_by_perifery_list_fs() { context.syncNearCityList(nearbyCities, details); },
		chooseCity_by_periphery() {},
		document: { getElementById() {} },
		addClassIfPresent() {},
		removeClassIfPresent() {},
		pendingCity: false,
		encodeRegionFallback() { encoded.push('region'); return true; },
		current_city_gp_id: null
	});
	context.encode_ = city => encoded.push(city.id);

	context.encode(position);
	geocodedCity = null;
	context.encode(position);
	nearbyCities = { outside: nearby.outside };
	context.encode(position);

	assert.deepEqual(encoded, ['city', 'nearby', 'region']);
});
