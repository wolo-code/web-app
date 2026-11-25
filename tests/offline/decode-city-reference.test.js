'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const words = ['tub', 'plate', 'chain'];
const city = { id: 'katmandu', name: 'Kathmandu', center: { lat: 27.717, lng: 85.324 } };

function setup() {
	const status = {};
	const input = { value: words.join(' ') };
	const hint = { setAttribute() {} };
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
	api.decode(words);
	assert.match(status.textContent, /^Wolo has no city reference for Barsain\./);
	assert.equal(hint.innerText, 'Choose city or region');
	assert.equal(input.value, words.join(' '));
	assert.deepEqual(dialogs, []);
	assert.deepEqual(decoded, []);
	assert.deepEqual(remembered, []);

	api.setDecodeCity(city, 'history', false);
	api.decode(words);
	assert.equal(status.textContent, '');
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
		const { api, status } = setup();
		api.isOfflineMode = () => false;
		api.google = { maps: { Geocoder: function() {
			this.geocode = (_request, callback) => callback([{
				place_id: 'barsain', types: ['locality'],
				address_components: [{ long_name: 'Barsain', types: ['locality'] }]
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
		api.requestDecodeCityGeolocation();
		await Promise.resolve();
		return status.textContent;
	};
	assert.match(await resolve(false), /^Wolo has no city reference for Barsain\./);
	assert.match(await resolve(true), /^Couldn.t verify the detected city\./);
});
