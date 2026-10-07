'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function worker(response, rejectWrites) {
	const handlers = {};
	const writes = [];
	const cache = {
		match: async () => undefined,
		put: async (...args) => {
			writes.push(args);
			if (rejectWrites) throw new Error('cache unavailable');
		},
		keys: async () => []
	};
	const api = {
		self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => { handlers[name] = fn; } },
		URL, Response,
		fetch: async () => response,
		caches: { open: async () => cache, match: async () => undefined }
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../Root/sw.js'), 'utf8'), api);
	return { api, handlers, writes };
}

test('range requests bypass service worker caching', () => {
	const { handlers } = worker();
	handlers.fetch({
		request: new Request('https://example.test/audio.mp3', { headers: { Range: 'bytes=0-99' } }),
		respondWith: () => assert.fail('range request intercepted')
	});
});

for (const status of [200, 206]) {
	test('cache paths handle HTTP ' + status, async () => {
		const response = new Response('body', { status });
		const { api, writes } = worker(response);
		const request = new Request('https://example.test/asset');
		await api.cacheAsset(await api.caches.open(), '/asset');
		assert.equal(await api.networkFirstStatic(request), response);
		assert.equal(await api.networkFirstShell(request), response);
		assert.equal(await api.cacheFirstTile(request), response);
		await new Promise(resolve => setImmediate(resolve));
		assert.equal(writes.length, status === 200 ? 4 : 0);
	});
}

test('failed background cache writes preserve successful responses', async () => {
	const response = new Response('body');
	const { api } = worker(response, true);
	const request = new Request('https://example.test/asset');
	assert.equal(await api.networkFirstStatic(request), response);
	assert.equal(await api.networkFirstShell(request), response);
	assert.equal(await api.cacheFirstTile(request), response);
	await new Promise(resolve => setImmediate(resolve));
});
