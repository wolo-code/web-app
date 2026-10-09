const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function scanner() {
 const canvas = { width: 1200, height: 800 };
 const context = { setTimeout, clearTimeout, Audio: function() { this.load = () => {}; }, document: { getElementById: () => null }, console };
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
 context.getCodeScanCanvas = () => canvas;
 context.setCodeScanStatus = () => {};
 context.showCodeScanReview = match => { context.reviewMatch = match; };
 context.extractMatchFromOcrResult = result => result.match;
 context.codeScanState.active = true;
 context.codeScanState.sourceCanvas = canvas;
 context.codeScanState.originalSourceCanvas = canvas;
 return { context, canvas };
}

test('gallery photos preserve native resolution for the preview, source and OCR', async () => {
 for(const [width, height] of [[4032, 3024], [3024, 4032]]) {
  const { context, canvas } = scanner(); let draw;
  canvas.getContext = () => ({ drawImage: (...args) => draw = args });
  context.FileReader = function() { this.readAsDataURL = () => { this.result = 'photo'; this.onload(); }; };
  context.Image = function() {
   this.naturalWidth = width; this.naturalHeight = height;
   Object.defineProperty(this, 'src', { set: () => this.onload() });
  };
  context.saveCodeScanSourceFromCanvas = () => {
   context.codeScanState.originalSourceCanvas = { width: canvas.width, height: canvas.height };
  };
  for(const name of ['resetCodeScanZoom', 'setCodeScanFrozenPreview', 'setCodeScanCropControlsVisible'])
   context[name] = () => {};
  context.codeScanState.worker = { recognize: async input => {
   assert.equal(input.width, width); assert.equal(input.height, height);
   return { match: null };
  } };
  await context.recognizeCodeScanPhoto({});
  assert.equal(canvas.width, width); assert.equal(canvas.height, height);
  assert.deepEqual(draw.slice(1), [0, 0, width, height]);
  assert.equal(context.codeScanState.originalSourceCanvas.width, width);
  assert.equal(context.codeScanState.originalSourceCanvas.height, height);
 }
});
test('recognition preserves the complete captured preview on success and no match', async () => {
 for(const match of [{ code: 'test' }, null]) {
  const { context, canvas } = scanner();
  context.codeScanState.worker = { recognize: async input => { assert.equal(input, canvas); return { match }; } };
  context.processCodeScanCapture(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(canvas.width, 1200); assert.equal(canvas.height, 800);
  assert.equal(context.codeScanState.sourceCanvas, canvas);
  assert.equal(context.reviewMatch, match);
 }
});
test('crop OCR intersects letterboxing and does not replace the editable image', async () => {
 const { context, canvas } = scanner(); let scanned, draw;
 const guide = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 }) };
 context.document.getElementById = id => id === 'code_scan_fixed_guide' ? guide : null;
 context.document.createElement = () => ({ getContext: () => ({ drawImage: (...args) => draw = args }) });
 context.getCodeScanRenderedImageRect = () => ({ left: 50, top: 25, width: 300, height: 200 });
 context.codeScanState.worker = { recognize: async input => { scanned = input; return { match: null }; } };
 context.applyCodeScanCrop(); await new Promise(resolve => setImmediate(resolve));
 assert.equal(scanned.width, 1000); assert.equal(scanned.height, 700);
 assert.deepEqual(draw.slice(1, 5), [0, 0, 1000, 700]);
 assert.equal(context.codeScanState.sourceCanvas, canvas);
 assert.equal(canvas.width, 1200); assert.equal(canvas.height, 800);
});

test('crop OCR translates all three rectangles back into original image coordinates', async () => {
 const { context } = scanner();
 const guide = { getBoundingClientRect: () => ({ left: 50, top: 25, width: 100, height: 60 }) };
 context.document.getElementById = id => id === 'code_scan_fixed_guide' ? guide : null;
 context.document.createElement = () => ({ getContext: () => ({ drawImage() {} }) });
 context.getCodeScanRenderedImageRect = () => ({ left: 0, top: 0, width: 300, height: 200 });
 const match = { regions: {
  container: { x0: 0, y0: 0, x1: 300, y1: 180 },
  city: { x0: 50, y0: 30, x1: 150, y1: 50 },
  code: { x0: 10, y0: 100, x1: 290, y1: 130 }
 } };
 context.codeScanState.worker = { recognize: async () => ({ match }) };
 context.applyCodeScanCrop(); await new Promise(resolve => setImmediate(resolve));
 assert.deepEqual({ ...context.reviewMatch.regions.container }, { x0: 200, y0: 100, x1: 500, y1: 280 });
 assert.deepEqual({ ...context.reviewMatch.regions.city }, { x0: 250, y0: 130, x1: 350, y1: 150 });
 assert.deepEqual({ ...context.reviewMatch.regions.code }, { x0: 210, y0: 200, x1: 490, y1: 230 });
});

test('live OCR captures stable text without requiring a printed border or text aspect ratio', () => {
 const { context, canvas } = scanner();
 const bbox = { x0: 100, y0: 120, x1: 900, y1: 170 };
 context.extractGuidanceFromOcrResult = () => ({ match: { code: 'apple berry cherry' }, bbox });
 context.codeScanOcrMatch = { bboxIoU: () => 1 };
 context.setCodeScanCandidateHighlight = () => {};
 context.setCodeScanWoloFoundCue = () => {};
 context.getCodeScanVideo = () => null;
 context.resetCodeScanGuide = () => {};
 let captures = 0;
 context.beginCodeScanCapture = () => captures++;
 context.handleCodeScanLiveOcrResult({}, canvas);
 context.handleCodeScanLiveOcrResult({}, canvas);
 assert.equal(captures, 0);
 context.handleCodeScanLiveOcrResult({}, canvas);
 assert.equal(captures, 1);
});

