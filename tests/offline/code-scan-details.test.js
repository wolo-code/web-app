'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const matcher = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
const keys = ['title', 'segment', 'address_line_1', 'address_line_2'];

function scanner() {
	const nodes = {};
	for(const id of ['code_scan_details', 'code_scan_heading_details', 'code_scan_details_toggle', 'decode_input', 'pac-input', ...keys.map(key => 'code_scan_' + key)])
		nodes[id] = { value: '', hidden: true, attributes: {}, focus() { this.focused = true; }, setAttribute(name, value) { this.attributes[name] = value; } };
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

test('recognized details stay collapsed initially and can expand without discarding edits', () => {
	const { context, nodes } = scanner();
	context.populateCodeScanMetadata(candidate());
	assert.equal(nodes.code_scan_details_toggle.attributes['aria-expanded'], 'false');
	assert.equal(nodes.code_scan_details.hidden, true);
	assert.equal(nodes.code_scan_heading_details.hidden, true);
	assert.equal(nodes.code_scan_title.value, 'Ram');
	assert.equal(nodes.code_scan_segment.value, 'Main door');
	assert.equal(nodes.code_scan_address_line_1.value, '12 MG Road');
	assert.equal(nodes.code_scan_address_line_2.value, 'Flat 4B, second floor');
	context.toggleCodeScanDetails();
	assert.equal(nodes.code_scan_details.hidden, false);
	assert.equal(nodes.code_scan_heading_details.hidden, false);
	assert.equal(nodes.code_scan_details_toggle.attributes['aria-expanded'], 'true');
	context.editCodeScanMetadata('address_line_2', 'Side entrance');
	context.toggleCodeScanDetails();
	assert.equal(nodes.code_scan_details.hidden, true);
	assert.equal(nodes.code_scan_heading_details.hidden, true);
	assert.equal(nodes.code_scan_details_toggle.attributes['aria-expanded'], 'false');
	assert.equal(context.codeScanState.reviewMetadata.address, '12 MG Road\n\nSide entrance');
});

test('new OCR of the same card preserves edited fields including deliberate clearing', () => {
	const { context, nodes } = scanner();
	const first = candidate();
	context.populateCodeScanMetadata(first);
	context.codeScanState.reviewMatch = first;
	context.toggleCodeScanDetails();
	context.editCodeScanMetadata('title', 'Office');
	context.editCodeScanMetadata('segment', '');
	const next = candidate(); next.metadata.address_line_1 = 'Corrected OCR address';
	context.populateCodeScanMetadata(next);
	assert.equal(next.metadata.title, 'Office');
	assert.equal(next.metadata.segment, '');
	assert.equal(next.metadata.address_line_1, 'Corrected OCR address');
	assert.equal(nodes.code_scan_details.hidden, false);
});

test('a different code or card clears edits and keeps details collapsed initially', () => {
	for(const change of ['code', 'position']) {
		const { context, nodes } = scanner();
		const first = candidate();
		context.populateCodeScanMetadata(first); context.codeScanState.reviewMatch = first;
		context.toggleCodeScanDetails();
		context.editCodeScanMetadata('title', 'Office');
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

test('scanner carries the expanded address state through cleanup for both entry points', () => {
	for(const source of ['map', 'decode']) for(const expanded of [false, true]) {
		const { context, nodes } = scanner();
		context.populateCodeScanMetadata(candidate());
		context.setCodeScanDetailsExpanded(expanded);
		context.codeScanState.source = source;
		context.stopCodeScan = () => context.resetCodeScanDetails();
		context.hideOverlay = () => {};
		let applied;
		context.beginDecode = (code, metadata, options) => applied = { metadata, options };
		context.applyScannedWoloCode('bengaluru mail nebula flower');
		assert.equal(applied.options.showAddress, expanded);
		assert.equal(applied.metadata.address_line_1, '12 MG Road');
		assert.equal(nodes.code_scan_details.hidden, true);
	}
});

test('expanded scanner with unreadable metadata still requests an open address panel', () => {
	const { context } = scanner();
	context.populateCodeScanMetadata(null);
	context.setCodeScanDetailsExpanded(true);
	context.stopCodeScan = () => context.resetCodeScanDetails();
	context.hideOverlay = () => {};
	let options;
	context.beginDecode = (code, metadata, passed) => options = passed;
	context.applyScannedWoloCode('bengaluru mail nebula flower');
	assert.equal(options.showAddress, true);
});

function savingScanner() {
	const api = scanner();
	const { context } = api;
	context.populateCodeScanMetadata(candidate());
	context.codeScanState.active = true;
	context.codeScanState.phase = 'review';
	context.getCodeScanReviewCode = () => 'bengaluru mail nebula flower';
	context.updateCodeScanReviewValidity = () => {};
	context.showNotification = text => api.notification = text;
	context.saveAddress = (...args) => api.saved = args;
	return api;
}

test('scanner saves reviewed city, words and edited fields without decoding or closing', () => {
	const api = savingScanner();
	const { context, nodes } = api;
	const city = { id: 'scanned-city', name: 'Bengaluru' };
	context.editCodeScanMetadata('segment', ' Side entrance ');
	context.getCityFromName = (group, name, resolve) => {
		assert.equal(name, 'bengaluru'); resolve(city);
	};
	context.saveCodeScanReview();
	assert.equal(api.saved[0], 'Ram');
	assert.equal(api.saved[1], 'Side entrance');
	assert.equal(api.saved[2].address_line_1, '12 MG Road');
	assert.equal(api.saved[2].address_line_2, 'Flat 4B, second floor');
	assert.equal(api.saved[4].city, city);
	assert.equal(api.saved[4].code.join(' '), 'mail nebula flower');
	assert.equal(context.codeScanState.active, true);
	assert.equal(nodes.code_scan_title.value, 'Ram');
});

test('scanner save requires a title and reveals the heading for entry', () => {
	const api = savingScanner();
	api.context.editCodeScanMetadata('title', '  ');
	api.context.saveCodeScanReview();
	assert.equal(api.saved, undefined);
	assert.equal(api.notification, 'Title is required');
	assert.equal(api.nodes.code_scan_heading_details.hidden, false);
	assert.equal(api.nodes.code_scan_title.focused, true);
});

test('scanner save uses the selected city when review city is blank', () => {
	const api = savingScanner();
	api.context.getCodeScanReviewCode = () => 'mail nebula flower';
	api.context.selected_decode_city = { id: 'selected-city' };
	api.context.saveCodeScanReview();
	assert.equal(api.saved[4].city.id, 'selected-city');
});

test('scanner save recovers after city lookup fails and ignores a cancelled lookup', () => {
	for(const cancelled of [false, true]) {
		const api = savingScanner(); let resolve, reject;
		api.context.getCityFromName = (group, name, done, failed) => { resolve = done; reject = failed; };
		api.context.saveCodeScanReview();
		assert.equal(api.context.codeScanState.saving, true);
		if(cancelled) {
			api.context.resetCodeScanDetails();
			resolve({ id: 'city' });
		} else reject();
		assert.equal(api.context.codeScanState.saving, false);
		assert.equal(api.saved, undefined);
		if(!cancelled) assert.match(api.notification, /city/);
	}
});

test('decode restores the requested address state after cleanup', () => {
	for(const expanded of [false, true]) {
		const context = { document: { getElementById: () => null } };
		vm.createContext(context);
		vm.runInContext(fs.readFileSync('Root/JS/Component/Root/Map.js', 'utf8'), context);
		context.cleanUp = () => context.keepAddressPanelOpen = false;
		context.addClassIfPresent = () => {};
		context.formatSavedAddress = lines => lines.address_line_1;
		context.execDecode = () => {
			assert.equal(context.keepAddressPanelOpen, expanded);
			if(expanded) assert.equal(context.address, '12 MG Road');
		};
		context.beginDecode('bengaluru mail nebula flower', candidate().metadata, { showAddress: expanded });
	}
});

test('decoded coordinate opens the requested address panel before reverse geocoding finishes', () => {
	const context = { keepAddressPanelOpen: true, initWCode_jumpToMap: false, initWCode_jump_ask: false };
	vm.createContext(context);
	vm.runInContext(fs.readFileSync('Root/JS/Component/Root/Code/Code.js', 'utf8'), context);
	let opened = false;
	const position = { lat: 12, lng: 77 };
	context.getAddress = () => {};
	context.focus__ = () => {};
	context.showAddress = () => { opened = true; assert.equal(context.latLng_p, position); };
	context.setCodeCoord({}, position, ['mail', 'nebula', 'flower']);
	assert.equal(opened, true);
});

test('reverse geocoding preserves the scanned address and open infocard', () => {
	let finishGeocoding;
	const context = {
		google: { maps: { Geocoder: function() { this.geocode = (query, done) => finishGeocoding = done; } } },
		document: { getElementById: () => null }, setTimeout, clearTimeout,
		current_address_lines: candidate().metadata, current_title: 'Ram', keepAddressPanelOpen: true,
		pendingCitySubmit: false, extractPlusCodeFromGeocode: () => null, getPlusCodeForPosition: () => null,
		getCity_by_address_list() {}, getCityGpId: () => null, setCurrentCity_status() {}, refreshAddressCodes() {},
		formatSavedAddress: lines => [lines.address_line_1, lines.address_line_2].join('\n'), console
	};
	vm.createContext(context);
	vm.runInContext(fs.readFileSync('Root/JS/Component/Root/Address.js', 'utf8'), context);
	context.refreshAddressCodes = () => {};
	let opened = 0;
	context.showAddress = () => opened++;
	context.getAddress({ lat: 12, lng: 77 });
	finishGeocoding([{ formatted_address: 'Different reverse-geocoded address' }], 'OK');
	assert.equal(context.address, '12 MG Road\nFlat 4B, second floor');
	assert.equal(context.keepAddressPanelOpen, true);
	assert.equal(opened, 1);
});

test('scanner city lookup reports unresolved names without starting decode', async () => {
	const context = {
		isOfflineMode: () => true, findCachedCitiesByNameId: async () => [], showNotification() {},
		decode_continue: () => assert.fail('Scanner save must not start a decode')
	};
	vm.createContext(context);
	vm.runInContext(fs.readFileSync('Root/JS/Component/Root/City.js', 'utf8'), context);
	let failed = false;
	context.getCityFromName(['india', 'karnataka'], 'unlisted', () => assert.fail('No city should match'), () => failed = true);
	await new Promise(resolve => setImmediate(resolve));
	assert.equal(failed, true);
});
