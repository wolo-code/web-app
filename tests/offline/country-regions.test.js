'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const read = file => fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root', file), 'utf8');

function runtime() {
	const api = {};
	vm.createContext(api);
	for(const file of ['RegionRegistry.js', 'CountryRegistry.js', 'RegionAnchors.js', 'Code/Code.js']) vm.runInContext(read(file), api);
	return api;
}

test('country namespaces have valid frozen indices and globally unique names and aliases', () => {
	const api = runtime();
	assert.equal(api.WOLO_COUNTRY_REGISTRY.regions.length, 257);
	assert.equal(api.allWoloRegions().length, 578);
	const names = new Set(), keys = new Set();
	for(const region of api.allWoloRegions()) {
		assert(!keys.has(region.key)); keys.add(region.key);
		for(const name of [region.name, ...region.aliases]) {
			const normalized = api.normalizeRegionName(name);
			assert(!names.has(normalized), name); names.add(normalized);
			assert.equal(api.regionByName(name).key, region.key);
		}
		if(!region.country_code) continue;
		let end = -1, count = 0;
		for(const [start, length] of region.ranges) {
			assert(start > end && start >= 0 && length > 0 && start + length <= 259200);
			count += length; end = start + length - 1;
		}
		assert.equal(count, region.count);
		for(const index of [1, region.count]) {
			const anchor = api.regionAnchor(region, index);
			assert.equal(api.regionAnchorFromId(anchor.id).name, anchor.name);
			assert.equal(api.regionAnchorFromName(anchor.name_id).id, anchor.id);
		}
	}
});

test('country and physical-region aliases select the same grid without renumbering existing regions', () => {
	const api = runtime();
	const point = { lat: 28.21, lng: 83.99 };
	const choices = api.regionAnchorsForPosition(point);
	const country = choices.find(choice => choice.region.key === 'country-npl');
	const mountains = choices.find(choice => choice.region.key === 'himalaya');
	assert(country && mountains);
	assert.equal(country.region.name, 'Nepal');
	function encoded(anchor) { return Array.from(api.encode__(api.getWoloAnchorBegin(anchor), api.regionGridPosition(anchor, point))); }
	assert.deepEqual(encoded(country.anchor), encoded(mountains.anchor));
	assert.equal(api.regionAnchorFromName('NPL ' + country.anchor.name.split(' ').at(-1)).id, country.anchor.id);
	const atlantic = api.regionAnchorsForPosition({ lat: 18, lng: -70 }).find(choice => choice.region.key === 'atlantic');
	assert.equal(atlantic.anchor.id, 'region:v1:atlantic:20816');
	assert.equal(api.regionByName('Australia').key, 'australia');
	assert.equal(api.regionByName('Australia Region').key, 'country-aus');
});
