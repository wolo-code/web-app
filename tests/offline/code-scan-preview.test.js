const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function scanner() {
 const canvas = { width: 1200, height: 800 };
 const context = { setTimeout, clearTimeout, Audio: function() { this.load = () => {}; }, document: { getElementById: () => null, querySelector: () => null }, console };
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
 context.getCodeScanCanvas = () => canvas;
 context.setCodeScanStatus = () => {};
 context.showCodeScanReview = match => { context.reviewMatch = match; };
 context.extractSpatialMatch = context.extractMatchFromOcrResult;
 context.extractMatchFromOcrResult = result => result.match;
 context.detectCodeScanContainers = () => [];
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
test('reframing scans the complete image even when a small guide clips the card', async () => {
 const { context, canvas } = scanner(); let scanned;
 const guide = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 30, height: 20 }) };
 context.document.getElementById = id => id === 'code_scan_fixed_guide' ? guide : null;
 context.document.createElement = () => { throw new Error('The guide must not crop pixels'); };
 context.codeScanState.worker = { recognize: async input => { scanned = input; return { match: null }; } };
 context.applyCodeScanCrop(); await new Promise(resolve => setImmediate(resolve));
 assert.equal(scanned, canvas);
 assert.equal(context.codeScanState.sourceCanvas, canvas);
 assert.equal(canvas.width, 1200); assert.equal(canvas.height, 800);
});

test('reframing preserves native card, code and metadata coordinates', async () => {
 const { context } = scanner();
 const match = { regions: {
  card: { x0: 100, y0: 10, x1: 600, y1: 750 },
  container: { x0: 150, y0: 180, x1: 500, y1: 400 },
  city: { x0: 200, y0: 200, x1: 300, y1: 230 },
  code: { x0: 170, y0: 270, x1: 480, y1: 320 },
  title: { x0: 200, y0: 80, x1: 300, y1: 110 },
  segment: null,
  address_line_1: { x0: 140, y0: 430, x1: 550, y1: 480 }
 }, metadata: { title: 'Ram', segment: '', address_line_1: '#43, Main St.', address_line_2: '' } };
 context.codeScanState.worker = { recognize: async () => ({ match }) };
 context.applyCodeScanCrop(); await new Promise(resolve => setImmediate(resolve));
 assert.equal(context.reviewMatch, match);
 assert.equal(context.reviewMatch.regions.card.x0, 100);
 assert.equal(context.reviewMatch.regions.container.y0, 180);
 assert.equal(context.reviewMatch.regions.title.x0, 200);
 assert.equal(context.reviewMatch.regions.address_line_1.y0, 430);
});

test('every recognition detects printed boxes before OCR and retains its pixel coordinates', async () => {
 const { context, canvas } = scanner();
 const calls = [];
 const containers = [{ x0: 90, y0: 225, x1: 370, y1: 330 }];
 context.detectCodeScanContainers = input => { assert.equal(input, canvas); calls.push('detect'); return containers; };
 context.extractMatchFromOcrResult = () => ({ code: 'bengaluru mail nebula flower' });
 context.codeScanState.worker = { recognize: async input => {
  assert.equal(input, canvas); calls.push('ocr'); return { data: { text: 'Bengaluru mail nebula flower', words: [] } };
 } };
 const result = await context.recognizeCodeScanCanvas(canvas);
 assert.deepEqual(calls, ['detect', 'ocr']);
 assert.equal(result.data.labelContainers, containers);
});

