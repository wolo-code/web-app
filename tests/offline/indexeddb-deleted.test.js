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

function deletedError() {
	const error = new Error('Database deleted by request of the user');
	error.name = 'UnknownError';
	return error;
}

function loadErrorHandlers() {
	const source = read('Root/JS/Base/Script.js');
	const start = source.indexOf('function normalizeException');
	const sandbox = {
		pendingExceptionLogs: [],
		listeners: {},
		Sentry: {
			captured: [],
			captureException: function(error) {
				this.captured.push(error);
			}
		},
		document: {
			getElementById: function() {
				return null;
			}
		},
		queueMicrotask: queueMicrotask,
		setTimeout: setTimeout
	};
	sandbox.window = {
		addEventListener: function(type, fn) {
			sandbox.listeners[type] = fn;
		}
	};
	vm.createContext(sandbox);
	vm.runInContext(source.slice(start), sandbox);
	return sandbox;
}

function loadFirebaseRecovery() {
	const sandbox = loadErrorHandlers();
	sandbox.reloads = 0;
	sandbox.sessionStorage = {};
	sandbox.window.location = {
		reload: function() {
			sandbox.reloads += 1;
		}
	};
	vm.runInContext(read('Root/JS/Firebase.js'), sandbox);
	return sandbox;
}

function createIndexedDb(mode) {
	const state = {
		opens: 0,
		prevented: 0,
		databases: []
	};

	function later(fn) {
		setTimeout(fn, 0);
	}

	const indexedDB = {
		open: function() {
			state.opens += 1;
			const generation = state.opens;
			const request = {};
			later(function() {
				if (mode === 'open-fails-once' && generation === 1) {
					request.error = deletedError();
					if (request.onerror) {
						request.onerror({
							preventDefault: function() {
								state.prevented += 1;
							}
						});
					}
					return;
				}
				const failTransaction = mode === 'tx-fails-once' && generation === 1;
				const genericFailure = mode === 'tx-generic-fail' && generation === 1;
				const db = {
					closed: false,
					objectStoreNames: {
						contains: function() {
							return false;
						}
					},
					close: function() {
						this.closed = true;
					},
					transaction: function() {
						const tx = {};
						const storeRequest = {};
						later(function() {
							if (failTransaction || genericFailure) {
								const error = genericFailure
									? Object.assign(new Error('missing store'), { name: 'NotFoundError' })
									: deletedError();
								tx.error = error;
								storeRequest.error = error;
								if (tx.onerror) {
									tx.onerror({
										preventDefault: function() {
											state.prevented += 1;
										}
									});
								}
								return;
							}
							storeRequest.result = 'stored';
							if (storeRequest.onsuccess) {
								storeRequest.onsuccess();
							}
							if (tx.oncomplete) {
								tx.oncomplete();
							}
						});
						return {
							objectStore: function() {
								return {
									get: function() {
										return storeRequest;
									}
								};
							},
							set oncomplete(fn) {
								tx.oncomplete = fn;
							},
							set onerror(fn) {
								tx.onerror = fn;
							},
							set onabort(fn) {
								tx.onabort = fn;
							},
							get error() {
								return tx.error;
							}
						};
					}
				};
				state.databases.push(db);
				request.result = db;
				if (request.onsuccess) {
					request.onsuccess({ target: { result: db } });
				}
			});
			return request;
		}
	};

	return { indexedDB: indexedDB, state: state };
}

function loadOfflineStore(mode) {
	const fake = createIndexedDb(mode);
	const sandbox = {
		indexedDB: fake.indexedDB,
		setTimeout: setTimeout
	};
	vm.createContext(sandbox);
	vm.runInContext(read('Root/JS/Base/Script.js').slice(read('Root/JS/Base/Script.js').indexOf('function isIndexedDbUserDeletedError'), read('Root/JS/Base/Script.js').indexOf('function isIgnorableServiceWorkerError')), sandbox);
	vm.runInContext(read('Root/JS/Component/Root/Base/OfflineStore.js'), sandbox);
	sandbox.state = fake.state;
	return sandbox;
}

