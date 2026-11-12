'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const flush = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
	let resolve, reject;
	const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
	return { promise, resolve, reject };
}
function scanner() {
	const timers = new Map();
	let nextTimer = 0;
	const context = {
		Audio: function() { this.load = () => {}; },
		setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
		clearTimeout: id => timers.delete(id),
		window: {},
		document: { getElementById: () => null, querySelector: () => null }
	};
	vm.createContext(context);
	vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
	context.setCodeScanStatus = message => { context.status = message; };
	context.detectCodeScanContainers = () => [];
	context.codeScanState.active = true;
	context.expire = delay => {
		const timer = [...timers.values()].find(item => item.delay === delay);
		assert.ok(timer, 'expected a pending deadline');
		timer.callback();
	};
	context.timers = timers;
	return context;
}
function worker() {
	return { setParameters: async () => {}, recognize: async () => ({ data: {} }), terminate() { this.terminated = true; } };
}

test('concurrent initialization shares one worker and one parameter setup', async () => {
	const c = scanner(), creation = deferred(), w = worker();
	let starts = 0, setups = 0;
	w.setParameters = async () => { setups++; };
	c.window.Tesseract = { createWorker: () => { starts++; return creation.promise; } };
	const first = c.prepareCodeScanWorker(), second = c.prepareCodeScanWorker();
	assert.equal(first, second);
	await flush();
	creation.resolve(w);
	assert.equal(await first, w);
	assert.equal(starts, 1);
	assert.equal(setups, 1);
	assert.equal(c.timers.size, 0);
});

test('failed script downloads can retry and stalled downloads have a deadline', async () => {
	for(const timeout of [false, true]) {
		const c = scanner(), scripts = [];
		c.document.createElement = () => ({});
		c.document.head = { appendChild: script => scripts.push(script) };
		const failed = assert.rejects(c.loadCodeScanTesseractScript(), /load|timed out/);
		if(timeout) c.expire(c.CODE_SCAN_LOAD_TIMEOUT_MS); else scripts[0].onerror();
		await failed;
		assert.equal(c.codeScanState.tesseractPromise, null);
		const retry = c.loadCodeScanTesseractScript();
		c.window.Tesseract = {};
		scripts[1].onload();
		assert.equal(await retry, c.window.Tesseract);
		assert.equal(c.timers.size, 0);
	}
});

test('closing during worker creation rejects callers and disposes late workers', async () => {
	const c = scanner(), creation = deferred(), old = worker(), fresh = worker();
	c.window.Tesseract = { createWorker: () => creation.promise };
	const cancelled = assert.rejects(c.prepareCodeScanWorker(), { name: 'AbortError' });
	await flush();
	c.terminateCodeScanWorker();
	await cancelled;
	c.window.Tesseract.createWorker = async () => fresh;
	await c.prepareCodeScanWorker();
	creation.resolve(old);
	await flush();
	assert.equal(old.terminated, true);
	assert.equal(c.codeScanState.worker, fresh);
	assert.equal(fresh.terminated, undefined);
});

test('worker initialization timeout and parameter failures release resources for retry', async () => {
	for(const timeout of [false, true]) {
		const c = scanner(), w = worker();
		w.setParameters = () => timeout ? new Promise(() => {}) : Promise.reject(new Error('bad parameters'));
		c.window.Tesseract = { createWorker: async () => w };
		const failed = assert.rejects(c.prepareCodeScanWorker(), /parameters|timed out/);
		await flush();
		if(timeout) c.expire(c.CODE_SCAN_LOAD_TIMEOUT_MS);
		await failed;
		assert.equal(w.terminated, true);
		assert.equal(c.codeScanState.workerPromise, null);
		const replacement = worker();
		c.window.Tesseract.createWorker = async () => replacement;
		assert.equal(await c.prepareCodeScanWorker(), replacement);
	}
});

test('recognition timeout terminates a stuck worker and permits a fresh read', async () => {
	const c = scanner(), w = worker();
	w.recognize = () => new Promise(() => {});
	c.codeScanState.worker = w;
	const failed = assert.rejects(c.recognizeCodeScanCanvas({ width: 20, height: 20 }), /timed out/);
	await flush();
	c.expire(c.CODE_SCAN_OCR_TIMEOUT_MS);
	await failed;
	assert.equal(w.terminated, true);
	c.window.Tesseract = { createWorker: async () => worker() };
	assert.ok((await c.recognizeCodeScanCanvas({ width: 20, height: 20 })).data);
	assert.equal(c.timers.size, 0);
});

test('worker errors settle pending recognition even if the library never rejects it', async () => {
	const c = scanner(), w = worker();
	let options;
	w.recognize = () => new Promise(() => {});
	c.window.Tesseract = { createWorker: async (_lang, _mode, settings) => { options = settings; return w; } };
	await c.prepareCodeScanWorker();
	const failed = assert.rejects(c.recognizeCodeScanCanvas({ width: 20, height: 20 }), /crashed/);
	await flush();
	options.errorHandler('worker crashed');
	await failed;
	assert.equal(w.terminated, true);
	assert.equal(c.codeScanState.worker, null);
});