test('live recognition reads the full viewport instead of clipping to the initial guide', async () => {
 const { context, canvas } = scanner(); let scanned, handled;
 context.getCodeScanVideo = () => ({ readyState: 2 });
 const snapshot = { width: 1920, height: 1080 };
 const liveCanvas = { width: 960, height: 540 };
 const buffers = [snapshot, liveCanvas];
 context.document.createElement = () => buffers.shift();
 context.captureCodeScanFullRes = (_video, target) => { assert.equal(target, snapshot); return true; };
 context.captureCodeScanFrame = (frame, target) => { assert.equal(frame, snapshot); assert.equal(target, liveCanvas); };
 context.getCodeScanFixedRatioSlice = () => { throw new Error('Guide cannot restrict recognition'); };
 context.scheduleCodeScanFrame = () => {};
 context.handleCodeScanLiveOcrResult = (result, input, frame) => { handled = input; assert.equal(frame, snapshot); };
 context.codeScanState.worker = { recognize: async input => { scanned = input; return { data: {} }; } };
 context.runCodeScanFrame(); await new Promise(resolve => setImmediate(resolve));
 assert.equal(scanned, liveCanvas); assert.equal(handled, liveCanvas); assert.notEqual(scanned, canvas);
});

test('shutter takes a fresh frame while live OCR is pending', async () => {
 const { context, canvas } = scanner();
 const video = { readyState: 2 };
 let captured, processed, cancelled = 0;
 context.getCodeScanVideo = () => video;
 context.codeScanState.processing = true;
 context.captureCodeScanFullRes = (input, target) => { assert.equal(input, video); captured = target; return true; };
 context.terminateCodeScanWorker = () => cancelled++;
 for(const name of ['resetCodeScanLiveZoom', 'saveCodeScanSourceFromCanvas', 'resetCodeScanZoom', 'resetCodeScanGuide'])
  context[name] = () => {};
 context.beginCodeScanCapture = (...args) => { processed = args; };
 context.captureCodeScanManually();
 assert.equal(captured, canvas);
 assert.equal(cancelled, 1);
 assert.deepEqual(processed, []);
});

test('recognition uses word confidence inside a box even when unrelated OCR lowers page confidence', () => {
 const { context } = scanner();
 context.codeScanOcrMatch = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
 const vocabulary = ['mail', 'nebula', 'flower'];
 context.wordList = { includes: word => vocabulary.includes(word), curList: vocabulary };
 const words = vocabulary.map((text, i) => ({ text, confidence: 95, bbox: { x0: 100 + i * 100, y0: 150, x1: 180 + i * 100, y1: 180 } }));
 const data = { text: '', confidence: 10, words, labelContainers: [{ x0: 80, y0: 100, x1: 400, y1: 200 }] };
 assert.equal(context.extractSpatialMatch({ data }).code, 'mail nebula flower');
 assert.equal(context.extractSpatialMatch({ data: { ...data, labelContainers: [] } }), null);
});

test('bounded border detection maps back to native photo dimensions without reducing OCR resolution', () => {
 const context = { Audio: function() { this.load = () => {}; }, document: {}, console };
 vm.createContext(context);
 vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
 const image = {};
 let working, draw;
 context.document.createElement = () => (working = { getContext: () => ({
  drawImage: (...args) => draw = args,
  getImageData: (...args) => { assert.deepEqual(args, [0, 0, 1200, 900]); return image; }
 }) });
 context.codeScanOcrMatch = { detectLabelRectangles: (input, width, height) => {
  assert.equal(input, image); assert.equal(width, 1200); assert.equal(height, 900);
  return [{ x0: 100, y0: 150, x1: 300, y1: 250 }];
 } };
 const canvas = { width: 4000, height: 3000 };
 const [detected] = context.detectCodeScanContainers(canvas);
 assert.equal(working.width, 1200); assert.equal(working.height, 900);
 assert.deepEqual(draw, [canvas, 0, 0, 1200, 900]);
 for(const [key, expected] of Object.entries({ x0: 1000 / 3, y0: 500, x1: 1000, y1: 2500 / 3 }))
  assert.ok(Math.abs(detected[key] - expected) < 1e-6);
 assert.equal(canvas.width, 4000); assert.equal(canvas.height, 3000);
});

