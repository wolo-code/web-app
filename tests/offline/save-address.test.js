'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function extractFunction(source, name) {
	const start = source.indexOf('function ' + name);
	assert.ok(start > -1, 'missing ' + name);
	const next = source.indexOf('\nfunction ', start + 1);
	return next === -1 ? source.slice(start) : source.slice(start, next);
}

function loadSaveAddressApi() {
	const sandbox = {};
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(read('Root/JS/Component/Root/Account.js'), 'buildSaveAddressPayload'), sandbox);
	return sandbox;
}

function loadPeripheryApi(codeCity) {
	const sandbox = { code_city: codeCity };
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(read('Root/JS/Component/Root/ChooseCity_by_periphery.js'), 'isChooseCityCurrentCodeCity'), sandbox);
	return sandbox;
}

function loadCityHelpers() {
	const sandbox = {};
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(read('Root/JS/Component/Root/City.js'), 'getFullCity'), sandbox);
	return sandbox;
}

test('buildSaveAddressPayload throws the Sentry TypeError without a city', () => {
	assert.throws(
		() => {
			const city = undefined;
			void city.id;
		},
		{
			name: 'TypeError',
			message: /Cannot read properties of undefined \(reading 'id'\)/
		}
	);
});

test('buildSaveAddressPayload refuses save when encode has not set a city', () => {
	const api = loadSaveAddressApi();
	assert.equal(
		api.buildSaveAddressPayload('Home', '', '12 Main St', undefined, ['alpha', 'bravo', 'charlie']),
		null
	);
	assert.equal(
		api.buildSaveAddressPayload('Home', '', '12 Main St', {}, ['alpha', 'bravo', 'charlie']),
		null
	);
	assert.equal(
		api.buildSaveAddressPayload('Home', '', '12 Main St', { id: 'city-1' }, undefined),
		null
	);
	assert.equal(
		api.buildSaveAddressPayload('Home', '', '12 Main St', { id: 'city-1' }, []),
		null
	);
});

test('buildSaveAddressPayload keeps city id and wcode when encode finished', () => {
	const api = loadSaveAddressApi();
	const payload = api.buildSaveAddressPayload('Home', 'Apt 2', '12 Main St', { id: 'city-1' }, ['alpha', 'bravo', 'charlie']);
	assert.equal(payload.city_id, 'city-1');
	assert.equal(payload.title, 'Home');
	assert.equal(payload.segment, 'Apt 2');
	assert.equal(payload.address, '12 Main St');
	assert.equal(payload.code.join(' '), 'alpha bravo charlie');
});

test('isChooseCityCurrentCodeCity does not read id when code_city is unset', () => {
	const api = loadPeripheryApi(undefined);
	assert.equal(api.isChooseCityCurrentCodeCity({ id: 'city-2', gp_id: 'gp-2' }), false);
	assert.equal(api.isChooseCityCurrentCodeCity(undefined), false);
});

test('isChooseCityCurrentCodeCity matches the encoded city when present', () => {
	const api = loadPeripheryApi({ id: 'city-1' });
	assert.equal(api.isChooseCityCurrentCodeCity({ id: 'city-1' }), true);
	assert.equal(api.isChooseCityCurrentCodeCity({ id: 'city-2' }), false);
});

test('getFullCity returns empty string instead of throwing when city is missing', () => {
	const api = loadCityHelpers();
	assert.equal(api.getFullCity(undefined), '');
	assert.equal(api.getFullCity(null), '');
});
