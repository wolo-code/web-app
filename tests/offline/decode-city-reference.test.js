'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const words = ['tub', 'plate', 'chain'];
const city = { id: 'katmandu', name: 'Kathmandu', center: { lat: 27.717, lng: 85.324 } };
const referenceRequired = 'Check that the city matches your Wolo Code.\nChoose a city or region, or enter the full Wolo Code';

function setup() {
	const status = {};
	const input = { value: words.join(' ') };
	const hint = { setAttribute(name, value) { this[name] = value; } };
	const dialogs = [];
	const decoded = [];
	const remembered = [];
	let loaderDepth = 0;
	const api = vm.createContext({
		document: {
			body: { classList: { contains: name => name === 'decode' } },
			getElementById: id => ({
				decode_city_status: status, decode_input_city: hint, decode_input: input
			})[id] || null
		},
		wordList: words,
		selected_decode_city: null,
		selected_decode_city_source: null,
		geoIp_city_name: 'Barsain',
		initLocate: (_override, callback) => callback(),
		getCoarseLocation: success => success({ coords: { latitude: 26.55, longitude: 86.6 } }),
		getWoloAnchorBegin: reference => reference && reference.center,
		pushLoader: () => { loaderDepth++; },
		popLoader: () => { loaderDepth--; },
		decode_: (...args) => decoded.push(args),
		rememberCity: reference => remembered.push(reference),
		showInvalidCodeDialog: (...args) => dialogs.push(args)
	});
	for(const name of ['City.js', 'Code/Core.js']) {
		const source = fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root', name), 'utf8');
		vm.runInContext(source, api);
	}
	return { api, status, input, hint, dialogs, decoded, remembered, loaderDepth: () => loaderDepth };
}

test('an unavailable GPS city keeps the words and allows recovery with a verified reference', () => {
	const { api, status, input, hint, dialogs, decoded, remembered, loaderDepth } = setup();
	api.getCityFromPositionViaGMap = (_position, _success, failure) => failure('Barsain', true);

	api.requestDecodeCityGeolocation();
	assert.equal(status.textContent, '');
	assert.equal(hint.innerText, 'Barsain');
	assert.equal(hint['data-unavailable'], 'true');
	api.decode(words);
	assert.equal(status.textContent, referenceRequired);
	assert.equal(input.value, words.join(' '));
	assert.deepEqual(dialogs, []);
	assert.deepEqual(decoded, []);
	assert.deepEqual(remembered, []);

	api.setDecodeCity(city, 'history', false);
	api.decode(words);
	assert.equal(status.textContent, '');
	assert.equal(hint['data-unavailable'], 'false');
	assert.deepEqual(decoded, [[city, words, undefined]]);
	assert.deepEqual(remembered, [city]);
	assert.equal(loaderDepth(), 0);
});

test('an IP lookup failure preserves valid words and a stale result cannot replace a chosen city', () => {
	const { api, status, dialogs, decoded } = setup();
	let resolveIp;
	api.getDecodeIpCity = (_name, resolve) => { resolveIp = resolve; };
	api.selectIpDecodeCity();
	resolveIp(null, false);
	api.decode(words);
	assert.match(status.textContent, /^Couldn.t verify the detected city\./);
	assert.deepEqual(dialogs, []);

	api.selectIpDecodeCity();
	api.setDecodeCity(city, 'history', false);
	resolveIp(null, true);
	assert.equal(status.textContent, '');
	api.decode(words);
	assert.deepEqual(decoded, [[city, words, undefined]]);
});

function setupIpCityLookup() {
	const state = setup();
	const { api } = state;
	const requests = [];
	api.geoIp_country_code = 'NP';
	api.getDecodeIpCity = (_name, resolve) => resolve(null, true);
	api.google = { maps: { Geocoder: function() {
		this.geocode = (request, resolve) => requests.push({ request, resolve });
	} } };
	api.regionPosition = position => ({ lat: position.lat(), lng: position.lng() });
	api.selectIpDecodeCity();
	const result = {
		types: ['locality', 'political'],
		address_components: [{ long_name: 'Barsain', types: ['locality', 'political'] }],
		geometry: { location: { lat: () => 26.56, lng: () => 86.65 } }
	};
	return { ...state, requests, result };
}

function loadMapDecode(api) {
	const sourceRoot = path.join(__dirname, '../../Root/JS');
	for(const name of ['Map.js', 'Focus.js', 'Share.js', 'Code/Precision.js', 'Code/Code.js', 'Code/WordList.js',
		'Code/Model.js', 'RegionRegistry.js', 'CountryRegistry.js', 'RegionAnchors.js'])
		vm.runInContext(fs.readFileSync(path.join(sourceRoot, 'Component/Root', name), 'utf8'), api);
	for(const file of ['Base/Base.js', 'Base/LongPress.js'])
		vm.runInContext(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), api);
	const list = JSON.parse(fs.readFileSync(path.join(sourceRoot, '../offline-data/WordList.json'), 'utf8'));
	api.wordList = new api.WordList(list);
	api.URLSearchParams = URLSearchParams;
	api.map = { getZoom() {} };
	api.document.activeElement = { blur() {} };
	api.skipIconGuideAutoShow = () => false;
	api.cleanUp = () => { api.mapSelectionVersion++; };
	api.addClassIfPresent = api.removeClassIfPresent = () => {};
	api.initWCode_jumpToMap = api.initWCode_jump_ask = api.keepAddressPanelOpen = false;
	api.setInfoWindowText = (cityName, _nameId, code) => { api.label = { cityName, code }; };
	api.focus___ = point => { api.pin = point; };
	api.ensureMapViewForLocation = () => { api.openedMap = true; };
	api.getAddress = point => { api.addressLookup = point; };
}

