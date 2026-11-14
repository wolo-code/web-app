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
function scanner({ useRecognition = false } = {}) {
	const timers = new Map();
	let nextTimer = 0;
	const context = {
		setTimeout: (callback, delay) => { timers.set(++nextTimer, { callback, delay }); return nextTimer; },
		clearTimeout: id => timers.delete(id),
		window: {},
		document: { getElementById: () => null, querySelector: () => null }
	};
	vm.createContext(context);
	vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
	context.setCodeScanStatus = message => { context.status = message; };
	context.detectCodeScanContainers = () => [];
	context.getCodeScanLabelRoll = () => 0;
	if(!useRecognition)
		context.recognizeCodeScanImage = (canvas, _focus, _options, worker) => worker.recognize(canvas);
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

test('concurrent initialization shares the LSTM worker without another setup round trip', async () => {
	const c = scanner(), creation = deferred(), w = worker();
	let starts = 0;
	w.setParameters = () => assert.fail('segmentation belongs to an individual read');
	c.window.Tesseract = { createWorker: (lang, mode, options) => {
		starts++;
		assert.equal(lang, 'eng');
		assert.equal(mode, 1);
		assert.equal(options.cachePath, 'wolo-lstm');
		return creation.promise;
	} };
	const first = c.prepareCodeScanWorker(), second = c.prepareCodeScanWorker();
	assert.equal(first, second);
	await flush();
	creation.resolve(w);
	assert.equal(await first, w);
	assert.equal(starts, 1);
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

test('closing during OCR image encoding prevents posting to the terminated worker', async () => {
	const c = scanner();
	const encoding = deferred();
	const w = worker();
	let reads = 0;
	w.recognize = async () => { reads++; return { data: {} }; };
	c.codeScanState.worker = w;
	c.document.createElement = () => ({
		getContext: () => ({ fillRect() {}, drawImage() {} }),
		toBlob: resolve => { encoding.promise.then(resolve); }
	});
	const reading = c.ocrCodeScanBand({ width: 100, height: 50 }, { x0: 0, y0: 0, x1: 100, y1: 50 }, w);
	c.terminateCodeScanWorker();
	encoding.resolve({ arrayBuffer: async () => new ArrayBuffer(1) });
	await assert.rejects(reading, { name: 'AbortError' });
	assert.equal(reads, 0);
	assert.equal(w.terminated, true);
});

test('worker initialization timeouts and failures allow retry and dispose late workers', async () => {
	for(const timeout of [false, true]) {
		const c = scanner(), w = worker();
		const creation = deferred();
		c.window.Tesseract = { createWorker: () => creation.promise };
		const failed = assert.rejects(c.prepareCodeScanWorker(), /initialization|timed out/);
		await flush();
		if(timeout) c.expire(c.CODE_SCAN_LOAD_TIMEOUT_MS);
		else creation.reject(new Error('initialization failed'));
		await failed;
		if(timeout) {
			creation.resolve(w);
			await flush();
			assert.equal(w.terminated, true);
		}
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

test('an optional detail read and another recognition never overlap', async () => {
	const c = scanner(), w = worker(), detail = deferred(), calls = [];
	w.recognize = async () => { calls.push('recognize'); return { data: {} }; };
	c.codeScanState.worker = w;
	const first = c.runCodeScanWorkerTask(async input => {
		assert.equal(input, w); calls.push('details'); await detail.promise;
	});
	const second = c.recognizeCodeScanCanvas({ width: 20, height: 20 });
	await flush();
	assert.deepEqual(calls, ['details']);
	detail.resolve();
	await Promise.all([first, second]);
	assert.deepEqual(calls, ['details', 'recognize']);
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

test('live OCR loads during the camera request and starts when both are ready', async () => {
	for(const cameraFirst of [true, false]) {
		const c = scanner(), camera = deferred(), creation = deferred(), w = worker();
		let starts = 0, frames = 0;
		c.window.Tesseract = { createWorker: () => { starts++; return creation.promise; } };
		c.navigator = { mediaDevices: { getUserMedia: () => camera.promise } };
		const dimensions = new Map();
		const video = {
			classList: new Set(), play: async () => {},
			videoWidth: 1080, videoHeight: 1920,
			style: { setProperty: (name, value) => dimensions.set(name, value) }
		};
		c.getCodeScanVideo = () => video;
		c.runCodeScanFrame = () => frames++;
		c.startCodeScanCamera();
		await flush();
		assert.equal(starts, 1);
		assert.equal(frames, 0);
		assert.equal(video.classList.has('code_scan_video_ready'), false);
		if(cameraFirst) camera.resolve({}); else creation.resolve(w);
		await flush();
		assert.equal(frames, 0);
		if(cameraFirst) creation.resolve(w); else camera.resolve({});
		await flush();
		assert.equal(starts, 1);
		assert.equal(frames, 1);
		assert.equal(video.classList.has('code_scan_video_ready'), true);
		assert.equal(dimensions.get('--code-scan-video-ratio'), '0.5625');
	}
});

test('opening the scanner reuses an in-progress idle preload without showing a loading status', async () => {
	const c = scanner(), creation = deferred(), w = worker();
	let starts = 0;
	const messages = [];
	c.setCodeScanStatus = message => messages.push(message);
	c.codeScanState.active = false;
	c.wordList = {};
	c.document.body = { classList: { contains: () => true } };
	c.resetCodeScanUi = c.showOverlay = () => {};
	c.codeScanOcrMatch = { isCodeScanSupported: () => false };
	c.window.Tesseract = { createWorker: () => { starts++; return creation.promise; } };
	c.preloadCodeScanWorker();
	const pending = c.codeScanState.workerPromise;
	c.openCodeScan();
	assert.equal(c.codeScanState.workerPromise, pending);
	creation.resolve(w);
	await pending;
	assert.equal(starts, 1);
	assert.ok(messages.every(message => !/loading on-device/i.test(message)));
});

test('Gallery decodes the selected file while OCR loads and revokes the local object URL', async () => {
	const c = scanner(), creation = deferred(), w = worker();
	const file = { type: 'image/jpeg', size: 100 };
	const canvas = { classList: { toggle() {} }, getContext: () => ({ drawImage() {} }) };
	const revoked = [];
	let starts = 0;
	c.window.Tesseract = { createWorker: () => { starts++; return creation.promise; } };
	c.window.URL = {
		createObjectURL: blob => { assert.equal(blob, file); return 'blob:photo'; },
		revokeObjectURL: url => revoked.push(url)
	};
	c.Image = function() {
		this.naturalWidth = 40;
		this.naturalHeight = 50;
		Object.defineProperty(this, 'src', { set: () => this.onload() });
	};
	c.getCodeScanCanvas = () => canvas;
	c.saveCodeScanSourceFromCanvas = c.resetCodeScanZoom = () => {};
	c.extractMatchFromOcrResult = () => null;
	c.showCodeScanReview = () => { c.reviewOpened = true; };
	const pending = c.prepareCodeScanWorker();
	c.handleCodeScanPhotoInput({ target: { files: [file] } });
	await flush();
	assert.equal(c.codeScanState.workerPromise, pending);
	assert.equal(canvas.width, 40);
	assert.equal(c.reviewOpened, undefined);
	assert.equal(c.status, 'Reading photo on your device...');
	creation.resolve(w);
	await flush();
	assert.equal(starts, 1);
	assert.equal(c.reviewOpened, true);
	assert.deepEqual(revoked, ['blob:photo']);
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

test('Typing keeps the scanner open for manual entry while cancelling a pending camera request', async () => {
	const c = scanner(), request = deferred();
	let stopped = 0, focused = false;
	const video = { classList: { remove() {} }, pause() {}, play: () => assert.fail('camera attached during manual entry') };
	c.getCodeScanVideo = () => video;
	c.document.getElementById = id => id === 'code_scan_review_w1' ? { focus: () => focused = true } : null;
	c.navigator = { mediaDevices: { getUserMedia: () => request.promise } };
	c.showCodeScanReview = (match, manualEntry) => {
		assert.equal(match, null);
		assert.equal(manualEntry, true);
		c.codeScanState.phase = 'review';
	};
	c.startCodeScanCamera();
	c.openCodeScanManualEntry();
	request.resolve({ getTracks: () => [{ stop: () => stopped++ }] });
	await flush();
	assert.equal(stopped, 1);
	assert.equal(focused, true);
	assert.equal(c.codeScanState.active, true);
	assert.equal(c.codeScanState.phase, 'review');
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

test('hiding the scanner releases live media and only resumes an interrupted live scan', async () => {
	const c = scanner(), pending = deferred();
	let requests = 0, stopped = 0, paused = 0, frames = 0;
	const stream = () => ({ getTracks: () => [{ stop: () => stopped++ }] });
	const video = { classList: { add() {}, remove() {} }, play: async () => {}, pause: () => paused++ };
	c.getCodeScanVideo = () => video;
	c.isCodeScanVisible = () => true;
	c.prepareCodeScanWorker = async () => worker();
	c.runCodeScanFrame = () => frames++;
	c.navigator = { mediaDevices: { getUserMedia: () => ++requests === 1 ? pending.promise : Promise.resolve(stream()) } };
	c.startCodeScanCamera();
	c.document.hidden = true;
	c.suspendCodeScanMedia();
	pending.resolve(stream());
	await flush();
	assert.equal(stopped, 1);
	assert.equal(video.srcObject, null);
	assert.equal(frames, 0);
	c.resumeCodeScanCamera();
	assert.equal(requests, 1);
	c.document.hidden = false;
	c.resumeCodeScanCamera();
	c.resumeCodeScanCamera();
	await flush();
	assert.equal(requests, 2);
	assert.equal(frames, 1);
	assert.ok(video.srcObject);
	c.document.hidden = true;
	c.suspendCodeScanMedia();
	assert.equal(stopped, 2);
	assert.equal(paused, 2);
	assert.equal(video.srcObject, null);
	c.codeScanState.phase = 'review';
	c.codeScanState.hasCaptured = true;
	c.document.hidden = false;
	c.resumeCodeScanCamera();
	assert.equal(requests, 2);
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
		const c = scanner({ useRecognition: true }), w = worker();
		c.codeScanState.worker = w;
		if(pixels) c.detectCodeScanContainers = () => { throw new Error('pixel read failed'); };
		else {
			c.codeScanOcrMatch = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
			c.detectCodeScanContainers = () => [{ x0: 10, y0: 10, x1: 90, y1: 40 }];
			c.document.createElement = () => ({ getContext: () => ({ drawImage() {}, fillRect() {} }) });
			w.recognize = async () => null;
		}
		await assert.rejects(c.recognizeCodeScanCanvas({ width: 100, height: 50 }), /pixel|Invalid scanner/);
		assert.equal(w.terminated, true);
		assert.equal(c.codeScanState.worker, null);
	}
});

test('a small-roll retry reads the straightened box and restores source coordinates', async () => {
	const c = scanner();
	const source = { width: 600, height: 400 };
	const straightenedBox = { x0: 110, y0: 140, x1: 500, y1: 300, anchored: true };
	const card = { x0: 90, y0: 110, x1: 520, y1: 330 };
	const straightenedMatch = { code: 'bengaluru mail nebula flower', regions: { container: straightenedBox, card, city: null } };
	const reported = [];
	const painted = [];
	const context = { fillRect() {}, translate() {}, rotate: angle => painted.push(angle), drawImage: image => painted.push(image) };
	c.document.createElement = () => ({ getContext: () => context });
	c.getCodeScanLabelRoll = () => 6;
	c.detectCodeScanContainers = canvas => canvas === source ? [] : [straightenedBox, card];
	c.recognizeCodeScanImage = async (canvas, focus, options, _worker, containers) => {
		if(canvas === source) return { data: { labelContainers: containers, debugBoxes: [] } };
		assert.equal(canvas.width, 639);
		assert.equal(canvas.height, 461);
		assert.equal(focus.x, canvas.width / 2);
		assert.equal(focus.y, canvas.height / 2);
		options.live.showBoxes(containers);
		return { data: { scanMatch: straightenedMatch, labelContainers: containers, debugBoxes: containers } };
	};
	c.codeScanState.worker = worker();
	const live = { isCurrent: () => true, showBoxes: boxes => reported.push(boxes) };
	const { data } = await c.recognizeCodeScanCanvas(source, { x: 300, y: 200 }, { live });
	assert.equal(data.scanMatch.code, straightenedMatch.code);
	assert.deepEqual(data.scanMatch.regions.container, data.debugBoxes[0]);
	assert.deepEqual(data.scanMatch.regions.card, data.debugBoxes[1]);
	assert.deepEqual(data.labelContainers, data.debugBoxes);
	assert.deepEqual(reported, [data.debugBoxes]);
	assert.ok(data.scanMatch.regions.container.x0 < 110 && data.scanMatch.regions.container.x1 > 480);
	assert.ok(data.scanMatch.regions.container.y0 < 120 && data.scanMatch.regions.container.y1 > 280);
	assert.equal(data.scanMatch.regions.city, null);
	assert.deepEqual(painted, [-Math.PI / 30, source]);
});
