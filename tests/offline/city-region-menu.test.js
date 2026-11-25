'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const read = file => fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root', file), 'utf8');

function node() {
	return {
		children: [], listeners: {}, attributes: {}, value: '',
		set textContent(value) { this.children = []; this.text = value; },
		get textContent() { return this.text; },
		set innerHTML(value) { this.textContent = value.replace(/<[^>]*>/g, ''); },
		appendChild(child) { this.children.push(child); },
		setAttribute(key, value) { this.attributes[key] = value; },
		addEventListener(name, callback) { this.listeners[name] = callback; },
		click() { this.listeners.click(); },
		focus() { this.focused = true; },
		setSelectionRange(start, end) { this.selection = [start, end]; },
		dispatchEvent() {}
	};
}

function runtime(mode = 'nearby') {
	const nodes = {}, events = [], requests = [];
	const referenceHint = node();
	const referenceInfo = { querySelector: selector => selector === '.city_region_reference_hint' ? referenceHint : null };
	const dialog = { querySelector: selector => selector === '.city_region_reference_info' ? referenceInfo : null };
	const tabs = { querySelector: selector => selector };
	const picker = { querySelector: () => tabs, closest: () => dialog };
	nodes[mode + '_region_menu'] = picker;
	function panel() {
		const parts = {};
		for(const name of ['search', 'defaults', 'search_results', 'search_status'])
			parts['.city_region_' + name] = node();
		parts['.city_region_defaults .city_region_list'] = node();
		parts['.choose_city_message_list'] = { children: [{}] };
		return { parts, querySelector: key => parts[key] };
	}
	const city = nodes[mode + '_city_panel'] = panel();
	const region = nodes[mode + '_region_panel'] = panel();
	const input = nodes.decode_input = node();
	const api = {
		document: { createElement: node, getElementById: id => nodes[id] },
		code_postition: { lat: 28.21, lng: 83.99 }, code_city: null,
		selected_decode_city: null, chooseCityCodeWords: null, encode_session_id: Symbol(),
		hideChooseCity_by_periphery_Message() { events.push('close-nearby'); },
		hideChooseCityMessage() { events.push('close-matching'); },
		hideDecodeCityHistoryMessage() { events.push('close-history'); },
		encode_(anchor, position) { events.push({ encoded: anchor, position }); },
		setDecodeCity(anchor) { events.push({ selected: anchor }); },
		focusSelectedDecodeCityOnMap(anchor) { events.push({ focused: anchor }); },
		isDecodeView: () => false,
		isOfflineMode: () => false,
		toggleDecodeView: () => events.push('open-input'),
		popLoader: () => events.push('pop-loader'),
		Event, setTimeout, clearTimeout,
		wordList: ['one', 'two', 'three'],
		showNotification: message => events.push(message),
		bindCityRegionTabs: () => selected => { picker.activeTab = selected; },
		getDecodeCityHistory: () => [],
		getVisibleOverlayDialog: () => dialog,
		normalizeCityLookupToken: value => value.toLowerCase(),
		getCitiesFromNameId: (query, callback) => requests.push({query, callback}),
		getCityCenterFromId: (city, callback) => callback({...city, center: {lat: 1, lng: 2}}),
		cityCoversPosition: () => false,
		renderCityChoices: (container, rows) => { container.rows = rows; }
	};
	vm.createContext(api);
	for(const file of ['RegionRegistry.js', 'CountryRegistry.js', 'RegionAnchors.js', 'CityRegionMenu.js'])
		vm.runInContext(read(file), api);
	function search(panel, value) {
		const field = panel.parts['.city_region_search'];
		field.value = value;
		field.oninput();
		return panel.parts['.city_region_search_results'];
	}
	return {api, picker, city, region, input, events, requests, search};
}

test('map picker opens on the active region and selects a covering region without moving the pin', () => {
	const {api, picker, region, events, search} = runtime();
	api.code_city = api.regionAnchorsForPosition(api.code_postition).at(-1).anchor;
	api.renderCityRegionMenu('nearby', 'nearby');
	assert.equal(picker.activeTab, 'button:last-child');
	const defaults = region.parts['.city_region_defaults .city_region_list'];
	assert.equal(defaults.children.filter(button => button.attributes['aria-current'] === 'true').length, 1);

	const results = search(region, 'NPL');
	const nepal = results.children.find(button => /^Nepal /.test(button.textContent));
	assert.ok(nepal);
	nepal.click();
	assert.equal(events[1].encoded.id.split(':')[2], 'country-npl');
	assert.equal(events[1].position.lat, 28.21);
});

