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
			classList: {
				values: new Set(), toggle() {},
				add(...names) { names.forEach(name => this.values.add(name)); },
				remove(...names) { names.forEach(name => this.values.delete(name)); }
			},
			getBoundingClientRect() { return {top: 0, height: 20}; },
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
		map: {}, MESSAGE_LOADING: 'Loading', svg_launch: '/launch.svg',
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
	list.children[2].children[2].keydown({key: 'ArrowUp', preventDefault() {}, stopPropagation() {}});
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
		const handle = list.children[0].children[2];
		document.elementFromPoint = () => ({closest: () => list.children[2]});
		handle.pointerdown({button: 0, pointerId: 1, preventDefault() {}});
		handle.pointermove({clientX: 0, clientY: 20});
		assert(list.children[2].classList.values.has('map_place_drop_after'));
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
	const url = new URL(context.getMapRouteURL(true));
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
	context.mapPlaces = [1, 2].map(lat => ({marker: place(lat), routeCode: 'test_city.word' + lat + '.two.three'}));
	let copied, shared;
	context.copyPlainText = value => { copied = value; };
	context.showNotification = () => {};
	context.shareMapRoute();
	assert.equal(copied, context.getMapRouteURL());
	context.navigator.share = data => { shared = data; return Promise.resolve(); };
	context.shareMapRoute();
	assert.equal(shared.url, copied);
	context.shareMapRoute(true);
	assert.equal(shared.url, context.getMapRouteURL(true));
	assert.notEqual(shared.url, copied);
});


test('place labels continue from Z to AA, AZ, BA, ZZ and AAA', () => {
	const {context} = loadMap();
	for(const [index, label] of [[0,'A'], [25,'Z'], [26,'AA'], [51,'AZ'], [52,'BA'], [701,'ZZ'], [702,'AAA']])
		assert.equal(context.getMapPlaceLabel(index), label);
});

test('row remove control removes its marker and refreshes letters and route order', () => {
	const {context, document, place} = loadMap();
	context.mapPlaces = [1, 2, 3].map(lat => ({marker: place(lat), name: 'nepal words ' + lat}));
	const removed = context.mapPlaces[1].marker;
	context.renderMapPlaces();
	const list = document.getElementById('map_places_list');
	assert.equal(list.children[2].children[0].children[0].textContent, 'C');
	assert.equal(list.children[0].children[0].children[1].textContent, 'Nepal words 1');
	assert.equal(list.children[0].children[1].className, 'map_place_remove');
	assert.equal(list.children[0].children[2].className, 'map_place_drag');
	list.children[1].children[1].click();
	assert.equal(removed.map, null);
	assert.equal(context.mapPlaces.length, 2);
	assert.equal(list.children[1].children[0].children[0].textContent, 'B');
	assert.equal(new URL(context.getMapRouteURL(true)).searchParams.get('to'), '3,2');
});