test('detail segmentation and another recognition never overlap', async () => {
	const c = scanner(), w = worker(), detail = deferred(), calls = [];
	w.setParameters = async params => calls.push(params.tessedit_pageseg_mode);
	w.recognize = async () => { calls.push('recognize'); return { data: {} }; };
	c.codeScanState.worker = w;
	const first = c.withCodeScanDetailSegmentation(async input => {
		assert.equal(input, w); calls.push('details'); await detail.promise;
	});
	const second = c.recognizeCodeScanCanvas({ width: 20, height: 20 });
	await flush();
	assert.deepEqual(calls, ['6', 'details']);
	detail.resolve();
	await Promise.all([first, second]);
	assert.deepEqual(calls, ['6', 'details', '11', 'recognize']);
});

test('termination cancels running and queued recognition without calling the old worker again', async () => {
	const c = scanner(), w = worker();
	let reads = 0;
	w.recognize = () => { reads++; return new Promise(() => {}); };
	c.codeScanState.worker = w;
	const pending = [1, 2].map(() => assert.rejects(c.recognizeCodeScanCanvas({ width: 20, height: 20 }), { name: 'AbortError' }));
	await flush();
	c.terminateCodeScanWorker();
	await Promise.all(pending);
	assert.equal(reads, 1);
	assert.equal(c.timers.size, 0);
});

test('late capture completion cannot change a reopened dialog or its processing flag', async () => {
	for(const fails of [false, true]) {
		const c = scanner(), read = deferred();
		c.getCodeScanCanvas = () => ({ width: 20, height: 20 });
		c.recognizeCodeScanCanvas = () => read.promise;
		c.showCodeScanReview = () => assert.fail('stale review');
		c.processCodeScanCapture();
		c.codeScanState.session++;
		c.codeScanState.processing = true;
		if(fails) read.reject(new Error('old failure')); else read.resolve({ data: {} });
		await flush();
		assert.equal(c.codeScanState.processing, true);
	}
});

test('camera requests from an earlier session stop their tracks without attaching', async () => {
	const c = scanner(), request = deferred();
	let stopped = 0;
	const video = { play: () => assert.fail('stale camera play') };
	c.getCodeScanVideo = () => video;
	c.navigator = { mediaDevices: { getUserMedia: () => request.promise } };
	c.startCodeScanCamera();
	c.codeScanState.session++;
	request.resolve({ getTracks: () => [{ stop: () => stopped++ }] });
	await flush();
	assert.equal(stopped, 1);
	assert.equal(video.srcObject, undefined);
	assert.equal(c.codeScanState.cameraAvailable, false);
});

test('late camera failure cannot clear a new session', async () => {
	const c = scanner(), request = deferred();
	c.getCodeScanVideo = () => ({});
	c.navigator = { mediaDevices: { getUserMedia: () => request.promise } };
	c.handleCodeScanCameraError = () => assert.fail('stale camera failure');
	c.startCodeScanCamera();
	c.codeScanState.session++;
	request.reject(new Error('denied'));
	await flush();
});

test('oversized images and synchronous canvas failures reject instead of hanging', async () => {
	for(const huge of [false, true]) {
		const c = scanner();
		c.FileReader = function() { this.readAsDataURL = () => { this.onload(); }; };
		c.Image = function() {
			this.naturalWidth = huge ? 10000 : 20; this.naturalHeight = huge ? 10000 : 20;
			Object.defineProperty(this, 'src', { set: () => this.onload() });
		};
		const canvas = { width: 1, height: 1, getContext: () => { throw new Error('canvas allocation'); } };
		c.getCodeScanCanvas = () => canvas;
		await assert.rejects(c.recognizeCodeScanPhoto({}), huge ? /dimensions/ : /allocation/);
		if(huge) assert.equal(canvas.width, 1);
		assert.equal(c.timers.size, 0);
	}
});

test('delayed photo decoding after close never touches the preview', async () => {
	const c = scanner();
	let image;
	c.FileReader = function() { this.readAsDataURL = () => this.onload(); };
	c.Image = function() { image = this; };
	c.getCodeScanCanvas = () => assert.fail('stale photo touched canvas');
	const cancelled = assert.rejects(c.recognizeCodeScanPhoto({}), { name: 'AbortError' });
	c.codeScanState.session++;
	image.onload();
	await cancelled;
	assert.equal(c.timers.size, 0);
});

test('pixel-read failures and invalid OCR responses reject and reset the worker', async () => {
	for(const pixels of [false, true]) {
		const c = scanner(), w = worker();
		c.codeScanState.worker = w;
		if(pixels) c.detectCodeScanContainers = () => { throw new Error('pixel read failed'); };
		else w.recognize = async () => null;
		await assert.rejects(c.recognizeCodeScanCanvas({ width: 20, height: 20 }), /pixel|Invalid scanner/);
		assert.equal(w.terminated, true);
		assert.equal(c.codeScanState.worker, null);
	}
});
