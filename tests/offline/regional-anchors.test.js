'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const read = file => fs.readFileSync(path.join(__dirname, '../../Root/JS', file), 'utf8');

function runtime(extra = {}) {
	const api = { document: { getElementById() { return null; } }, ...extra };
	vm.createContext(api);
	for(const file of ['Component/Root/RegionRegistry.js', 'Component/Root/RegionAnchors.js', 'Component/Root/Code/Code.js'])
		vm.runInContext(read(file), api);
	return api;
}

test('frozen region ranges are ordered, unique, and the 12 fallbacks cover every global tile', () => {
	const api = runtime();
	const registry = api.WOLO_REGION_REGISTRY;
	assert.equal(registry.regions.length, 321);
	assert.equal(registry.pending.length, 160);
	const covered = new Uint8Array(360 * 720);
	const names = new Set();
	let fallbacks = 0;
	for(const region of registry.regions) {
		assert(!names.has(region.name.toLowerCase()));
		names.add(region.name.toLowerCase());
		let end = -1, count = 0;
		for(const [start, length] of region.ranges) {
			assert(start > end && start >= 0 && length > 0 && start + length <= covered.length);
			end = start + length - 1;
			count += length;
			if(region.fallback) covered.fill(1, start, start + length);
		}
		assert.equal(count, region.count);
		if(region.fallback) fallbacks++;
		for(const index of [1, region.count]) {
			const anchor = api.regionAnchor(region, index);
			assert.equal(api.regionAnchorFromId(anchor.id).name, anchor.name);
			assert.equal(api.regionIndexForCell(region, api.regionCellAtIndex(region, index)), index);
		}
	}
	assert.equal(fallbacks, 12);
	assert.equal(covered.indexOf(0), -1);
});

function roundTrip(api, anchor, point) {
	const begin = api.getWoloAnchorBegin(anchor);
	const code = api.encode__(begin, api.regionGridPosition(anchor, point));
	assert(api.isValidWoloIndexCode(code), JSON.stringify({ anchor, point, code }));
	const decoded = api.positionFromRegionGrid(anchor, api.decode__(begin, code));
	assert(decoded, JSON.stringify({ point, code }));
	const northError = Math.abs(decoded.lat - point.lat) * 111700;
	const eastError = Math.abs(api.wrapRegionLongitude(decoded.lng - point.lng)) * 111320 * Math.cos(point.lat * Math.PI / 180);
	assert(northError < 1.02 && eastError < 1.02, JSON.stringify({ point, decoded, northError, eastError }));
	return Array.from(code);
}

test('existing 30-bit codec fits tile corners in all latitude bands, including poles and the dateline', () => {
	const api = runtime();
	// Every row, both hemispheres, dateline tiles, and both sides of tile edges.
	for(let row = 0; row < 360; row++) {
		for(const column of [0, 359, 719]) {
			const point = { lat: row / 2 - 90 + .25, lng: column / 2 - 180 + .25 };
			const choice = api.regionAnchorsForPosition(point)[0];
			assert(choice);
			for(const dy of [-.25, .24999999]) for(const dx of [-.25, .24999999])
				roundTrip(api, choice.anchor, { lat: point.lat + dy, lng: point.lng + dx });
		}
	}
	for(const lat of [-90, 90]) for(const lng of [-180, 0, 180]) {
		const point = { lat, lng };
		const choice = api.regionAnchorsForPosition(point)[0];
		roundTrip(api, choice.anchor, api.regionPosition(point));
	}
});

