'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

test('service worker references generated precache manifest', () => {
	const sw = read('Root/sw.js');
	assert.match(sw, /precache-manifest\.json/);
	assert.match(sw, /skipWaiting/);
	assert.match(sw, /clients\.claim/);
});

test('offline bootstrap word list exists and is non-empty JSON array', () => {
	const wordListPath = path.join(repoRoot, 'Root/Files/offline-data/WordList.json');
	const data = JSON.parse(fs.readFileSync(wordListPath, 'utf8'));
	assert.ok(Array.isArray(data));
	assert.ok(data.length > 0);
});

test('sw init registers with updateViaCache none', () => {
	const swInit = read('Root/JS/Component/Root/sw_init.js');
	assert.match(swInit, /updateViaCache:\s*'none'/);
});

test('offline modules load before Database.js via Base directory', () => {
	assert.ok(fs.existsSync(path.join(repoRoot, 'Root/JS/Component/Root/Base/OfflineStore.js')));
	assert.ok(fs.existsSync(path.join(repoRoot, 'Root/JS/Component/Root/Base/OfflineQueue.js')));
});