test('holding Go after an IP city warning opens the normal map result with a reusable regional code', () => {
	const { api, input, status, remembered, requests, result, loaderDepth } = setupIpCityLookup();
	loadMapDecode(api);
	const codeWords = ['judge', 'task', 'tsunami'];
	input.value = codeWords.join(' ');
	let hold;
	api.setTimeout = callback => { hold = callback; return 1; };
	api.clearTimeout = () => {};
	const events = {};
	const go = { addEventListener: (type, listener) => { events[type] = listener; } };
	api.addLongpressListener(go, api.decode_input_from_form_external, api.decode_input_from_form_hold);

	events.click.call(go, { detail: 1 });
	assert.equal(status.textContent, referenceRequired);
	events.click.call(go, { detail: 1 });
	assert.equal(requests.length, 0);

	events.pointerdown.call(go, { button: 0, pointerType: 'touch', isPrimary: true });
	hold();
	events.pointerup.call(go, {});
	events.click.call(go, { detail: 1 });
	assert.equal(requests.length, 1);
	assert.equal(requests[0].request.address, 'Barsain');
	assert.equal(requests[0].request.componentRestrictions.country, 'NP');
	requests[0].resolve([result], 'OK');
	const detectedBegin = api.getCityBegin({ lat: 26.56, lng: 86.65 });
	const expected = api.decode__(detectedBegin, codeWords.map(word => api.wordList.indexOf(word)));
	assert.equal(api.openedMap, true);
	assert.equal(api.addressLookup, api.pin);
	assert.ok(Math.abs(api.pin.lat - expected.lat) < 1e-10 && Math.abs(api.pin.lng - expected.lng) < 1e-10);
	assert.match(api.code_city.id, /^region:v1:/);
	assert.deepEqual(api.label, { cityName: api.code_city.name, code: api.code_wcode.join(' ') });
	assert.equal(status.textContent, '');
	assert.deepEqual(remembered, []);
	assert.equal(api.selected_decode_city, null);
	assert.equal(api.detectedDecodeCity.name, 'Barsain');

	const link = api.parseWoloLinkPath(api.getWoloMapLinkPath());
	api.decode(link.words, null, null, true);
	assert.ok(Math.abs(api.pin.lat - expected.lat) < 0.00001 && Math.abs(api.pin.lng - expected.lng) < 0.000012);
	assert.equal(loaderDepth(), 0);
});

test('an ambiguous or outdated IP city lookup cannot open a decoded location', () => {
	const { api, input, status, decoded, requests, result, loaderDepth } = setupIpCityLookup();
	api.decode(words, null, null, false, undefined, true);
	requests[0].resolve([result, result], 'OK');
	assert.match(status.textContent, /^Couldn’t resolve the detected city\./);

	api.decode(words, null, null, false, undefined, true);
	input.value = 'kathmandu ' + words.join(' ');
	api.setDecodeCityStatus('');
	requests[1].resolve([result], 'OK');
	assert.equal(status.textContent, '');
	assert.deepEqual(decoded, []);
	assert.equal(loaderDepth(), 0);
});

test('full codes bypass detected-city issues and invalid words still get the code dialog', () => {
	const { api, dialogs, decoded, loaderDepth } = setup();
	api.getCityFromPositionViaGMap = (_position, _success, failure) => failure('Barsain', true);
	api.getCityFromName = (_group, _name, success) => success(city);
	api.getCityCenterFromId = (reference, done) => done(reference);
	api.requestDecodeCityGeolocation();

	api.decode(['kathmandu', ...words]);
	api.decode(['tub', 'plate', 'invalid']);
	assert.deepEqual(decoded, [[city, ['tub', 'plate', 'chain'], undefined]]);
	assert.deepEqual(dialogs, [['tub plate invalid']]);
	assert.equal(loaderDepth(), 0);
});

test('submitting three words during IP verification decodes after the reference is verified', () => {
	const { api, decoded, loaderDepth } = setup();
	let resolveIp;
	api.getDecodeIpCity = (_name, resolve) => { resolveIp = resolve; };

	api.selectIpDecodeCity();
	api.decode(words);
	assert.deepEqual(decoded, []);
	resolveIp(city);
	assert.deepEqual(decoded, [[city, words, undefined]]);
	assert.equal(loaderDepth(), 0);
});

