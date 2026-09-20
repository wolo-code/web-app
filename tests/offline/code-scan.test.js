'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

test('scan entry points and on-device OCR UI are wired', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	const fragment = read('Root/HTML/Fragment/Code_scan.php');
	const script = read('Root/JS/Component/Root/Script.js');
	const codeScan = read('Root/JS/Component/Root/CodeScan.js');
	const css = read('Root/CSS/Component/Root/Base/CodeScan.css');
	assert.match(index, /id='decode_code_scan_button'/);
	assert.match(index, /id='map_code_scan_button'/);
	assert.match(index, /includeSVG\('', 'Camera'\)/);
	assert.match(index, /Code_scan\.php/);
	assert.match(fragment, /Processed on your device/);
	assert.match(fragment, /id='code_scan_video'/);
	assert.match(fragment, /id='code_scan_photo_input'/);
	assert.match(fragment, /capture='environment'/);
	assert.match(script, /initCodeScan\(\)/);
	assert.match(codeScan, /getUserMedia/);
	assert.match(codeScan, /CODE_SCAN_TESSERACT_BASE\s*=\s*'\/tesseract'/);
	assert.match(codeScan, /workerPath:\s*CODE_SCAN_TESSERACT_BASE\s*\+\s*'\/worker\.min\.js'/);
	assert.match(codeScan, /langPath:\s*CODE_SCAN_TESSERACT_BASE\s*\+\s*'\/lang'/);
	assert.match(codeScan, /corePath:\s*CODE_SCAN_TESSERACT_BASE\s*\+\s*'\/tesseract-core\.wasm\.min\.js'/);
	assert.doesNotMatch(codeScan, /jsdelivr|unpkg|cdn\./i);
	assert.match(codeScan, /decode_input_from_form\(\)/);
	assert.match(codeScan, /decode_input_from_map\(\)/);
	assert.match(codeScan, /code_scan_photo_input/);
	assert.doesNotMatch(codeScan, /upload/i);
	assert.match(css, /\.code_scan_viewport/);
});

test('OCR matcher module is self-contained and testable', () => {
	const matcher = read('Root/JS/Component/Root/CodeScanOcrMatch.js');
	assert.match(matcher, /matchOcrTextToWoloCode/);
	assert.match(matcher, /module\.exports/);
	assert.match(matcher, /isCodeScanSupported/);
});