function loadRouteCodec(context) {
	for(const file of ['RegionRegistry.js', 'RegionAnchors.js', 'Code/Code.js', 'Code/WordList.js'])
		vm.runInContext(fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root', file), 'utf8'), context);
	const words = JSON.parse(fs.readFileSync(path.join(__dirname, '../../Root/Files/offline-data/WordList.json'), 'utf8'));
	context.wordList = new context.WordList(words);
	context.getCityFromName = (groups, name, callback, failure) => {
		const anchor = context.regionAnchorFromName(groups.concat(name).join(' '));
		anchor ? callback(anchor) : failure();
	};
	context.getCityCenterFromId = (city, callback) => callback(city);
}

test('regional Wolo route URLs preserve all stops within codec precision without changing active card', async () => {
	const {context, place, show} = loadMap();
	loadRouteCodec(context);
	show(1);
	const active = context.infoWindow;
	context.mapPlaces = [1, 3, 2].map(lat => ({marker: place(lat)}));
	const url = new URL(context.getMapRouteURL());
	assert(!url.searchParams.get('from').includes(','));
	const restored = await Promise.all(['from','via','to'].map(key => context.resolveMapRouteCode(url.searchParams.get(key))));
	for(const [index, lat] of [1,3,2].entries()) {
		assert(Math.abs(restored[index].position.lat - lat) < .00002);
		assert(Math.abs(restored[index].position.lng - 2) < .00002);
	}
	assert.equal(context.infoWindow, active);
	await assert.rejects(context.resolveMapRouteCode('unknown.bad.bad.bad'));
});

test('city Wolo route codes keep the full reference when sharing and resolving', async () => {
	const {context, place} = loadMap();
	loadRouteCodec(context);
	const city = {country:'Nepal', name_id:'kathmandu', center:{lat:27.7172,lng:85.324}};
	const data = context.encode__(context.getWoloAnchorBegin(city), city.center);
	const code = ['nepal', 'bagmati', 'kathmandu'].concat(Array.from(data, i => context.wordList.getWord(i))).join('.');
	context.mapPlaces = [1,2].map(lat => ({marker:place(lat), routeCode:code}));
	assert.equal(new URL(context.getMapRouteURL()).searchParams.get('from'), code);
	context.getCityFromName = (groups, name, callback) => {
		assert.deepEqual(Array.from(groups), ['nepal','bagmati']);
		assert.equal(name, 'kathmandu');
		callback(city);
	};
	const result = await context.resolveMapRouteCode(code);
	assert(Math.abs(result.position.lat - city.center.lat) < .00002);
	assert(Math.abs(result.position.lng - city.center.lng) < .00002);
});


test('Wolo route restoration waits for the word list and adds no partial route for a bad stop', async () => {
	const {context, place} = loadMap();
	loadRouteCodec(context);
	context.mapPlaces = [1,2].map(lat => ({marker:place(lat)}));
	const url = new URL(context.getMapRouteURL());
	context.mapPlaces = [];
	context.window.location.search = url.search;
	context.activateMapType = () => {};
	context.map.fitBounds = () => {};
	context.google.maps.LatLngBounds = class { extend() {} };
	context.google.maps.Marker = class {
		constructor(options) { this.options = options; }
		addListener() {}
		getPosition() { return {lat: () => this.options.position.lat, lng: () => this.options.position.lng}; }
	};
	let ready;
	context.offlineWordListReady = new Promise(resolve => {ready = resolve;});
	assert.equal(context.restoreMapRoute(), true);
	assert.equal(context.mapPlaces.length, 0);
	ready();
	await new Promise(setImmediate);
	assert.equal(context.mapPlaces.length, 2);
	assert.equal(context.getMapRouteURL(), url.href);
	context.mapPlaces = [];
	context.window.location.search = url.search + '&via=bad.unknown.words.code';
	let notification;
	context.showNotification = value => {notification = value;};
	context.restoreMapRoute();
	await new Promise(setImmediate);
	assert.equal(context.mapPlaces.length, 0);
	assert.match(notification, /Could not open this route/);
});


test('the drop line chooses the boundary before or after a row', () => {
	for(const [y, expected, indicator] of [[1, [3,1,2], 'map_place_drop_before'], [19, [1,3,2], 'map_place_drop_after']]) {
		const {context, document, place} = loadMap();
		context.mapPlaces = [1,2,3].map(lat => ({marker:place(lat)}));
		context.renderMapPlaces();
		const list = document.getElementById('map_places_list');
		const row = list.children[0];
		document.elementFromPoint = () => ({closest: () => row});
		const handle = list.children[2].children[2];
		assert.equal(handle.textContent, '=');
		handle.pointerdown({button:0, pointerId:1, preventDefault() {}});
		handle.pointermove({clientX:0, clientY:y});
		assert(row.classList.values.has(indicator));
		handle.pointerup({type:'pointerup', pointerId:1});
		assert.deepEqual(Array.from(context.mapPlaces, entry => Number(entry.marker.getPosition().lat())), expected);
	}
});

test('the address box tracks alphabetic indices through reorder and removal', () => {
	const {context, document, show} = loadMap();
	const first = show(1);
	context.retainActiveMapCard();
	const second = show(2);
	context.syncMapPlaceIndices();
	assert.equal(document.getElementById('address_text_place_index').textContent, 'B');
	const active = context.getMapPlace(context.marker);
	context.moveMapPlace(active, 0);
	assert.equal(document.getElementById('address_text_place_index').textContent, 'A');
	context.removeMapPlace(active);
	assert.equal(document.getElementById('address_text_place_index').hidden, true);
});

test('map touch hold keeps the previous card and cancels on movement', () => {
 const {context, show} = loadMap();
 const listeners = {};
 let timer;
 context.setTimeout = fn => { timer = fn; return 1; };
 context.clearTimeout = () => { timer = null; };
 context.map = {getDiv: () => ({addEventListener: (name, fn) => {listeners[name] = fn;}, getBoundingClientRect: () => ({left: 10, top: 20})}), addListener() {}};
 context.google.maps.Point = function(x, y) {this.x = x; this.y = y;};
 context.google.maps.OverlayView = function() {this.setMap = () => {}; this.getProjection = () => ({fromContainerPixelToLatLng: p => p});};
 context.resolveLatLng = p => p;
 context.focus___ = context.getAddress = () => {};
 let position;
 context.encode = p => {position = p; show(2);};
 const first = show(1);
 context.setupMapTouchHold();
 // Go is a custom div, and touches can target its nested SVG or caption.
 for (const blocked of ['#map_search_cluster', '.control']) {
  const control = {matches: selector => selector.split(', ').includes(blocked)};
  const event = {touches: [{clientX: 110, clientY: 220}], composedPath: () => [{matches: () => false}, control]};
  listeners.touchstart(event);
  assert.equal(timer, null, blocked + ' must not start a map hold');
  assert.equal(context.isIgnorableMapClick({domEvent: event}), true);
  assert.equal(context.infoWindow, first);
 }
 const touch = x => ({touches: [{clientX: x, clientY: 220}]});
 listeners.touchstart(touch(110));
 timer();
 assert.equal(position.x, 100);
 assert.equal(position.y, 200);
 assert.equal(first.isOpen, true);
 assert.notEqual(context.infoWindow, first);
 assert.equal(context.isIgnorableMapClick({}), true);
 listeners.touchstart(touch(110));
 listeners.touchmove(touch(140));
 assert.equal(timer, null);
 listeners.touchstart(touch(110));
 listeners.touchstart({touches: [{}, {}]});
 assert.equal(timer, null);
 listeners.touchstart(touch(110));
 listeners.touchcancel();
 assert.equal(timer, null);
});

test('holding Go adds a card and the release click does not replace either marker', () => {
 const {context, document, show} = loadMap();
 const source = fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root/Map.js'), 'utf8');
 assert.match(source, /addLongpressListener\(document.getElementById\('decode_button'\), decode_input_from_map, decode_input_from_map_add\)/);
 vm.runInContext(fs.readFileSync(path.join(__dirname, '../../Root/JS/Base/LongPress.js'), 'utf8'), context);
 let hold;
 context.setTimeout = fn => {hold = fn; return 1;};
 const go = document.getElementById('decode_button');
 context.addLongpressListener(go, context.decode_input_from_map, context.decode_input_from_map_add);
 const first = show(1);
 document.getElementById('pac-input').value = 'one two three';
 let decodes = 0;
 context.decode = () => {decodes++; show(2);};
 go.touchstart({type: 'touchstart'});
 hold();
 const second = context.infoWindow;
 go.touchend({type: 'touchend'});
 go.click({type: 'click'});
 assert.equal(decodes, 1);
 assert.notEqual(first, second);
 assert.equal(first.isOpen, true);
 assert.equal(first.anchor.getTitle(), 'Place 1');
 assert.equal(second.isOpen, true);
 assert.equal(second.anchor.getTitle(), 'Place 2');
 assert.equal(context.initWCode_jumpToMap, false);
 assert.equal(document.getElementById('map_places_toggle').hidden, false);
});
