'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const digipin = require(path.resolve(__dirname, '../../Root/JS/Component/Root/Digipin.js'));

test('DIGIPIN encode matches official example coordinates', () => {
	assert.equal(digipin.encode(28.622788, 77.213033), '39J49LL8T4');
});

test('DIGIPIN decode round-trips official example', () => {
	const decoded = digipin.decode('39J49LL8T4');
	assert.ok(Math.abs(decoded.lat - 28.622788) < 0.01);
	assert.ok(Math.abs(decoded.lon - 77.213033) < 0.01);
});

test('DIGIPIN rejects coordinates outside India bounds', () => {
	assert.throws(() => digipin.encode(51.5, -0.12));
});

test('DIGIPIN input detection accepts compact and hyphenated forms', () => {
	assert.equal(digipin.looksLikeDigipin('39J-49L-L8T4'), true);
	assert.equal(digipin.looksLikeDigipin('bengaluru cat apple tomato'), false);
});

test('DIGIPIN normalize strips separators and uppercases', () => {
	assert.equal(digipin.normalizeInput('39j-49l-l8t4'), '39J49LL8T4');
});