test('selecting a region outside the pin opens Wolo Code Input with the index position focused', () => {
	const {api, region, input, events, search} = runtime();
	input.value = 'Kathmandu one two three';
	api.renderCityRegionMenu('nearby', 'nearby');
	search(region, 'Iceland').children[0].click();
	assert.deepEqual(events.slice(0, 2), ['close-nearby', 'open-input']);
	assert.equal(input.value, 'Iceland  one two three');
	assert.deepEqual(input.selection, [8, 8]);
	assert.equal(input.focused, true);
});

test('matching-name resolution preserves its three code words when switching to a region', () => {
	const {api, region, input, events, search} = runtime('matching');
	api.chooseCityCodeWords = ['one', 'two', 'three'];
	api.renderCityRegionMenu('matching', 'matching');
	const nepal = search(region, 'Nepal').children.find(button => button.textContent === 'Nepal');
	assert.ok(nepal);
	nepal.click();
	assert.deepEqual(events.slice(0, 3), ['close-matching', 'pop-loader', 'open-input']);
	assert.equal(input.value, 'Nepal  one two three');
});

test('city search ignores stale results and selects the registered city with its resolved center', async () => {
	const {api, city, events, requests, search} = runtime('history');
	api.isDecodeView = () => true;
	api.renderCityRegionMenu('history', 'history');
	const results = search(city, 'Ka');
	await new Promise(resolve => setTimeout(resolve, 220));
	search(city, 'Pok');
	await new Promise(resolve => setTimeout(resolve, 220));
	assert.deepEqual(requests.map(request => request.query), ['ka', 'pok']);
	requests[1].callback({pkr: {name: 'Pokhara'}});
	requests[0].callback({ktm: {name: 'Kathmandu'}});
	assert.equal(results.rows[0].city.name, 'Pokhara');
	results.rows[0].select();
	assert.equal(events[1].selected.id, 'pkr');
	assert.equal(events[1].selected.center.lat, 1);
});

test('city searches share requests and reuse complete prefixes across picker openings', () => {
	const {api, requests} = runtime();
	const results = [];
	const render = (matches, error) => results.push({matches, error});
	const immediate = load => load();

	api.lookupCityRegionCities('Po', render, immediate);
	api.lookupCityRegionCities('PO', render, immediate);
	assert.equal(requests.length, 1);
	requests[0].callback({pkr: {name_id: 'pokhara'}, por: {name_id: 'porto'}});
	assert.equal(results.length, 2);

	api.lookupCityRegionCities('Pok', render, () => assert.fail('Cached prefix should render immediately'));
	assert.deepEqual(Object.keys(results.at(-1).matches), ['pkr']);
	api.lookupCityRegionCities('Po', render, () => assert.fail('Cached query should render immediately'));
	assert.deepEqual(Object.keys(results.at(-1).matches), ['pkr', 'por']);
});

test('city search keeps offline and online caches separate and retries failed queries', () => {
	const {api, requests} = runtime();
	const render = () => {};
	const immediate = load => load();
	api.lookupCityRegionCities('Ka', render, immediate);
	requests[0].callback(null, true);
	api.lookupCityRegionCities('Ka', render, immediate);
	requests[1].callback({ktm: {name_id: 'kathmandu'}});
	api.isOfflineMode = () => true;
	api.lookupCityRegionCities('Ka', render, immediate);
	assert.equal(requests.length, 3);
});

test('city search does not reuse a broad result set that reached the query limit', () => {
	const {api, requests} = runtime();
	const immediate = load => load();
	api.lookupCityRegionCities('Po', () => {}, immediate);
	requests[0].callback(Object.fromEntries(Array.from({length: 10}, (_, i) => [i, {name_id: 'porto ' + i}])));
	api.lookupCityRegionCities('Pok', () => {}, immediate);
	assert.deepEqual(requests.map(request => request.query), ['po', 'pok']);
});

