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

test('Go dims after reference feedback and only a hold can preview the same input', () => {
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
	api.decode_input_from_form = allowPreview => attempts.push(allowPreview);
	api.setDecodeCityIssue('Check that the city matches your Wolo Code.', 'Barsain', city.center);
	assert.equal(classes.has('active'), true);

	api.decode(words);
	assert.equal(status.textContent, referenceRequired);
	assert.equal(classes.has('active'), false);
	assert.equal(attributes.has('aria-disabled'), false);
	assert.equal(button.title, 'Hold Go to preview');
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

test('preview uses the city grid without selecting or storing the reference', () => {
	const { api, remembered } = setup();
	const code = fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root/Code/Code.js'), 'utf8');
	vm.runInContext(code, api);
	api.getWoloAnchorBegin = reference => api.getCityBegin(reference.center);
	const previews = [];
	api.showDecodePreview = (name, position) => previews.push({ name, position });
	const unregistered = { name: 'Barsain', center: { lat: 26.56, lng: 86.65 } };
	api.decode_(unregistered, words, undefined, true);
	assert.equal(previews.length, 1);
	assert.equal(previews[0].name, 'Barsain');
	assert.equal(Math.abs(previews[0].position.lat - unregistered.center.lat) < 1, true);
	assert.equal(Math.abs(previews[0].position.lng - unregistered.center.lng) < 1, true);
	assert.deepEqual(remembered, []);
	assert.equal(api.selected_decode_city, null);
});