test('overlapping prefixes retain identical words and resolve without Firebase', () => {
	const api = runtime({ rememberCity() {}, isOfflineMode() { return true; }, database: { ref() { throw new Error('Must not query Firebase'); } } });
	vm.runInContext(read('Component/Root/City.js'), api);
	const point = { lat: 18, lng: -70 };
	const choices = api.regionAnchorsForPosition(point);
	const atlantic = choices.find(c => c.region.key === 'atlantic');
	const caribbean = choices.find(c => c.region.key === 'caribbean');
	assert(atlantic && caribbean);
	assert.deepEqual(roundTrip(api, atlantic.anchor, point), roundTrip(api, caribbean.anchor, point));
	for(const choice of [atlantic, caribbean]) {
		let resolved;
		api.getCityFromName([], choice.anchor.name.toLowerCase(), city => { resolved = city; });
		assert.equal(resolved.id, choice.anchor.id);
		api.getCityFromId(choice.anchor.id, city => { resolved = city; });
		assert.equal(resolved.id, choice.anchor.id);
		api.getCityCenterFromId({ id: choice.anchor.id, center: { lat: 0, lng: 0 } }, city => { resolved = city; });
		assert.equal(resolved.center.lat, choice.anchor.center.lat);
	}
});

test('malformed indices, unknown registry versions, and invalid coordinates fail closed', () => {
	const api = runtime();
	for(const value of ['Atlantic 0', 'Atlantic -1', 'Atlantic 1.5', 'Atlantic 999999999999999999', 'Unknown 1'])
		assert.equal(api.regionAnchorFromName(value), null);
	for(const id of ['region:v2:atlantic:1', 'region:v1:unknown:1', 'region:v1:atlantic:0'])
		assert.equal(api.regionAnchorFromId(id), null);
	for(const point of [{ lat: 91, lng: 0 }, { lat: 0, lng: 181 }, { lat: NaN, lng: 0 }, { lat: null, lng: 0 }])
		assert.equal(api.regionAnchorsForPosition(point).length, 0);
});

test('regional full codes do not inherit country/group disambiguation from a previous city', () => {
	const api = runtime({ multiple_country: true, multiple_group: true, multiple_city: true });
	vm.runInContext(read('Component/Root/Code/Model.js'), api);
	api.code_city = api.regionAnchorFromName('North Atlantic 1');
	api.code_wcode = ['cat', 'apple', 'tomato'];
	assert.equal(api.getCodeComplete().join(' '), 'north atlantic 1 cat apple tomato');
	assert.equal(api.getCodeFull_text(), 'North Atlantic 1 cat apple tomato');
});

test('legacy city origin and encoding remain unchanged', () => {
	const api = runtime();
	const city = { id: 'legacy-city', center: { lat: 12.9716, lng: 77.5946 } };
	assert.deepEqual(Array.from(api.encode__(api.getWoloAnchorBegin(city), { lat: 12.98, lng: 77.60 })), [526, 521, 536]);
});

test('multiword regional shared URLs resolve through the full decode flow without a database', () => {
	let decoded;
	const api = runtime({ window: { location: { pathname: '/', search: '' } }, pushLoader() {}, popLoader() {},
		rememberCity() {}, addClassIfPresent() {}, selected_decode_city_source: null,
		isOfflineMode() { return true; }, database: { ref() { throw new Error('Unexpected database access'); } } });
	for(const file of ['Component/Root/City.js', 'Component/Root/Code/Core.js', 'Component/Root/Code/WordList.js', 'Base/Base.js'])
		vm.runInContext(read(file), api);
	vm.runInContext('wordList = new WordList(' + read('../offline-data/WordList.json') + ');', api);
	api.setDecodeCity = () => {};
	api.setCodeCoord = (city, point, words) => { decoded = { city, point, words }; };
	const anchor = api.regionAnchorFromName('North Atlantic 1');
	const indices = api.encode__(api.getWoloAnchorBegin(anchor), api.regionGridPosition(anchor, anchor.center));
	const words = Array.from(indices, index => api.wordList.getWord(index));
	api.window.location.pathname = '/north_atlantic_1.' + words.join('.');
	assert.equal(api.urlDecode(), true);
	api.decode(api.pendingWords);
	assert.equal(decoded.city.id, anchor.id);
	assert.deepEqual(Array.from(decoded.words), words);
	assert(Math.abs(decoded.point.lat - anchor.center.lat) < .00001);
	// A human-entered prefix is split into more tokens than the URL component.
	decoded = null;
	api.decode(('North Atlantic 1 ' + words.join(' ')).toLowerCase().split(' '));
	assert.equal(decoded.city.id, anchor.id);
});
