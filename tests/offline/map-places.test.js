'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function loadMap() {
	const elements = new Map();
	function element() {
		return {
			children: [],
			classList: { toggle() {}, add() {}, remove() {} },
			append(child) { this.children.push(child); },
			replaceChildren() { this.children = []; },
			get firstElementChild() { return this.children[0]; },
			addEventListener(name, listener) { this[name] = listener; },
			setAttribute() {},
			removeEventListener(name) { delete this[name]; },
			setPointerCapture() {}, hasPointerCapture() { return true; }, releasePointerCapture() {},
			focus() {},
			blur() {}
		};
	}
	class InfoWindow {
		addListener(name, listener) { this[name + 'Listener'] = listener; }
		open({anchor}) { this.anchor = anchor; this.isOpen = true; }
		close() { this.isOpen = false; this.closeListener(); }
		setContent(content) { this.content = content; }
		getContent() { return this.content; }
	}
	const document = {
		createElement: element,
		getElementById(id) {
			if (!elements.has(id)) elements.set(id, element());
			return elements.get(id);
		},
		activeElement: element()
	};
	const noop = () => {};
	const context = vm.createContext({
		document, URLSearchParams, window: {location: {origin: 'https://wolo.local', search: ''}}, google: { maps: { InfoWindow } },
		map: {}, MESSAGE_LOADING: 'Loading',
		code_city: null, code_wcode: null, code_postition: null,
		code_plus_code: null, current_title: null, current_segment: null,
		current_address: null, current_address_lines: null, address: null,
		chooseCity_by_periphery_List: null, chooseCity_by_periphery_gpid: null,
		chooseCity_by_periphery_Callback: null,
		stopZoom: noop, clearNotificationTimer: noop, listPressTimer: [],
		clearTimeout: noop, clearLocating: noop, watch_location_timer: null,
		watch_location_id: null, navigator: { geolocation: { clearWatch: noop } },
		addClassIfPresent: noop, clearAddress: noop, hideAddress: noop, clearURL: noop
	});
	for (const file of ['Map.js', 'InfoWindow.js']) {
		const source = fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root', file), 'utf8');
		vm.runInContext(source, context);
	}
	function place(lat) {
		return {
			getTitle: () => 'Place ' + lat,
			getPosition: () => ({ lat: () => lat, lng: () => 2 }),
			setMap(map) { this.map = map; }
		};
	}
	function show(lat) {
		context.marker = place(lat);
		context.infoWindow_setContent('Card ' + lat);
		context.showInfoWindow();
		return context.infoWindow;
	}
	return { context, document, place, show };
}

test('Shift Go preserves the old card and anchor while decoding into a separate card', () => {
	const { context, document, show } = loadMap();
	const first = show(1);
	document.getElementById('pac-input').value = 'one two three';
	context.decode = () => show(2);
	context.decode_input_from_map({ shiftKey: true });

	const second = context.infoWindow;
	assert.notEqual(first, second);
	assert.equal(first.isOpen, true);
	assert.equal(first.getContent(), 'Card 1');
	assert.equal(first.anchor.getTitle(), 'Place 1');
	assert.equal(second.getContent(), 'Card 2');
	assert.equal(document.getElementById('map_places_toggle').hidden, false);

	context.activateMapCard(first);
	assert.equal(context.infoWindow, first);
	assert.equal(second.isOpen, true);
	second.close();
	assert.equal(second.anchor.map, null);
	assert.equal(document.getElementById('map_places_toggle').hidden, true);
});

test('the reordered Places list focuses the correct marker and updates directions', () => {
	const { context, document, place } = loadMap();
	context.mapPlaces = [1, 2, 3].map(lat => ({ marker: place(lat), result: true }));
	let focused;
	context.focus_ = position => { focused = position.lat(); };
	context.focus___ = () => {};
	context.encode = () => {};
	context.renderMapPlaces();

	const list = document.getElementById('map_places_list');
	list.children[2].children[1].keydown({key: 'ArrowUp', preventDefault() {}, stopPropagation() {}});
	list.children[1].firstElementChild.click();
	assert.equal(focused, 3);
	const [link] = document.getElementById('map_places_directions').children;
	const url = new URL(link.href);
	assert.equal(url.pathname, '/maps/dir/');
	assert.equal(url.searchParams.get('origin'), '1,2');
	assert.equal(url.searchParams.get('waypoints'), '3,2');
	assert.equal(url.searchParams.get('destination'), '2,2');
});


