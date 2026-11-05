'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const read = file => fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root', file), 'utf8');

function node(tag = '') {
	const classes = new Set();
	return { tag, children: [], listeners: {}, attributes: {}, value: '',
		classList: { add(c) { classes.add(c); }, remove(c) { classes.delete(c); }, contains(c) { return classes.has(c); }, toggle(c, enabled) { enabled ? classes.add(c) : classes.delete(c); } },
		set textContent(value) { this.children = []; this.text = value; }, get textContent() { return this.text; },
		set innerHTML(value) { this.children = []; this.html = value; this.text = value.replace(/<[^>]*>/g, ''); },
		appendChild(child) { this.children.push(child); if(this.tag === 'select' && this.children.length === 1) this.value = child.value; },
		setAttribute(key, value) { this.attributes[key] = value; },
		addEventListener(name, fn) { this.listeners[name] = fn; },
		reportValidity() { const value = Number(this.value); return !!this.value && Number.isInteger(value) && value >= 1 && value <= Number(this.max); }
	};
}

function runtime() {
	const panels = new Map(), nodes = new Map(), events = [];
	for(const id of ['nearby', 'matching', 'history']) {
		const children = new Map();
		for(const name of ['list', 'manual', 'name', 'index', 'use', 'propose', 'choices', 'manual_open', 'manual_cancel']) children.set('.city_region_' + name, node(name === 'name' ? 'select' : ''));
		const panel = { querySelector: key => children.get(key), children };
		if(id === 'nearby') {
			const manual = children.get('.city_region_manual');
			const form = {};
			manual.querySelector = key => key === 'form' ? form : children.get(key);
			manual.showModal = () => { manual.open = true; };
			manual.close = () => { manual.open = false; };
			const cities = { querySelector: key => children.get(key) };
			panel.parentElement = {
				sections: [cities, panel],
				querySelector: key => key === '.city_region_cities' ? cities : null,
				insertBefore(first, second) { this.sections = [first, second]; }
			};
		}
		panels.set(id + '_region_menu', panel);
	}
	const api = { document: { createElement: node, getElementById(id) { return panels.get(id) || nodes.get(id) || null; } },
		code_postition: { lat: 28.21, lng: 83.99 }, code_city: null,
		hideChooseCity_by_periphery_Message() { events.push('close-nearby'); }, hideChooseCityMessage() { events.push('close-matching'); },
		hideDecodeCityHistoryMessage() { events.push('close-history'); }, showCityProposal() { events.push('propose'); },
		encode_(anchor, position) { events.push({ encoded: anchor, position }); },
		setDecodeCity(anchor) { events.push({ selected: anchor }); }, focusSelectedDecodeCityOnMap() {},
		chooseCityCallback(anchor) { events.push({ resolved: anchor }); }, isDecodeView() { return false; } };
	vm.createContext(api);
	for(const file of ['RegionRegistry.js', 'CountryRegistry.js', 'RegionAnchors.js', 'CityRegionMenu.js']) vm.runInContext(read(file), api);
	return { api, panels, nodes, events };
}

test('each city menu offers regional choices and opens the existing proposal workflow', () => {
	for(const mode of ['nearby', 'matching', 'history']) {
		const r = runtime();
		r.api.renderCityRegionMenu(mode, mode);
		const panel = r.panels.get(mode + '_region_menu');
		if(mode !== 'matching') {
			const button = panel.children.get('.city_region_list').children.find(button => /^Nepal /.test(button.textContent));
			assert(button);
			r.api.code_postition = { lat: 0, lng: 0 };
			button.listeners.click();
			assert.equal(r.events[1].encoded.id.split(':')[2], 'country-npl');
			assert.equal(r.events[1].position.lat, 28.21);
		}
		let stopped = false;
		panel.children.get('.city_region_propose').onclick({ stopPropagation() { stopped = true; } });
		assert(stopped, 'the originating menu click must not dismiss the new proposal dialog');
		assert.deepEqual(r.events.slice(-2), ['close-' + mode, 'propose']);
	}
});