test('geolocation distinguishes a missing registry entry from a directory failure', async () => {
	const resolve = async (queryFails) => {
		const { api, status, decoded } = setup();
		api.isOfflineMode = () => false;
		api.google = { maps: { Geocoder: function() {
			this.geocode = (_request, callback) => callback([{
				place_id: 'barsain', types: ['locality'],
				address_components: [{ long_name: 'Barsain', types: ['locality'] }],
				geometry: { location: { lat: () => 26.56, lng: () => 86.65 } }
			}], 'OK');
		} } };
		api.database = { ref() { return {
			orderByChild() { return this; },
			equalTo() { return this; },
			once(_event, success) {
				if(queryFails)
					return Promise.reject(new Error('Unavailable'));
				success({ exists: () => false });
				return Promise.resolve();
			}
		}; } };
		const locate = fs.readFileSync(path.join(__dirname, '../../Root/JS/Base/Locate.js'), 'utf8');
		const getLocation = api.getCoarseLocation;
		vm.runInContext(locate, api);
		api.initLocate = (_override, callback) => callback();
		api.getCoarseLocation = getLocation;
		api.regionPosition = center => ({ lat: center.lat(), lng: center.lng() });
		api.requestDecodeCityGeolocation();
		await Promise.resolve();
		assert.equal(status.textContent, '');
		api.decode(words);
		const message = status.textContent;
		api.decode(words, null, null, false, undefined, true);
		return { message, decoded };
	};
	const missing = await resolve(false);
	assert.equal(missing.message, referenceRequired);
	assert.deepEqual(JSON.parse(JSON.stringify(missing.decoded)), [[
		{ name: 'Barsain', center: { lat: 26.56, lng: 86.65 } }, words, null, true
	]]);
	const failure = await resolve(true);
	assert.match(failure.message, /^Couldn.t verify the detected city\./);
	assert.deepEqual(failure.decoded, []);
});

test('Go dims after reference feedback and only a hold can decode the same input using the detected city', () => {
	const { api, input, status } = setup();
	const sourceRoot = path.join(__dirname, '../../Root/JS/Component/Root');
	for(const file of ['Util.js', 'Map.js'])
		vm.runInContext(fs.readFileSync(path.join(sourceRoot, file), 'utf8'), api);
	const classes = new Set();
	const attributes = new Map();
	const button = {
		classList: { toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); } },
		toggleAttribute(name, enabled) { enabled ? attributes.set(name, '') : attributes.delete(name); },
		setAttribute(name, value) { attributes.set(name, value); },
		removeAttribute(name) { attributes.delete(name); }
	};
	const getElementById = api.document.getElementById;
	api.document.getElementById = id => id === 'decode_input_button' ? button : getElementById(id);
	api.map = {};
	api.skipIconGuideAutoShow = () => false;
	const attempts = [];
	api.decode_input_from_form = allowDetectedCity => attempts.push(allowDetectedCity);
	api.setDecodeCityIssue('Check that the city matches your Wolo Code.', 'Barsain', {center: city.center});
	assert.equal(classes.has('active'), true);

	api.decode(words);
	assert.equal(status.textContent, referenceRequired);
	assert.equal(classes.has('active'), false);
	assert.equal(attributes.has('aria-disabled'), false);
	assert.equal(button.title, 'Hold Go to decode with the detected city');
	api.decode_input_from_form_external();
	assert.deepEqual(attempts, []);
	api.decode_input_from_form_hold();
	assert.deepEqual(attempts, [true]);

	api.setDecodeCityIssue('Couldn’t verify the detected city.');
	api.decode(words);
	assert.equal(attributes.get('aria-disabled'), 'true');
	api.decode_input_from_form_hold();
	assert.deepEqual(attempts, [true]);

	input.value = 'kathmandu ' + words.join(' ');
	api.setDecodeCityStatus('');
	assert.equal(classes.has('active'), true);
	assert.equal(attributes.has('aria-disabled'), false);
	api.decode_input_from_form_external();
	assert.deepEqual(attempts, [true, undefined]);
});

test('decode with a detected city preserves precision when sharing the regional code', () => {
	const { api } = setup();
	loadMapDecode(api);
	const unregistered = { name: 'Barsain', center: { lat: 26.56, lng: 86.65 } };
	const decimals = ['26.5601234', '86.6502345'];
	const position = api.parseWoloDecimalPosition(decimals.join(','));
	const begin = api.getCityBegin(unregistered.center);
	const indices = api.encode__(begin, position);
	const baseWords = indices.map(index => api.wordList.getWord(index));
	const precision = api.encodePrecisionWolo(unregistered, begin, indices, decimals);
	api.decode_(unregistered, baseWords, precision, true);

	const url = new URL(api.getWoloMapLinkPath(), 'https://example.test');
	const link = api.parseWoloLinkPath(url.pathname);
	const sharedPrecision = api.getWoloLinkPrecision(url.search);
	assert.ok(sharedPrecision.length);
	api.decode(link.words, null, null, true, sharedPrecision);
	assert.deepEqual(Array.from(api.pin.precisionDecimals), decimals);
});