test('pointer dragging rearranges places and cancellation preserves order', () => {
	const {context, document, place} = loadMap();
	context.mapPlaces = [1, 2, 3].map(lat => ({marker: place(lat)}));
	context.renderMapPlaces();
	const list = document.getElementById('map_places_list');
	function drag(type) {
		const handle = list.children[0].children[1];
		document.elementFromPoint = () => ({closest: () => list.children[2]});
		handle.pointerdown({button: 0, pointerId: 1, preventDefault() {}});
		handle.pointermove({clientX: 0, clientY: 0});
		handle[type]({type, pointerId: 1});
	}
	drag('pointercancel');
	assert.equal(context.mapPlaces[0].marker.getTitle(), 'Place 1');
	drag('pointerup');
	assert.equal(context.mapPlaces[2].marker.getTitle(), 'Place 1');
});

test('Delete and Backspace remove the selected card but preserve typed text and other cards', () => {
	const {context, document, show} = loadMap();
	const first = show(1);
	context.retainActiveMapCard();
	const second = show(2);
	context.shouldKeepMapSearchFocused = () => true;
	const input = document.getElementById('pac-input');
	input.tagName = 'INPUT';
	document.activeElement = input;
	input.value = 'search';
	context.onMapSearchGlobalKeydown({key: 'Delete'});
	assert.equal(context.mapPlaces.length, 2);
	input.value = '';
	let prevented = false;
	context.onMapSearchGlobalKeydown({key: 'Backspace', preventDefault() {prevented = true;}});
	assert.equal(prevented, true);
	assert.equal(second.isOpen, false);
	assert.equal(first.isOpen, true);
	assert.equal(context.mapPlaces.length, 1);
	context.activateMapCard(first);
	context.onMapSearchGlobalKeydown({key: 'Delete', preventDefault() {}});
	assert.equal(context.mapPlaces.length, 0);
});

test('route URLs round trip every stop in list order and reject invalid coordinates', () => {
	const {context, place} = loadMap();
	context.mapPlaces = [1, 3, 2, 4].map(lat => ({marker: place(lat)}));
	const url = new URL(context.getMapRouteURL());
	assert.equal(url.searchParams.get('from'), '1,2');
	assert.deepEqual(url.searchParams.getAll('via'), ['3,2', '2,2']);
	assert.equal(url.searchParams.get('to'), '4,2');
	context.window.location.search = url.search;
	context.mapPlaces = [];
	const restored = [];
	context.activateMapType = () => {};
	context.map.fitBounds = () => {};
	context.google.maps.LatLngBounds = class { extend() {} };
	context.google.maps.Marker = class {
		constructor(options) { restored.push(options.position); this.options = options; }
		addListener() {}
		getPosition() { return {lat: () => this.options.position.lat, lng: () => this.options.position.lng}; }
	};
	assert.equal(context.restoreMapRoute(), true);
	assert.deepEqual(restored.map(p => p.lat), [1, 3, 2, 4]);
	let invalid;
	context.showNotification = message => { invalid = message; };
	context.window.location.search = '?from=91,2&to=1,2';
	assert.equal(context.restoreMapRoute(), false);
	assert.equal(invalid, 'Invalid route link');
	assert.equal(restored.length, 4);
});

test('route sharing uses native share or copies the complete link', async () => {
	const {context, place} = loadMap();
	context.mapPlaces = [1, 2].map(lat => ({marker: place(lat)}));
	let copied, shared;
	context.copyPlainText = value => { copied = value; };
	context.showNotification = () => {};
	context.shareMapRoute();
	assert.equal(copied, context.getMapRouteURL());
	context.navigator.share = data => { shared = data; return Promise.resolve(); };
	context.shareMapRoute();
	assert.equal(shared.url, copied);
});