test('live OCR crop follows the visible guide rather than an unrelated 3:1 slice', () => {
 const { context, canvas } = scanner();
 let draw;
 const guide = { getBoundingClientRect: () => ({ left: 30, top: 40, width: 300, height: 180 }) };
 const viewport = { clientWidth: 400, clientHeight: 300, getBoundingClientRect: () => ({ left: 10, top: 10, width: 400, height: 300 }) };
 context.document.getElementById = () => guide;
 context.document.querySelector = () => viewport;
 context.document.createElement = () => ({ getContext: () => ({ drawImage: (...args) => draw = args }) });
 const crop = context.getCodeScanFixedRatioSlice(canvas);
 assert.equal(crop.width, 900);
 assert.equal(crop.height, 480);
 assert.deepEqual(draw.slice(1, 5), [60, 80, 900, 480]);
});

test('capture keeps the detected code when full-frame OCR fails or finds another code', async () => {
 for(const result of [null, { code: 'different code' }, 'error']) {
  const { context } = scanner();
  const detected = { code: 'apple berry cherry' };
  context.codeScanState.worker = { recognize: async () => {
   if(result === 'error') throw new Error('OCR failed');
   return { match: result };
  } };
  context.processCodeScanCapture(detected);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(context.reviewMatch, detected);
 }
});

test('live capture fills review immediately without a second OCR read', () => {
 const { context } = scanner();
 for(const name of ['clearCodeScanTimer', 'setCodeScanCaptureEnabled', 'setCodeScanLiveControlsVisible',
  'setCodeScanPhotoFallbackVisible', 'clearCodeScanCandidateHighlight', 'setCodeScanWoloFoundCue',
  'stopCodeScanCamera', 'setCodeScanFrozenPreview', 'setCodeScanCropControlsVisible', 'playShutterSound'])
  context[name] = () => {};
 context.processCodeScanCapture = () => { throw new Error('Unexpected second OCR read'); };
 const detected = { code: 'apple berry cherry' };
 context.beginCodeScanCapture(detected);
 assert.equal(context.reviewMatch, detected);
 assert.equal(context.codeScanState.processing, false);
 assert.equal(context.codeScanState.hasCaptured, true);
});

test('detected rectangle grows ten percent around its center and stays within the image', () => {
 const { context } = scanner();
 const highlight = { style: {}, classList: { remove() {} } };
 context.document.getElementById = () => highlight;
 context.document.querySelector = () => ({});
 context.getCodeScanVideo = () => null;
 context.codeScanState.showRegions = true;
 context.setCodeScanCandidateHighlight({ x0: 100, y0: 100, x1: 300, y1: 200 }, { width: 1000, height: 500 });
 assert.equal(highlight.style.left, '9%');
 assert.equal(highlight.style.top, '19%');
 assert.equal(highlight.style.width, '22%');
 assert.equal(highlight.style.height, '22%');
 context.codeScanState.showRegions = true;
 context.setCodeScanCandidateHighlight({ x0: 0, y0: 0, x1: 1000, y1: 500 }, { width: 1000, height: 500 });
 assert.equal(highlight.style.left, '0%');
 assert.equal(highlight.style.width, '100%');
});

test('zoom and pan debounce crop OCR and wait for an in-flight read to finish', () => {
 const { context } = scanner();
 const timers = new Map(); let next = 0; let scans = 0;
 context.setTimeout = fn => { timers.set(++next, fn); return next; };
 context.clearTimeout = id => timers.delete(id);
 context.getCodeScanCanvas = () => ({ style: {} });
 context.document.querySelector = () => null;
 context.codeScanState.hasCaptured = true;
 context.codeScanState.phase = 'review';
 context.codeScanState.worker = {};
 context.applyCodeScanCrop = () => scans++;
 context.setCodeScanZoom(1.25, 0, 0);
 context.setCodeScanZoom(1.25, 20, 0);
 assert.equal(timers.size, 1);
 const run = () => { const [id, fn] = timers.entries().next().value; timers.delete(id); fn(); };
 context.codeScanState.phase = 'processing'; run();
 assert.equal(scans, 0);
 context.codeScanState.phase = 'review'; run();
 assert.equal(scans, 1);
});

 test('region outlines appear only after holding capture and hide on release', () => {
 const { context } = scanner(); const buttonEvents = {}, windowEvents = {}; let timer, draws = 0, clears = 0;
 context.document.getElementById = () => ({ addEventListener: (name, fn) => buttonEvents[name] = fn });
 context.window = { addEventListener: (name, fn) => windowEvents[name] = fn };
 context.setTimeout = fn => { timer = fn; return 1; }; context.clearTimeout = () => { timer = null; };
 context.drawCodeScanMatchRegions = () => draws++; context.clearCodeScanCandidateHighlight = () => clears++;
 context.initCodeScanRegionPress();
 buttonEvents.pointerdown({ type: 'pointerdown', button: 0 });
 assert.equal(context.codeScanState.showRegions, false);
 windowEvents.pointerup(); assert.equal(timer, null);
 buttonEvents.pointerdown({ type: 'pointerdown', button: 0 }); timer();
 assert.equal(context.codeScanState.showRegions, true); assert.equal(draws, 1);
 windowEvents.pointerup(); assert.equal(context.codeScanState.showRegions, false);
 assert.equal(context.codeScanState.regionPressConsumed, true); assert.ok(clears > 0);
 });
