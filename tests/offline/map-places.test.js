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
			classList: { toggle() {} },
			append(child) { this.children.push(child); },
			replaceChildren() { this.children = []; },
			get firstElementChild() { return this.children[0]; },
			addEventListener(name, listener) { this[name] = listener; },
			setAttribute() {},
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
		document, URLSearchParams, google: { maps: { InfoWindow } },
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
	context.renderMapPlaces();

	const list = document.getElementById('map_places_list');
	list.children[2].children[1].click();
	list.children[1].firstElementChild.click();
	assert.equal(focused, 3);
	const [link] = document.getElementById('map_places_directions').children;
	const url = new URL(link.href);
	assert.equal(url.pathname, '/maps/dir/');
	assert.equal(url.searchParams.get('origin'), '1,2');
	assert.equal(url.searchParams.get('waypoints'), '3,2');
	assert.equal(url.searchParams.get('destination'), '2,2');
});
