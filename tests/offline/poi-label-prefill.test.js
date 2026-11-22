'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.join(__dirname, '../..');

function read(relPath) {
	return fs.readFileSync(path.join(repoRoot, relPath), 'utf8');
}

function loadPoiLabelApi() {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const start = mapJs.indexOf('function getPlaceSubpremise(');
	const end = mapJs.indexOf('var mapFitPlacesSelectionVersion');
	assert.ok(start >= 0 && end > start, 'poi label helpers should live in Map.js');
	const headings = [];
	const context = vm.createContext({
		mapSelectionVersion: 2,
		current_title: null,
		current_segment: null,
		poiPlace: null,
		setAddressPanelHeading(title, segment) {
			headings.push({ title, segment });
		},
		getAddressPanel() {
			return { classList: { contains(name) { return name === 'hide'; } } };
		}
	});
	vm.runInContext(mapJs.slice(start, end), context);
	return { context, headings };
}

test('getPlaceSubpremise reads the Google subpremise component', () => {
	const { context } = loadPoiLabelApi();
	const segment = context.getPlaceSubpremise({
		address_components: [
			{ types: ['subpremise'], long_name: 'Suite 12B' },
			{ types: ['street_number'], long_name: '12' }
		]
	});
	assert.equal(segment, 'Suite 12B');
});

test('attachMapPoiPlace fills title and segment when empty and skips stale selections', () => {
	const { context, headings } = loadPoiLabelApi();
	const place = {
		name: 'MG Road Cafe',
		address_components: [{ types: ['subpremise'], long_name: 'Floor 2' }]
	};
	context.attachMapPoiPlace(place, 2);
	assert.equal(context.current_title, 'MG Road Cafe');
	assert.equal(context.current_segment, 'Floor 2');
	assert.equal(headings.length, 0);

	context.current_title = 'Saved home';
	context.current_segment = 'Gate A';
	context.attachMapPoiPlace({ name: 'Another Place' }, 2);
	assert.equal(context.current_title, 'Saved home');
	assert.equal(context.current_segment, 'Gate A');
	assert.equal(context.poiPlace.name, 'Another Place');

	context.current_title = null;
	context.current_segment = null;
	context.mapSelectionVersion = 3;
	context.attachMapPoiPlace(place, 2);
	assert.equal(context.current_title, null);
	assert.equal(context.poiPlace.name, 'Another Place');
});

test('map search and handlers wire poi place prefill', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const clickHandler = read('Root/JS/ClickHandler.js');
	const qrJs = read('Root/JS/Component/Root/QR.js');
	assert.match(mapJs, /findPlaceFromQuery\(\{query: query, fields: \['name', 'geometry', 'formatted_address', 'address_components'\]/);
	assert.match(mapJs, /attachMapPoiPlace\(places\[0\], mapSelectionVersion\)/);
	assert.match(mapJs, /place: place, result: true/);
	assert.match(mapJs, /if\(entry\.place\)\s*attachMapPoiPlace\(entry\.place, mapSelectionVersion\)/);
	assert.match(mapJs, /poiPlace = null/);
	assert.match(clickHandler, /fields: \['name', 'formatted_address', 'address_components'\]/);
	assert.match(clickHandler, /attachMapPoiPlace\(place, selectionVersion\)/);
	assert.match(qrJs, /applyPoiPlaceLabelPrefill\(\)/);
});

test('showQR reads poi place labels after prefill', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const helperStart = mapJs.indexOf('function getPlaceSubpremise(');
	const helperEnd = mapJs.indexOf('var mapFitPlacesSelectionVersion');
	const fields = {};
	for (const id of ['qr_title_main', 'qr_title_segment', 'qr_address', 'qr_address_line_2', 'qr_address_preview', 'qr_address_fields', 'qr_address_split_toggle', 'qr_wcode_city', 'qr_wcode_code', 'copy_wcode_message', 'qr_container']) {
		fields[id] = {
			value: '', innerText: '', hidden: false, attributes: {},
			classList: { toggle() {}, add() {}, remove() {} },
			setAttribute(name, value) { this.attributes[name] = value; }
		};
	}
	const context = vm.createContext({
		mapSelectionVersion: 1,
		current_title: null,
		current_segment: null,
		poiPlace: {
			name: 'Central Mall',
			address_components: [{ types: ['subpremise'], long_name: 'Shop 4' }]
		},
		current_address: '',
		current_address_lines: null,
		address: '1 Main St',
		code_city: { name: 'City' },
		code_wcode: ['a', 'b', 'c'],
		document: { getElementById: id => fields[id] || null },
		window: { addEventListener() {}, removeEventListener() {} },
		getProperCityAccent: city => city.name,
		hideOverlay() {},
		showOverlay() {},
		readSavedAddressLines(value) {
			return {
				address_line_1: String(value.address || value.address_line_1 || ''),
				address_line_2: value.address_line_2 || ''
			};
		},
		formatSavedAddress() { return ''; },
		qr_address_active_first: true,
		updateQRBookmarkStatus() {},
		setAddressPanelHeading() {},
		getAddressPanel() {
			return { classList: { contains() { return true; } } };
		}
	});
	vm.runInContext(mapJs.slice(helperStart, helperEnd), context);
	vm.runInContext(read('Root/JS/Component/Root/QR.js'), context);
	context.showQR();
	assert.equal(fields.qr_title_main.value, 'Central Mall');
	assert.equal(fields.qr_title_segment.value, 'Shop 4');
});