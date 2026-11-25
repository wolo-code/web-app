'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const root = path.join(__dirname, '../../Root');
const input = '28.2101130, 83.9901909';
const short = 'Nepal 45 judge task tsunami';
const full = short + '.angle axle dinosaur';

function runtime() {
	const api = vm.createContext({
		URLSearchParams, window: {location: {pathname: '/', search: ''}},
		document: {getElementById() { return {}; }},
		pushLoader() {}, popLoader() {}, rememberCity() {},
		addClassIfPresent() {}, removeClassIfPresent() {}, getProperCityAccent(city) { return city.name; },
		selected_decode_city_source: null, mapSelectionVersion: 1, marker: null,
		isOfflineMode() { return true; },
		setInfoWindowText(_accent, _name, text) { api.card = text; }
	});
	for(const file of ['RegionRegistry.js', 'CountryRegistry.js', 'RegionAnchors.js', 'City.js',
		'Code/WordList.js', 'Code/Code.js', 'Code/Precision.js', 'Code/Core.js',
		'Code/Model.js', 'Map.js', 'Share.js', 'Database.js'])
		vm.runInContext(fs.readFileSync(path.join(root, 'JS/Component/Root', file), 'utf8'), api);
	vm.runInContext(fs.readFileSync(path.join(root, 'JS/Base/Base.js'), 'utf8'), api);
	const wordList = JSON.parse(fs.readFileSync(path.join(root, 'offline-data/WordList.json'), 'utf8'));
	api.wordList = new api.WordList(wordList);
	api.setDecodeCity = () => {};
	api.showInvalidCodeDialog = text => { api.invalid = text; };
	api.getMapPlace = () => null;
	api.syncRegionChoices = () => {};
	api.steerToDecodedCoordinate = point => api.encodeRegionFallback(point);
	api.setCodeCoord = (city, point, words) => api.setCode(city, words, point);
	return api;
}

test('decimal entry, text decode and shared link recover the paper example', () => {
	const api = runtime();
	api.selected_decode_city = api.regionAnchorFromName('Nepal 45');
	api.execDecode(input);
	assert.equal(api.getCodeFull_text(), full);
	assert.equal(api.getWcodeFull_formatted().join(' '), '\\ ' + full + ' /');
	assert.equal(api.card, 'judge task tsunami.angle axle dinosaur');
	assert.equal(api.getWoloMapLinkPath(), '/nepal-45.judge.task.tsunami?precision=angle.axle.dinosaur');
	assert.deepEqual(Array.from(api.code_postition.precisionDecimals), input.split(', '));

	api.execDecode(full);
	assert.equal(api.getCodeFull_text(), full);
	assert.deepEqual(Array.from(api.code_postition.precisionDecimals), input.split(', '));

	const href = new URL(api.getWoloMapLinkPath(), 'https://example.test');
	api.window.location = {pathname: href.pathname, search: href.search};
	api.canRunInitDataNow = () => true;
	api.pendingPosition = null;
	assert.equal(api.urlDecode(), true);
	api.initData();
	assert.deepEqual(Array.from(api.code_postition.precisionDecimals), input.split(', '));

	api.execDecode(short);
	assert.equal(api.getCodeFull_text(), short);
	assert.equal(api.getWoloMapLinkPath(), '/nepal-45.judge.task.tsunami');
});

test('precision does not pass through Number, and invalid payloads do not decode to grid points', () => {
	const api = runtime();
	const exact = ['28.210113' + '0'.repeat(510) + '12', '83.9901909'];
	const point = api.parseWoloDecimalPosition(exact.join(','));
	const city = api.regionAnchorFromName('Nepal 45');
	const begin = api.getWoloAnchorBegin(city);
	const indices = api.encode__(begin, api.regionGridPosition(city, point));
	const words = api.encodePrecisionWolo(city, begin, indices, exact);
	const decoded = api.decodePrecisionWolo(city, begin, indices, words);
	assert.equal(decoded.precisionDecimals[0], exact[0]);
	assert.equal(decoded.precisionDecimals[1].replace(/0+$/, ''), exact[1]);
	assert.equal(api.decodePrecisionWolo(city, begin, indices, words.slice(0, -1)), null);
	assert.equal(api.decodePrecisionWolo(city, begin, indices, ['unknownword']), null);
	assert.equal(api.parseWoloDecimalPosition('90.00000000000000001, 0'), null);
	api.execDecode(full + ' act');
	assert.equal(api.invalid, full + ' act');
});