test('live OCR captures a stable candidate from the recognized frame and yields to an ongoing shutter press', () => {
 const { context, canvas } = scanner();
 const bbox = { x0: 100, y0: 120, x1: 900, y1: 170 };
 const match = { code: 'apple berry cherry', regions: { container: bbox } };
 const snapshot = { width: 1920, height: 1080 };
 const liveCanvas = { width: 960, height: 540 };
 let captured;
 canvas.getContext = () => ({ drawImage: frame => captured = frame });
 context.extractGuidanceFromOcrResult = () => ({ match, bbox });
 context.codeScanOcrMatch = { bboxIoU: () => 1 };
 context.setCodeScanCandidateHighlight = () => {};
 context.setCodeScanWoloFoundCue = () => {};
 for(const name of ['resetCodeScanLiveZoom', 'saveCodeScanSourceFromCanvas', 'resetCodeScanZoom', 'resetCodeScanGuide'])
  context[name] = () => {};
 let captures = 0;
 context.beginCodeScanCapture = () => captures++;
 context.handleCodeScanLiveOcrResult({}, liveCanvas, snapshot);
 context.handleCodeScanLiveOcrResult({}, liveCanvas, snapshot);
 context.codeScanState.shutterPressed = true;
 context.handleCodeScanLiveOcrResult({}, liveCanvas, snapshot);
 assert.equal(captures, 0);
 context.codeScanState.shutterPressed = false;
 context.handleCodeScanLiveOcrResult({}, liveCanvas, snapshot);
 assert.equal(captures, 1);
 assert.equal(captured, snapshot);
 assert.equal(match.regions.container.x0, bbox.x0 * 2);
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

test('capture reads scaled bands when the code pass missed title, segment, and address', async () => {
 const { context, canvas } = scanner();
 const matcher = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
 const container = { x0: 90, y0: 225, x1: 370, y1: 330 };
 const card = { x0: 60, y0: 60, x1: 400, y1: 465 };
 const bands = matcher.detailScanBands(container, card);
 const match = {
  code: 'bengaluru mail nebula flower',
  regions: { container, card },
  metadata: { title: '', segment: '', address_line_1: '', address_line_2: '', address: '' }
 };
 const modes = [];
 const seen = [];
 context.codeScanOcrMatch = matcher;
 canvas.width = 479; canvas.height = 812;
 let crop;
 context.document.createElement = () => ({ getContext: () => ({ fillRect() {}, drawImage(_image, x, y, width, height) {
  crop = { x, y, width, height };
 } }) });
 context.codeScanState.worker = {
  setParameters: async params => { modes.push(params.tessedit_pageseg_mode); },
  recognize: async target => {
   const band = bands.find(item => Math.round(item.x0) === crop.x && Math.round(item.y0) === crop.y);
   seen.push(band && band.role);
   const scale = target.height < 360 ? 4 : 3;
   const place = (text, x0, y0, x1, y1) => ({ text, confidence: 96, bbox: {
    x0: (x0 - band.x0) * scale, y0: (y0 - band.y0) * scale, x1: (x1 - band.x0) * scale, y1: (y1 - band.y0) * scale
   } });
   if(band.role === 'above') return { data: { words: [place('Ram', 180, 170, 230, 185), place('Main door', 170, 196, 260, 208)] } };
   return { data: { words: [place('#43, 6th Main', 100, 350, 340, 365), place('Flat 4B', 120, 400, 220, 415)] } };
  }
 };
 const detailed = await context.enrichCodeScanMetadata(canvas, match);
 assert.deepEqual(seen, ['above', 'below']);
 assert.deepEqual(modes, ['6', '11']);
 assert.equal(detailed.code, 'bengaluru mail nebula flower');
 assert.equal(detailed.metadata.title, 'Ram');
 assert.equal(detailed.metadata.segment, 'Main door');
 assert.equal(detailed.metadata.address_line_1, '#43, 6th Main');
 assert.equal(detailed.metadata.address_line_2, 'Flat 4B');
 assert.equal(detailed.regions.card, card);
});

test('capture reads bands around the code box when no outer card is printed', async () => {
 const { context, canvas } = scanner();
 const matcher = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
 const container = { x0: 61, y0: 284, x1: 539, y1: 460 };
 const match = {
  code: 'bengaluru mail nebula flower',
  regions: { container, card: null },
  metadata: { title: '', segment: '', address_line_1: '', address_line_2: '', address: '' }
 };
 const crops = [];
 context.codeScanOcrMatch = matcher;
 canvas.width = 609; canvas.height = 697;
 context.document.createElement = () => ({ getContext: () => ({ fillRect() {}, drawImage(_image, x, y, width, height) {
  crops.push({ x, y, width, height });
 } }) });
 context.codeScanState.worker = {
  setParameters: async () => {},
  recognize: async target => {
   const crop = crops.at(-1);
   const scale = target.height < 360 ? 4 : 3;
   const place = (text, x0, y0, x1, y1) => ({ text, confidence: 96, bbox: {
    x0: (x0 - crop.x) * scale, y0: (y0 - crop.y) * scale, x1: (x1 - crop.x) * scale, y1: (y1 - crop.y) * scale
   } });
   if(crop.y + crop.height <= container.y0) return { data: { words: [
    place('Ram', 274, 200, 324, 212), place('Main door', 256, 232, 340, 245)
   ] } };
   return { data: { words: [
    place('#43, 6th Main, Gaurav Nagar, Phase 7, J.P. Nagar', 84, 511, 511, 530),
    place('Bengaluru, Karnataka, India - 560078', 135, 541, 461, 557)
   ] } };
  }
 };
 const detailed = await context.enrichCodeScanMetadata(canvas, match);
 const above = crops.filter(crop => crop.y + crop.height <= container.y0);
 const below = crops.filter(crop => crop.y >= container.y1);
 assert.equal(above.length, 1);
 assert.ok(above[0].y <= 200 && above[0].y + above[0].height >= 245 && above[0].y > 141);
 assert.equal(below.length, 1);
 assert.ok(below[0].y <= 511 && below[0].y + below[0].height >= 557 && below[0].y + below[0].height < 615);
 assert.equal(detailed.regions.card, null);
 assert.equal(detailed.metadata.title, 'Ram');
 assert.equal(detailed.metadata.segment, 'Main door');
 assert.equal(detailed.metadata.address_line_1, '#43, 6th Main, Gaurav Nagar, Phase 7, J.P. Nagar');
 assert.equal(detailed.metadata.address_line_2, 'Bengaluru, Karnataka, India - 560078');
});

test('live capture rereads the full-resolution card for optional text', async () => {
 const { context } = scanner();
 for(const name of ['clearCodeScanTimer', 'setCodeScanCaptureEnabled', 'setCodeScanLiveControlsVisible',
  'setCodeScanPhotoFallbackVisible', 'clearCodeScanCandidateHighlight', 'setCodeScanWoloFoundCue',
  'stopCodeScanCamera', 'setCodeScanFrozenPreview', 'setCodeScanCropControlsVisible', 'playShutterSound'])
  context[name] = () => {};
 const detected = { code: 'apple berry cherry' };
 const complete = { code: detected.code, metadata: { title: 'Home', segment: 'Main door', address_line_1: '12 MG Road', address_line_2: 'Flat 4B' } };
 let reads = 0;
 context.codeScanState.worker = { recognize: async input => {
  assert.equal(input, context.getCodeScanCanvas()); reads++;
  return { match: complete };
 } };
 context.beginCodeScanCapture(detected);
 await new Promise(resolve => setImmediate(resolve));
 assert.equal(reads, 1);
 assert.equal(context.reviewMatch, complete);
 assert.equal(context.reviewMatch.metadata.address_line_2, 'Flat 4B');
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
