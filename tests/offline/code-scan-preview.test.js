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
 context.codeScanOcrMatch = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
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

test('live recognition detects across the full viewport and skips OCR without a frame', async () => {
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
 context.detectCodeScanContainers = input => { scanned = input; return []; };
 context.codeScanState.worker = { recognize: async () => assert.fail('no frame to read') };
 context.runCodeScanFrame(); await new Promise(resolve => setImmediate(resolve));
 assert.equal(scanned, liveCanvas); assert.equal(handled, liveCanvas); assert.notEqual(scanned, canvas);
});

test('live recognition prioritizes the sideways four-corner frame and maps its rotated OCR back to the camera', async () => {
 const { context } = scanner();
 const matcher = context.codeScanOcrMatch;
 const camera = { width: 400, height: 550 };
 const label = { x0: 100, y0: 200, x1: 250, y1: 470, anchored: true };
 const square = { x0: 175, y0: 240, x1: 245, y1: 310 };
 const distractor = { x0: 120, y0: 40, x1: 280, y1: 120 };
 const rotations = [];
 const vocabulary = ['mail', 'nebula', 'flower'];
 context.wordList = { includes: word => vocabulary.includes(word), curList: vocabulary };
 context.extractMatchFromOcrResult = context.extractSpatialMatch;
 context.detectCodeScanContainers = () => [square, distractor, label];
 context.ocrCodeScanBand = async (image, crop, _worker, maxHeight, rotation) => {
  rotations.push(rotation);
  assert.equal(image, camera);
  assert.equal(maxHeight, 160);
  assert.ok(crop.x1 - crop.x0 > crop.y1 - crop.y0);
  return [
   { text: 'Bengaluru', confidence: 95, bbox: { x0: 120, y0: 123, x1: 175, y1: 144 } },
   ...vocabulary.map((text, i) => ({ text, confidence: 95, bbox: { x0: 120 + i * 50, y0: 170, x1: 165 + i * 50, y1: 200 } }))
  ];
 };
 context.codeScanState.worker = { setParameters: async () => {}, recognize: () => assert.fail('live OCR should read the crop') };
 const result = await context.recognizeCodeScanCanvas(camera, null, {
  isCurrent: () => true,
  showBoxes: boxes => { assert.equal(boxes.length, 1); assert.equal(boxes[0], label); }
 });
 const match = context.extractSpatialMatch(result);
 assert.deepEqual(rotations, [90]);
 assert.equal(match.code, 'bengaluru mail nebula flower');
 assert.equal(match.rotation, 90);
 assert.equal(match.highConfidence, true);
 assert.deepEqual(match.regions.container, label);
 assert.deepEqual(match.regions.city, matcher.rotateLabelBox({ x0: 120, y0: 123, x1: 175, y1: 144 }, 550, 400, 270));
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
 assert.equal(cancelled, 0);
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

test('live OCR confirms uncertain reads twice and yields to a shutter press even with high confidence', () => {
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
 assert.equal(captures, 0);
 context.codeScanState.shutterPressed = true;
 match.highConfidence = true;
 context.handleCodeScanLiveOcrResult({}, liveCanvas, snapshot);
 assert.equal(captures, 0);
 context.codeScanState.shutterPressed = false;
 context.resetCodeScanMatchState();
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

test('live capture opens review immediately and only reads optional details in the background', async () => {
 const { context } = scanner();
 for(const name of ['clearCodeScanTimer', 'setCodeScanCaptureEnabled', 'setCodeScanLiveControlsVisible',
  'setCodeScanPhotoFallbackVisible', 'clearCodeScanCandidateHighlight', 'setCodeScanWoloFoundCue',
  'stopCodeScanCamera', 'setCodeScanFrozenPreview', 'setCodeScanCropControlsVisible', 'playShutterSound'])
  context[name] = () => {};
 const detected = { code: 'apple berry cherry', regions: { container: { x0: 20, y0: 40, x1: 160, y1: 100 } } };
 context.showCodeScanReview = match => { context.codeScanState.reviewMatch = match; };
 context.processCodeScanCapture = () => assert.fail('code OCR must not run again');
 let complete;
 context.enrichCodeScanMetadata = (image, match) => {
  assert.equal(image, context.codeScanState.originalSourceCanvas);
  assert.notEqual(match, detected);
  return new Promise(resolve => { complete = () => resolve({ ...match, metadata: { title: 'Home' } }); });
 };
 context.beginCodeScanCapture(detected);
 assert.equal(context.codeScanState.reviewMatch, detected);
 assert.equal(context.codeScanState.processing, false);
 assert.equal(context.codeScanState.hasCaptured, true);
 await new Promise(resolve => setImmediate(resolve));
 complete();
 await new Promise(resolve => setImmediate(resolve));
 assert.equal(context.codeScanState.reviewMatch.metadata.title, 'Home');
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

test('releasing a shutter hold captures the displayed match even after a missed read', () => {
 const { context } = scanner(); const buttonEvents = {}, windowEvents = {}; let timer, draws = 0, clears = 0;
 context.document.getElementById = () => ({ addEventListener: (name, fn) => buttonEvents[name] = fn });
 context.window = { addEventListener: (name, fn) => windowEvents[name] = fn };
 context.setTimeout = fn => { timer = fn; return 1; }; context.clearTimeout = () => { timer = null; };
 context.drawCodeScanMatchRegions = () => draws++; context.clearCodeScanCandidateHighlight = () => clears++;
 const box = { x0: 10, y0: 20, x1: 80, y1: 50 };
 const match = { code: 'bengaluru mail nebula flower', regions: { container: box } };
 const frame = { width: 200, height: 100 };
 const ocrImage = { width: 100, height: 50 };
 let captured;
 context.getCodeScanCanvas().getContext = () => ({ drawImage: source => { assert.equal(source, frame); } });
 context.extractGuidanceFromOcrResult = result => result.found ? { match, bbox: box } : null;
 context.beginCodeScanCapture = detected => { captured = detected; };
 for(const name of ['setCodeScanWoloFoundCue', 'resetCodeScanLiveZoom', 'saveCodeScanSourceFromCanvas', 'resetCodeScanZoom', 'resetCodeScanGuide'])
  context[name] = () => {};
 context.initCodeScanRegionPress();
 buttonEvents.pointerdown({ type: 'pointerdown', button: 0 });
 assert.equal(context.codeScanState.showRegions, false);
 windowEvents.pointerup({ type: 'pointerup' }); assert.equal(timer, null);
 assert.equal(captured, undefined);
 buttonEvents.pointerdown({ type: 'pointerdown', button: 0 }); timer();
 assert.equal(context.codeScanState.showRegions, true); assert.equal(draws, 1);
 context.handleCodeScanLiveOcrResult({ found: true }, ocrImage, frame);
 context.handleCodeScanLiveOcrResult({ found: false }, ocrImage, frame);
 assert.equal(captured, undefined);
 windowEvents.pointercancel({ type: 'pointercancel' });
 assert.equal(captured, undefined);
 buttonEvents.pointerdown({ type: 'pointerdown', button: 0 }); timer();
 windowEvents.pointerup({ type: 'pointerup' }); assert.equal(context.codeScanState.showRegions, false);
 assert.equal(captured, match);
 assert.equal(captured.regions.container.x0, 20);
 assert.equal(context.codeScanState.regionPressConsumed, true); assert.ok(clears > 0);
});
