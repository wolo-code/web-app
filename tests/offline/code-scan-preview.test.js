const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function scanner() {
 const canvas = { width: 1200, height: 800 };
 const context = { Audio: function() { this.load = () => {}; }, document: { getElementById: () => null }, console };
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
