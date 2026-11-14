'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..');
const flush = () => new Promise(resolve => setImmediate(resolve));

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

function loadTesseract() {
	const context = { console, queueMicrotask, setTimeout, clearTimeout };
	context.self = context;
	context.window = context;
	vm.createContext(context);
	vm.runInContext(`
		class HTMLElement {}
		class HTMLCanvasElement extends HTMLElement {
			constructor() {
				super();
				this.tagName = 'CANVAS';
				this.width = 8;
				this.height = 8;
			}
			toBlob(callback) { globalThis.__blobs.push(callback); }
		}
		class Blob {}
		class FileReader {
			readAsArrayBuffer() {
				const reader = this;
				queueMicrotask(() => {
					reader.result = new ArrayBuffer(4);
					if(reader.onload) reader.onload();
				});
			}
		}
		class Worker {
			postMessage(packet) {
				const worker = this;
				queueMicrotask(() => {
					if(worker.onmessage) worker.onmessage({ data: {
						workerId: packet.workerId,
						jobId: packet.jobId,
						status: 'resolve',
						action: packet.action,
						data: {}
					}});
				});
			}
			terminate() { this.terminated = true; }
		}
		globalThis.HTMLElement = HTMLElement;
		globalThis.HTMLCanvasElement = HTMLCanvasElement;
		globalThis.Blob = Blob;
		globalThis.FileReader = FileReader;
		globalThis.Worker = Worker;
		globalThis.URL = { createObjectURL() { return 'blob:worker'; }, revokeObjectURL() {} };
		globalThis.__blobs = [];
	`, context);
	vm.runInContext(read('Root/Files/tesseract/tesseract.min.js'), context);
	return context;
}

async function createWorker(context) {
	return context.Tesseract.createWorker('eng', 1, {
		workerPath: '/tesseract/worker.min.js',
		langPath: '/tesseract/lang',
		corePath: '/tesseract/tesseract-core.wasm.min.js',
		logger() {},
		errorHandler() {}
	});
}

test('published and source tesseract builds skip postMessage on a null worker', () => {
	for(const file of ['Root/Files/tesseract/tesseract.min.js', 'Root/tesseract/tesseract.min.js']) {
		const source = read(file);
		assert.match(source, /if\(r\)r\.postMessage\(n\)/);
		assert.equal(source.includes('case 0:r.postMessage(n)'), false);
	}
});

test('recognition still completes when the worker is alive', async () => {
	const context = loadTesseract();
	const worker = await createWorker(context);
	const canvas = new context.HTMLCanvasElement();
	const recognition = worker.recognize(canvas);
	assert.equal(context.__blobs.length, 1);
	context.__blobs.shift()(new context.Blob());
	const result = await recognition;
	assert.equal(result.data && typeof result.data, 'object');
	await worker.terminate();
});

test('terminating during canvas encoding does not reject postMessage', async () => {
	const rejections = [];
	function record(error) { rejections.push(error); }
	process.on('unhandledRejection', record);
	try {
		const context = loadTesseract();
		const worker = await createWorker(context);
		const canvas = new context.HTMLCanvasElement();
		const recognition = worker.recognize(canvas);
		assert.equal(context.__blobs.length, 1);
		const encoding = worker.terminate();
		context.__blobs.shift()(new context.Blob());
		await encoding;
		for(let step = 0; step < 5; step += 1) await flush();
		assert.deepEqual(rejections.map(error => error && error.message), []);
		recognition.catch(() => {});
	} finally {
		process.removeListener('unhandledRejection', record);
	}
});