test('empty previous-city menus remain enabled and still open the searchable picker', () => {
	const {api} = runtime('history');
	vm.runInContext(read('City.js'), api);
	const toggles = [node(), node()];
	toggles.forEach(toggle => { toggle.classList = { add() {}, remove() {} }; });
	api.getDecodeCityHistory = () => [];
	api.getDecodeCityHistoryToggles = () => toggles;
	api.syncDecodeCityHistoryControl();
	assert(toggles.every(toggle => toggle.disabled === false));
	let rendered = false, opened = false;
	api.initDecodeCityHistoryDeleteControls = () => {};
	api.hideDecodeCityHistoryDeletePrompt = () => {};
	api.renderDecodeCityHistoryList = () => {};
	api.renderCityRegionMenu = id => { rendered = id === 'history'; };
	api.showOverlay = () => { opened = true; };
	api.showDecodeCityHistoryMessage();
	assert(rendered && opened);
});

test('nearby picker highlights a selected city without changing its position', () => {
	const {api} = runtime();
	vm.runInContext(read('ChooseCity_by_periphery.js'), api);
	const first = {id: '1', gp_id: 'first'};
	const second = {id: '2', gp_id: 'second'};
	api.chooseCity_by_periphery_gpid = [{city: {gp_id: 'second'}}];
	api.chooseCity_by_periphery_List = [{city: first}, {city: second}];
	let choices;
	api.renderCityChoices = (_, rows) => { choices = rows; };
	api.code_city = first;
	api.showChooseCity_by_periphery_List();
	assert.deepEqual(Array.from(choices, choice => choice.status), ['Nearby', 'Current']);
	api.code_city = second;
	api.showChooseCity_by_periphery_List();
	assert.deepEqual(Array.from(choices, choice => choice.status), ['Current', 'Nearby']);
});

test('history picker retains active tab and selected item when reopening with a chosen region or city', () => {
	const {api, picker, region} = runtime('history');
	const nepalAnchor = api.regionAnchorFromId('region:v1:country-npl:35');
	assert.ok(nepalAnchor);

	// Select a region in history
	api.selected_decode_city = nepalAnchor;
	api.getDecodeCityHistory = () => [nepalAnchor];
	api.renderCityRegionMenu('history', 'history');
	assert.equal(picker.activeTab, 'button:last-child');

	// Select a city in history
	const city = { id: 'ktm', name: 'Kathmandu' };
	api.selected_decode_city = city;
	api.getDecodeCityHistory = () => [city];
	api.renderCityRegionMenu('history', 'history');
	assert.equal(picker.activeTab, 'button:first-child');
});

test('selecting a region in history mode focuses the map without re-encoding marker position', () => {
	const {api, events} = runtime('history');
	const nepalAnchor = api.regionAnchorFromId('region:v1:country-npl:35');

	api.useCityMenuRegion(nepalAnchor, 'history', api.code_postition);
	assert.equal(events.some(e => e.encoded), false);
	assert.equal(events.some(e => e.selected && e.selected.id === nepalAnchor.id), true);
	assert.equal(events.some(e => e.focused && e.focused.id === nepalAnchor.id), true);
});

test('city and region selector markup defines City and Region tabs and lighter gray underline', () => {
	const php = fs.readFileSync(path.join(__dirname, '../../Root/HTML/Fragment/CityRegionOptions.php'), 'utf8');
	assert.match(php, /><span>City<\/span></);
	assert.match(php, /><span>Region<\/span></);
	assert.doesNotMatch(php, /><span>Cities<\/span></);
	assert.doesNotMatch(php, /><span>Regions<\/span></);

	const css = fs.readFileSync(path.join(__dirname, '../../Root/CSS/Component/Root/Base/Choose_City.css'), 'utf8');
	assert.match(css, /\.city_region_search[\s\S]*?border-bottom:\s*1px\s+solid\s+#ccc;/);
});

test('city and region tabs have equal bottom padding to modal window edge', () => {
	const css = fs.readFileSync(path.join(__dirname, '../../Root/CSS/Component/Root/Base/Choose_City.css'), 'utf8');
	assert.doesNotMatch(css, /\.city_region_list\s*\{[^}]*margin-block-end/);
	assert.match(css, /\.city_region_list:empty\s*\{\s*display:\s*none;\s*\}/);
	assert.match(css, /#decode_region_history_message_list:not\(:empty\):has\(\+\s*\.city_region_list:not\(:empty\)\)/);
});
