'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

function createNode(tag = 'div') {
	const classes = new Set();
	return {
		tagName: tag.toUpperCase(),
		children: [],
		listeners: {},
		attributes: {},
		style: {},
		classList: {
			add(...c) { c.forEach(x => classes.add(x)); },
			remove(...c) { c.forEach(x => classes.delete(x)); },
			contains(c) { return classes.has(c); },
			toggle(c, on) { on ? classes.add(c) : classes.delete(c); }
		},
		set textContent(v) { this._text = v; },
		get textContent() { return this._text !== undefined ? this._text : this.innerText; },
		set innerText(v) { this._text = v; },
		get innerText() { return this._text || ''; },
		set innerHTML(v) { this._html = v; this.children = []; },
		get innerHTML() { return this._html || ''; },
		appendChild(child) {
			child.parentElement = this;
			this.children.push(child);
			return child;
		},
		setAttribute(k, v) { this.attributes[k] = String(v); },
		getAttribute(k) { return this.attributes[k]; },
		addEventListener(event, fn) {
			if (!this.listeners[event]) this.listeners[event] = [];
			this.listeners[event].push(fn);
		},
		dispatchEvent(event) {
			event.currentTarget = this;
			if (!event.target) event.target = this;
			const handlers = this.listeners[event.type] || [];
			for (const h of handlers) h.call(this, event);
			if (!event._stopped && this.parentElement) {
				this.parentElement.dispatchEvent(event);
			}
		},
		click() {
			const evt = {
				type: 'click',
				target: this,
				currentTarget: this,
				_stopped: false,
				stopPropagation() { this._stopped = true; },
				preventDefault() {}
			};
			this.dispatchEvent(evt);
		}
	};
}

function loadCityEnvironment(initialHistory = []) {
	const storage = {
		decode_city_history: JSON.stringify(initialHistory)
	};
	const nodes = {
		decode_city_history_message: createNode('div'),
		decode_city_history_message_list: createNode('div'),
		decode_city_history_delete: createNode('div'),
		decode_city_history_delete_name: createNode('span'),
		decode_city_history_delete_confirm: createNode('button'),
		decode_city_history_delete_cancel: createNode('button'),
		decode_input_city: createNode('span'),
		decode_city_history_toggle: createNode('button'),
		map_city_history_toggle: createNode('button')
	};

	let selectedCity = initialHistory[0] || null;
	let selectedSource = initialHistory.length ? 'history' : null;
	let ipCitySelected = false;
	let overlayHidden = false;

	const sandbox = {
		Storage: true,
		localStorage: storage,
		document: {
			getElementById: id => nodes[id] || null,
			createElement: tag => createNode(tag)
		},
		addLongpressListener: (node, fnShort, fnLong) => {
			node.addEventListener('click', fnShort);
		},
		showOverlay: () => {},
		hideOverlay: () => { overlayHidden = true; },
		rememberCity: () => {},
		selectIpDecodeCity: () => {
			ipCitySelected = true;
			selectedCity = { name: 'IP City' };
			selectedSource = 'ip';
		},
		syncDecodeCitySourceButtons: () => {},
		focusSelectedDecodeCityOnMap: () => {},
		geoIp_city_name: 'Default IP City',
		getCityByIp: cb => { if (cb) cb(); },
		get selected_decode_city() { return selectedCity; },
		set selected_decode_city(v) { selectedCity = v; },
		get selected_decode_city_source() { return selectedSource; },
		set selected_decode_city_source(v) { selectedSource = v; }
	};

	vm.createContext(sandbox);
	const cityJs = fs.readFileSync(path.join(__dirname, '../../Root/JS/Component/Root/City.js'), 'utf8');
	vm.runInContext(cityJs, sandbox);

	return { sandbox, nodes, storage, getIpSelected: () => ipCitySelected, getOverlayHidden: () => overlayHidden };
}

test('renderDecodeCityHistoryList creates city name and right-side remove button', () => {
	const history = [
		{ name: 'Kathmandu', id: 'np-ktm' },
		{ name: 'Pokhara', id: 'np-pkr' }
	];
	const { sandbox, nodes } = loadCityEnvironment(history);

	sandbox.decode_city_history = history;
	sandbox.renderDecodeCityHistoryList();

	const list = nodes.decode_city_history_message_list;
	assert.equal(list.children.length, 2);

	const row0 = list.children[0];
	assert.equal(row0.children.length, 2);
	assert.equal(row0.getAttribute('role'), 'button');
	assert.equal(row0.tabIndex, 0);

	const name0 = row0.children[0];
	assert.equal(name0.className, 'decode_city_history_name');
	assert.equal(name0.innerText, 'Kathmandu');

	const remove0 = row0.children[1];
	assert.equal(remove0.className, 'decode_city_history_remove');
	assert.equal(remove0.textContent, '\u00d7');
	assert.equal(remove0.getAttribute('aria-label'), 'Remove Kathmandu');
	assert.equal(remove0.title, 'Remove Kathmandu');
});

