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
