'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const cityCache = require('../../scripts/offline/city-cache');

test('sanitizeCityDetail keeps name_id/gp_id and drops non-cloneable extras', () => {
	const payload = cityCache.sanitizeCityDetail({
		id: 'city-1',
		name: 'Bengaluru',
		name_id: 'bengaluru',
		gp_id: 'ChIJbU60yXAWrjsR4E9-UejD3_g',
		country: 'India',
		administrative_level_1: 'Karnataka',
		center: { lat: 12.97, lng: 77.59 },
		marker: { setMap: function() {} },
		ref: { once: function() {} }
	});
	assert.equal(payload.name_id, 'bengaluru');
	assert.equal(payload.gp_id, 'ChIJbU60yXAWrjsR4E9-UejD3_g');
	assert.equal(payload.name, 'Bengaluru');
	assert.equal(payload.center, undefined);
	assert.equal(payload.marker, undefined);
	assert.equal(payload.ref, undefined);
});

test('plainCityCenter accepts LatLng-like methods and rejects invalid', () => {
	assert.deepEqual(
		cityCache.plainCityCenter({ lat: function() { return 12.9; }, lng: function() { return 77.6; } }),
		{ lat: 12.9, lng: 77.6 }
	);
	assert.equal(cityCache.plainCityCenter({ lat: NaN, lng: 1 }), null);
	assert.equal(cityCache.plainCityCenter(null), null);
});

test('buildRememberPayload is what locate/encode should persist for offline name decode', () => {
	const remembered = cityCache.buildRememberPayload({
		id: 'abc',
		name: 'Bengaluru',
		name_id: 'bengaluru',
		gp_id: 'gp1',
		country: 'India',
		center: { lat: 12.97, lng: 77.59 }
	});
	assert.equal(remembered.id, 'abc');
	assert.equal(remembered.detail.name_id, 'bengaluru');
	assert.equal(remembered.detail.gp_id, 'gp1');
	assert.deepEqual(remembered.center, { lat: 12.97, lng: 77.59 });
	assert.equal(cityCache.cityMatchesNameId(remembered.detail, 'Bengaluru'), true);
	assert.equal(cityCache.cityMatchesNameId(remembered.detail, 'bengaluru'), true);
	assert.equal(cityCache.cityMatchesNameId(remembered.detail, 'mumbai'), false);
});

test('buildRememberPayload returns null without city id', () => {
	assert.equal(cityCache.buildRememberPayload({ name_id: 'bengaluru' }), null);
});