test('pressing Enter or Space on a focused history row selects the city', () => {
	const history = [
		{ name: 'Kathmandu', id: 'np-ktm' },
		{ name: 'Pokhara', id: 'np-pkr' }
	];
	const { sandbox, nodes } = loadCityEnvironment(history);
	sandbox.decode_city_history = history;
	sandbox.renderDecodeCityHistoryList();

	const row0 = nodes.decode_city_history_message_list.children[0];
	row0.dispatchEvent({ type: 'keydown', key: 'Enter', target: row0, preventDefault() {} });
	assert.equal(sandbox.selected_decode_city.name, 'Kathmandu');
});

test('previous city modal and history rows share choose-city styles and avoid code-scan overrides', () => {
	const chooseCityCss = fs.readFileSync(path.join(__dirname, '../../Root/CSS/Component/Root/Base/Choose_City.css'), 'utf8');
	const codeScanCss = fs.readFileSync(path.join(__dirname, '../../Root/CSS/Component/Root/Base/CodeScan.css'), 'utf8');
	assert.match(chooseCityCss, /:is\([^)]*\.decode_city_history_row[^)]*\)/);
	assert.match(chooseCityCss, /\.decode_city_history_remove/);
	assert.doesNotMatch(codeScanCss, /#decode_city_history_message/);
	assert.doesNotMatch(codeScanCss, /#decode_city_history_message_list/);
});

test('clicking remove button removes cached city from list and stops propagation', () => {
	const history = [
		{ name: 'Kathmandu', id: 'np-ktm' },
		{ name: 'Pokhara', id: 'np-pkr' },
		{ name: 'Lalitpur', id: 'np-ltp' }
	];
	const { sandbox, nodes, storage } = loadCityEnvironment(history);

	sandbox.decode_city_history = history;
	sandbox.renderDecodeCityHistoryList();

	let citySelected = false;
	sandbox.setDecodeCity = (city, source, saveHistory) => {
		citySelected = true;
	};

	const list = nodes.decode_city_history_message_list;
	assert.equal(list.children.length, 3);

	// Click remove on Pokhara (index 1)
	const removePokhara = list.children[1].children[1];
	removePokhara.click();

	// row selection must NOT have been called for Pokhara
	assert.equal(citySelected, false);

	// decode_city_history and localStorage should now have 2 cities: Kathmandu and Lalitpur
	const updated = JSON.parse(storage.decode_city_history);
	assert.deepEqual(updated.map(c => c.name), ['Kathmandu', 'Lalitpur']);

	// List in UI should be re-rendered with 2 items
	assert.equal(list.children.length, 2);
	assert.equal(list.children[0].children[0].innerText, 'Kathmandu');
	assert.equal(list.children[1].children[0].innerText, 'Lalitpur');
});

test('removing active decode city advances to next cached city or falls back to IP', () => {
	const history = [
		{ name: 'Kathmandu', id: 'np-ktm' },
		{ name: 'Pokhara', id: 'np-pkr' }
	];
	const { sandbox, nodes, getIpSelected } = loadCityEnvironment(history);

	sandbox.decode_city_history = history;
	sandbox.selected_decode_city = history[0];
	sandbox.renderDecodeCityHistoryList();

	const list = nodes.decode_city_history_message_list;
	// Remove currently selected Kathmandu (index 0)
	list.children[0].children[1].click();

	// Active city should now switch to Pokhara
	assert.equal(sandbox.selected_decode_city.name, 'Pokhara');

	// Now remove Pokhara (last remaining city)
	assert.equal(list.children.length, 1);
	list.children[0].children[1].click();

	// IP fallback should be triggered
	assert.equal(sandbox.selected_decode_city_source, 'ip');
	assert.equal(sandbox.selected_decode_city.name, 'Default IP City');
});

test('removing the last cached city dismisses the previous city popup', () => {
	const history = [
		{ name: 'Kathmandu', id: 'np-ktm' }
	];
	const { sandbox, nodes, getOverlayHidden } = loadCityEnvironment(history);

	sandbox.decode_city_history = history;
	sandbox.renderDecodeCityHistoryList();

	const list = nodes.decode_city_history_message_list;
	assert.equal(list.children.length, 1);

	// Remove Kathmandu
	list.children[0].children[1].click();

	assert.equal(getOverlayHidden(), true);
	assert.equal(list.children.length, 0);
});
