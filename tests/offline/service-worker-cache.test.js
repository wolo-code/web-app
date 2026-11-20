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

test('cache paths return fallback Response when fetch fails and cache is empty', async () => {
	const handlers = {};
	const cache = {
		match: async () => undefined,
		put: async () => {},
		keys: async () => []
	};
	const api = {
		self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => { handlers[name] = fn; } },
		URL, Response,
		fetch: async () => { throw new Error('network down'); },
		caches: { open: async () => cache, match: async () => undefined }
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../Root/sw.js'), 'utf8'), api);
	const request = new Request('https://example.test/asset');

	const staticRes = await api.networkFirstStatic(request);
	assert.ok(staticRes instanceof Response, 'networkFirstStatic must return a Response object');
	assert.equal(staticRes.status, 503);

	const shellRes = await api.networkFirstShell(request);
	assert.ok(shellRes instanceof Response, 'networkFirstShell must return a Response object');
	assert.equal(shellRes.status, 503);

	const tileRes = await api.cacheFirstTile(request);
	assert.ok(tileRes instanceof Response, 'cacheFirstTile must return a Response object');
	assert.equal(tileRes.status, 503);
});

test('HTML app shell for a directory JSON URL is replaced with index.json', async () => {
	const handlers = {};
	const writes = [];
	const cache = {
		match: async () => undefined,
		put: async (...args) => { writes.push(args[0] && args[0].url); },
		keys: async () => []
	};
	const api = {
		self: { location: { origin: 'https://example.test' }, addEventListener: (name, fn) => { handlers[name] = fn; } },
		URL, Response,
		fetch: async (input) => {
			const url = typeof input === 'string' ? input : input.url;
			if (url === 'https://example.test/paper/index.json') {
				return new Response('{"title":"Technical Paper"}', {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			return new Response('<!doctype html><html></html>', {
				status: 200,
				headers: { 'Content-Type': 'text/html; charset=utf-8' }
			});
		},
		caches: { open: async () => cache, match: async () => undefined }
	};
	vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../../Root/sw.js'), 'utf8'), api);

	const response = await api.networkFirstStatic(new Request('https://example.test/paper.json'));
	assert.equal(response.headers.get('content-type'), 'application/json');
	assert.equal(await response.json().then(body => body.title), 'Technical Paper');
	await new Promise(resolve => setImmediate(resolve));
	assert.deepEqual(writes, ['https://example.test/paper.json']);
});

test('network-only requests bypass service worker respondWith', () => {
	const { handlers } = worker();
	let intercepted = false;
	handlers.fetch({
		request: new Request('https://wolo-prod.firebaseio.com/CityCenter.json'),
		respondWith: () => { intercepted = true; }
	});
	assert.equal(intercepted, false);
});