test('isIndexedDbUserDeletedError matches the browser deletion message only', () => {
	const api = loadErrorHandlers();
	assert.equal(api.isIndexedDbUserDeletedError(deletedError()), true);
	assert.equal(api.isIndexedDbUserDeletedError('UnknownError: Database deleted by request of the user'), true);
	assert.equal(api.isIndexedDbUserDeletedError('Uncaught UnknownError: Database deleted by request of the user'), true);
	assert.equal(api.isIndexedDbUserDeletedError({ name: 'UnknownError', message: 'Internal error' }), false);
	assert.equal(api.isIndexedDbUserDeletedError(new TypeError('Cannot read properties of undefined')), false);
});

test('deleted IndexedDB errors skip the crash dialog and Sentry', () => {
	const api = loadErrorHandlers();
	const error = deletedError();
	api.showErrorPrompt(error);
	api.showErrorPrompt('UnknownError: Database deleted by request of the user');
	assert.equal(api.pendingExceptionLogs.length, 0);
	assert.equal(api.Sentry.captured.length, 0);

	assert.equal(api.window.onerror('Uncaught UnknownError: Database deleted by request of the user', '', 0, 0, error), true);
	assert.equal(api.pendingExceptionLogs.length, 0);

	let prevented = false;
	api.listeners.unhandledrejection({
		reason: error,
		preventDefault: function() {
			prevented = true;
		}
	});
	assert.equal(prevented, true);
	assert.equal(api.Sentry.captured.length, 0);

	api.showErrorPrompt(new TypeError('boom'));
	assert.equal(api.pendingExceptionLogs.length, 1);
	assert.equal(api.Sentry.captured.length, 1);
});

test('auth IndexedDB deletion reloads once and is not reported', () => {
	const api = loadFirebaseRecovery();
	const error = deletedError();
	assert.equal(api.isFirebaseIndexedDbClosingError(error), true);
	api.recoverFirebaseIndexedDbConnection(error);
	assert.equal(api.Sentry.captured.length, 0);
	assert.equal(api.reloads, 1);
	api.recoverFirebaseIndexedDbConnection(error);
	assert.equal(api.reloads, 1);

	const closing = new Error('The database connection is closing');
	closing.name = 'InvalidStateError';
	assert.equal(api.isFirebaseIndexedDbClosingError(closing), true);
	api.recoverFirebaseIndexedDbConnection(closing);
	assert.equal(api.Sentry.captured.length, 0);
	assert.equal(api.isFirebaseIndexedDbClosingError(new TypeError('boom')), false);
});

test('Sentry init ignores the browser database-deleted message', () => {
	const source = read('Root/Framework/JS/Fragment/Sentry_exec.php');
	assert.match(source, /Database deleted by request of the user/);
});

test('offline store drops a deleted database and reads from a new one', async () => {
	const opened = loadOfflineStore('open-fails-once');
	assert.equal(await opened.offlineStoreGet('meta', 'mapViewport'), 'stored');
	assert.equal(opened.state.opens, 2);
	assert.equal(opened.state.prevented, 1);

	const transacted = loadOfflineStore('tx-fails-once');
	assert.equal(await transacted.offlineStoreGet('meta', 'mapViewport'), 'stored');
	assert.equal(transacted.state.opens, 2);
	assert.equal(transacted.state.prevented, 1);
	assert.equal(transacted.state.databases[0].closed, true);
});

test('offline store does not retry an unrelated IndexedDB failure', async () => {
	const api = loadOfflineStore('tx-generic-fail');
	await assert.rejects(api.offlineStoreGet('meta', 'mapViewport'), /missing store/);
	assert.equal(api.state.opens, 1);
	assert.equal(api.state.prevented, 1);
});

test('versionchange closes the cached offline database so a later read can reopen it', async () => {
	const api = loadOfflineStore('healthy');
	assert.equal(await api.offlineStoreGet('meta', 'mapViewport'), 'stored');
	assert.equal(api.state.opens, 1);
	api.state.databases[0].onversionchange();
	assert.equal(api.state.databases[0].closed, true);
	assert.equal(await api.offlineStoreGet('cityDetail', 'city-1'), 'stored');
	assert.equal(api.state.opens, 2);
});