test('manual region/index selection works without a map position and validates bounds', () => {
	const r = runtime();
	r.api.code_postition = null;
	r.api.isDecodeView = () => true;
	r.api.renderCityRegionMenu('history', 'history');
	const children = r.panels.get('history_region_menu').children;
	assert.equal(children.get('.city_region_manual').open, true);
	const select = children.get('.city_region_name'), index = children.get('.city_region_index');
	select.value = 'country-npl'; select.onchange();
	index.value = '999999'; children.get('.city_region_use').onclick();
	assert.equal(r.events.length, 0);
	index.value = '1'; children.get('.city_region_use').onclick();
	assert.equal(r.events[1].selected.id, 'region:v1:country-npl:1');
});

test('matching-name resolution uses an explicit regional anchor instead of an unrelated previous map point', () => {
	const r = runtime();
	r.api.renderCityRegionMenu('matching', 'matching');
	const children = r.panels.get('matching_region_menu').children;
	assert.equal(children.get('.city_region_list').children.length, 0);
	children.get('.city_region_name').value = 'country-npl';
	children.get('.city_region_index').value = '1';
	children.get('.city_region_use').onclick();
	assert.equal(r.events[1].resolved.id, 'region:v1:country-npl:1');
});

test('empty previous-city menus remain enabled and still expose region/proposal actions', () => {
	const r = runtime();
	vm.runInContext(read('City.js'), r.api);
	const toggles = [node(), node()];
	r.api.getDecodeCityHistory = () => [];
	r.api.getDecodeCityHistoryToggles = () => toggles;
	r.api.syncDecodeCityHistoryControl();
	assert(toggles.every(toggle => toggle.disabled === false));
	let rendered = false, opened = false;
	r.api.initDecodeCityHistoryDeleteControls = () => {};
	r.api.hideDecodeCityHistoryDeletePrompt = () => {};
	r.api.renderDecodeCityHistoryList = () => {};
	r.api.renderCityRegionMenu = id => { rendered = id === 'history'; };
	r.api.showOverlay = () => { opened = true; };
	r.api.showDecodeCityHistoryMessage();
	assert(rendered && opened);
});

test('nearby picker opens the active reference section and pins the current region first', () => {
	const { api, panels } = runtime();
	const panel = panels.get('nearby_region_menu');
	const cities = panel.parentElement.querySelector('.city_region_cities');
	const regionDetails = panel.children.get('.city_region_choices');
	const list = panel.children.get('.city_region_list');
	const active = api.regionAnchorFromId('region:v1:country-npl:1');

	api.code_city = active;
	api.code_postition = null;
	api.renderCityRegionMenu('nearby', 'nearby');
	assert.equal(panel.parentElement.sections[0], panel);
	assert.equal(regionDetails.open, true);
	assert.equal(cities.open, false);
	assert.equal(list.children[0].attributes['aria-pressed'], 'true');
	assert.match(list.children[0].html, /wolo_region_index/);
	assert.equal(list.children[0].children.length, 0);
	assert.equal(list.children.filter(button => button.attributes['aria-pressed'] === 'true').length, 1);

	api.code_city = { id: 'city' };
	api.renderCityRegionMenu('nearby', 'nearby');
	assert.equal(panel.parentElement.sections[0], cities);
	assert.equal(regionDetails.open, false);
	assert.equal(cities.open, true);
});

test('nearby manual region dialog can cancel or submit an anchor', () => {
	const { api, panels, events } = runtime();
	api.renderCityRegionMenu('nearby', 'nearby');
	const children = panels.get('nearby_region_menu').children;
	const manual = children.get('.city_region_manual');
	const open = children.get('.city_region_manual_open');
	open.onclick();
	assert.equal(manual.open, true);
	children.get('.city_region_manual_cancel').onclick();
	assert.equal(manual.open, false);
	assert.deepEqual(events, []);

	open.onclick();
	const select = children.get('.city_region_name');
	select.value = 'country-npl';
	const input = children.get('.city_region_index');
	const submit = manual.querySelector('form').onsubmit;
	const event = { preventDefault() {} };
	input.value = '999999';
	submit(event);
	assert.equal(manual.open, true);
	assert.deepEqual(events, []);
	input.value = '1';
	submit(event);
	assert.equal(manual.open, false);
	assert.equal(events[1].encoded.id, 'region:v1:country-npl:1');
});
