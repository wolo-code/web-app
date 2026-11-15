'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..');

function createMemoryIdb() {
	let version = 0;
	let failOpens = 0;
	const stores = new Set();
	const dbs = [];
	return {
		dbs: dbs,
		failNextOpen: function() {
			failOpens += 1;
		},
		open: function(name, requestedVersion) {
			const request = {};
			const db = {
				name: name,
				closing: false,
				objectStoreNames: {
					contains: function(storeName) {
						return stores.has(storeName);
					}
				},
				createObjectStore: function(storeName) {
					stores.add(storeName);
				},
				transaction: function() {
					if (db.closing) {
						const error = new Error("Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing.");
						error.name = 'InvalidStateError';
						throw error;
					}
					const tx = {
						oncomplete: null,
						onerror: null,
						onabort: null,
						objectStore: function() {
							return {
								get: function() {
									const req = { result: 'snapshot', onsuccess: null };
									queueMicrotask(function() {
										if (req.onsuccess)
											req.onsuccess();
										if (tx.oncomplete)
											tx.oncomplete();
									});
									return req;
								}
							};
						}
					};
					return tx;
				},
				close: function() {
					db.closing = true;
					if (typeof db.onclose == 'function')
						db.onclose();
				},
				onclose: null,
				onversionchange: null
			};
			queueMicrotask(function() {
				if (failOpens > 0) {
					failOpens -= 1;
					request.error = new Error('open blocked');
					if (request.onerror)
						request.onerror();
					return;
				}
				if (version < requestedVersion && request.onupgradeneeded) {
					request.onupgradeneeded({ target: { result: db } });
					version = requestedVersion;
				}
				dbs.push(db);
				request.result = db;
				if (request.onsuccess)
					request.onsuccess({ target: request });
			});
			return request;
		}
	};
}

function loadOfflineStore(indexedDB) {
	const sandbox = {
		indexedDB: indexedDB,
		navigator: { onLine: true },
		fetch: function() {
			return Promise.reject(new Error('offline'));
		}
	};
	vm.createContext(sandbox);
	vm.runInContext(
		fs.readFileSync(path.join(repoRoot, 'Root/JS/Component/Root/Base/OfflineStore.js'), 'utf8'),
		sandbox
	);
	return sandbox;
}

test('offline store reopens a closing IndexedDB connection instead of failing the read', async () => {
	const idb = createMemoryIdb();
	const api = loadOfflineStore(idb);
	assert.equal(await api.getWordListSnapshot(), 'snapshot');
	assert.equal(idb.dbs.length, 1);
	idb.dbs[0].closing = true;
	assert.equal(await api.getWordListSnapshot(), 'snapshot');
	assert.equal(idb.dbs.length, 2);
	assert.equal(idb.dbs[1].closing, false);
});

test('offline store drops a closed connection and opens a new one', async () => {
	const idb = createMemoryIdb();
	const api = loadOfflineStore(idb);
	assert.equal(await api.getWordListSnapshot(), 'snapshot');
	idb.dbs[0].close();
	assert.equal(api.offlineDbPromise, null);
	assert.equal(await api.getWordListSnapshot(), 'snapshot');
	assert.equal(idb.dbs.length, 2);
});

test('offline store lets another connection upgrade by closing on versionchange', async () => {
	const idb = createMemoryIdb();
	const api = loadOfflineStore(idb);
	await api.getWordListSnapshot();
	idb.dbs[0].onversionchange();
	assert.equal(idb.dbs[0].closing, true);
	assert.equal(api.offlineDb, null);
	assert.equal(api.offlineDbPromise, null);
});

test('a failed offline database open is not cached forever', async () => {
	const idb = createMemoryIdb();
	idb.failNextOpen();
	const api = loadOfflineStore(idb);
	await assert.rejects(api.getWordListSnapshot(), /open blocked/);
	assert.equal(api.offlineDbPromise, null);
	assert.equal(await api.getWordListSnapshot(), 'snapshot');
	assert.equal(idb.dbs.length, 1);
});
