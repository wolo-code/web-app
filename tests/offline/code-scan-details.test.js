'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const matcher = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
const keys = ['title', 'segment', 'address_line_1', 'address_line_2'];

function scanner() {
	const nodes = {};
	for(const id of ['code_scan_details', 'code_scan_details_toggle', 'decode_input', 'pac-input', ...keys.map(key => 'code_scan_' + key)])
		nodes[id] = { value: '', hidden: true, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
	const context = {
		Audio: function() { this.load = () => {}; }, setTimeout, clearTimeout,
		document: { getElementById: id => nodes[id] || null }, codeScanOcrMatch: matcher, console
	};
	vm.createContext(context);
	vm.runInContext(fs.readFileSync('Root/JS/Component/Root/CodeScan.js', 'utf8'), context);
	context.redrawCodeScanReviewRegions = () => {};
	return { context, nodes };
}

function candidate(code = 'bengaluru mail nebula flower') {
	return { code, regions: { container: { x0: 10, y0: 50, x1: 300, y1: 200 } }, metadata: {
		title: 'Ram', segment: 'Main door', address_line_1: '12 MG Road', address_line_2: 'Flat 4B, second floor'
	} };
}

test('address icon reveals four separate optional fields and collapses without discarding edits', () => {
	const { context, nodes } = scanner();
	context.populateCodeScanMetadata(candidate());
	assert.equal(nodes.code_scan_details.hidden, true);
	assert.equal(nodes.code_scan_details_toggle.attributes['aria-expanded'], 'false');
	context.toggleCodeScanDetails();
	assert.equal(nodes.code_scan_details.hidden, false);
	assert.equal(nodes.code_scan_details_toggle.attributes['aria-expanded'], 'true');
	assert.equal(nodes.code_scan_title.value, 'Ram');
	assert.equal(nodes.code_scan_segment.value, 'Main door');
	assert.equal(nodes.code_scan_address_line_1.value, '12 MG Road');
	assert.equal(nodes.code_scan_address_line_2.value, 'Flat 4B, second floor');
	context.editCodeScanMetadata('address_line_2', 'Side entrance');
	context.toggleCodeScanDetails();
	assert.equal(nodes.code_scan_details.hidden, true);
	assert.equal(context.codeScanState.reviewMetadata.address, '12 MG Road\n\nSide entrance');
});

test('new OCR of the same card preserves edited fields including deliberate clearing', () => {
	const { context, nodes } = scanner();
	const first = candidate();
	context.populateCodeScanMetadata(first);
	context.codeScanState.reviewMatch = first;
	context.editCodeScanMetadata('title', 'Office');
	context.editCodeScanMetadata('segment', '');
	context.toggleCodeScanDetails();
	const next = candidate(); next.metadata.address_line_1 = 'Corrected OCR address';
	context.populateCodeScanMetadata(next);
	assert.equal(next.metadata.title, 'Office');
	assert.equal(next.metadata.segment, '');
	assert.equal(next.metadata.address_line_1, 'Corrected OCR address');
	assert.equal(nodes.code_scan_details.hidden, false);
});

test('a different code or a different card clears edits and collapses optional details', () => {
	for(const change of ['code', 'position']) {
		const { context, nodes } = scanner();
		const first = candidate();
		context.populateCodeScanMetadata(first); context.codeScanState.reviewMatch = first;
		context.editCodeScanMetadata('title', 'Office'); context.toggleCodeScanDetails();
		const next = candidate(change === 'code' ? 'delhi cat apple tomato' : first.code);
		if(change === 'position') next.regions.container = { x0: 500, y0: 500, x1: 900, y1: 700 };
		context.populateCodeScanMetadata(next);
		assert.equal(next.metadata.title, 'Ram');
		assert.equal(nodes.code_scan_details.hidden, true);
	}
});

test('manual optional fields remain editable when no label metadata is readable', () => {
	const { context, nodes } = scanner();
	context.populateCodeScanMetadata(null); context.toggleCodeScanDetails();
	context.editCodeScanMetadata('title', 'Home');
	context.editCodeScanMetadata('address_line_1', '12 MG Road');
	assert.equal(context.codeScanState.reviewMetadata.title, 'Home');
	assert.equal(context.codeScanState.reviewMetadata.address, '12 MG Road');
	context.resetCodeScanDetails();
	assert.equal(context.codeScanState.reviewMetadata, null);
	assert.equal(nodes.code_scan_title.value, '');
});

test('Use Code carries edited metadata through scanner cleanup for map and form entry', () => {
	for(const source of ['map', 'decode']) {
		const { context, nodes } = scanner();
		context.populateCodeScanMetadata(candidate()); context.editCodeScanMetadata('segment', 'Side door');
		context.codeScanState.source = source;
		context.stopCodeScan = () => context.resetCodeScanDetails();
		context.hideOverlay = () => {};
		let applied;
		context.beginDecode = (code, metadata) => applied = { code, metadata };
		context.applyScannedWoloCode('bengaluru mail nebula flower');
		assert.equal(applied.code, 'bengaluru mail nebula flower');
		assert.equal(applied.metadata.segment, 'Side door');
		assert.equal(applied.metadata.address_line_1, '12 MG Road');
		assert.equal(applied.metadata.address_line_2, 'Flat 4B, second floor');
		assert.equal(nodes[source === 'map' ? 'pac-input' : 'decode_input'].value.includes(applied.code), true);
	}
});

test('decode applies scanned details after clearing the previous location and before decoding', () => {
	const context = { console, document: { getElementById: () => null } };
	vm.createContext(context);
	vm.runInContext(fs.readFileSync('Root/JS/Component/Root/Map.js', 'utf8'), context);
	const calls = [];
	context.cleanUp = () => { context.current_title = null; calls.push('cleanup'); };
	context.addClassIfPresent = () => {};
	context.formatSavedAddress = lines => [lines.address_line_1, lines.address_line_2].filter(Boolean).join('\n\n');
	context.execDecode = code => {
		calls.push(code);
		assert.equal(context.current_title, 'Ram');
		assert.equal(context.current_segment, 'Main door');
		assert.equal(context.current_address_lines.address_line_2, 'Flat 4B, second floor');
	};
	context.beginDecode('bengaluru mail nebula flower', candidate().metadata);
	assert.deepEqual(calls, ['cleanup', 'bengaluru mail nebula flower']);
});
