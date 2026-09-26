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

function extractFunction(source, name, stopMarker) {
	const start = source.indexOf('function ' + name);
	assert.ok(start > -1, 'missing ' + name);
	const next = source.indexOf('\nfunction ', start + 1);
	const stop = stopMarker ? source.indexOf(stopMarker, start + 1) : -1;
	let end = source.length;
	if(next !== -1)
		end = Math.min(end, next);
	if(stop !== -1)
		end = Math.min(end, stop);
	return source.slice(start, end);
}

function loadServiceWorkerErrorApi() {
	const sandbox = {
		pendingExceptionLogs: [],
		Sentry: { captureException: function() {} }
	};
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(read('Root/JS/Base/Script.js'), 'isIgnorableServiceWorkerError'), sandbox);
	return sandbox;
}

function loadServiceWorkerUpdateApi() {
	const sandbox = loadServiceWorkerErrorApi();
	const swInit = read('Root/JS/Component/Root/sw_init.js');
	vm.runInContext(extractFunction(swInit, 'isIdleServiceWorkerRegistration'), sandbox);
	vm.runInContext(extractFunction(swInit, 'ignoreServiceWorkerRegistrationError'), sandbox);
	vm.runInContext(extractFunction(swInit, 'requestServiceWorkerUpdate', "if ('serviceWorker'"), sandbox);
	return sandbox;
}

function abortedUpdateError() {
	const error = new Error("Failed to update a ServiceWorker for scope ('https://example.test/') with script ('Unknown'): Operation has been aborted");
	error.name = 'AbortError';
	return error;
}

test('isIgnorableServiceWorkerError matches Chrome SW update AbortError', () => {
	const api = loadServiceWorkerErrorApi();
	assert.equal(api.isIgnorableServiceWorkerError(abortedUpdateError()), true);
	assert.equal(
		api.isIgnorableServiceWorkerError("AbortError: Failed to register a ServiceWorker for scope ('https://example.test/'): Operation has been aborted"),
		true
	);
	assert.equal(
		api.isIgnorableServiceWorkerError({
			name: 'AbortError',
			message: 'The Service Worker system has shutdown.'
		}),
		true
	);
});

test('isIgnorableServiceWorkerError does not swallow unrelated errors', () => {
	const api = loadServiceWorkerErrorApi();
	assert.equal(api.isIgnorableServiceWorkerError(new TypeError("Cannot read properties of undefined (reading 'id')")), false);
	assert.equal(api.isIgnorableServiceWorkerError({ name: 'AbortError', message: 'The user aborted a request.' }), false);
	assert.equal(api.isIgnorableServiceWorkerError('Network Error'), false);
});

test('showErrorPrompt skips ignorable service worker aborts', () => {
	const source = read('Root/JS/Base/Script.js');
	const sandbox = {
		pendingExceptionLogs: [],
		Sentry: {
			captured: [],
			captureException: function(error) {
				this.captured.push(error);
			}
		}
	};
	vm.createContext(sandbox);
	vm.runInContext(extractFunction(source, 'isIgnorableServiceWorkerError'), sandbox);
	vm.runInContext(extractFunction(source, 'normalizeException'), sandbox);
	vm.runInContext(extractFunction(source, 'reportExceptionPrompt'), sandbox);
	vm.runInContext(
		extractFunction(source, 'showErrorPrompt').replace(
			'deferExceptionPrompt(flushExceptionPrompt);',
			''
		),
		sandbox
	);

	sandbox.showErrorPrompt(abortedUpdateError());
	assert.equal(sandbox.pendingExceptionLogs.length, 0);
	assert.equal(sandbox.Sentry.captured.length, 0);

	sandbox.showErrorPrompt(new TypeError('boom'));
	assert.equal(sandbox.pendingExceptionLogs.length, 1);
	assert.equal(sandbox.Sentry.captured.length, 1);
});

test('requestServiceWorkerUpdate does not race an in-progress install', async () => {
	const api = loadServiceWorkerUpdateApi();
	let updateCalls = 0;
	const registration = {
		installing: { state: 'installing' },
		update: function() {
			updateCalls += 1;
			return Promise.reject(abortedUpdateError());
		}
	};

	await api.requestServiceWorkerUpdate(registration);
	assert.equal(updateCalls, 0);
});

test('requestServiceWorkerUpdate swallows AbortError from a later check', async () => {
	const api = loadServiceWorkerUpdateApi();
	const registration = {
		installing: null,
		update: function() {
			return Promise.reject(abortedUpdateError());
		}
	};

	await assert.doesNotReject(() => api.requestServiceWorkerUpdate(registration));
});

test('sw init and Sentry treat aborted updates as non-fatal', () => {
	const swInit = read('Root/JS/Component/Root/sw_init.js');
	const sentry = read('Root/Framework/JS/Fragment/Sentry_exec.php');
	assert.match(swInit, /requestServiceWorkerUpdate/);
	assert.match(swInit, /ignoreServiceWorkerRegistrationError/);
	assert.doesNotMatch(swInit, /return registration\.update\(\);/);
	assert.match(sentry, /Failed to \(\?:update\|register\) a ServiceWorker/);
});
