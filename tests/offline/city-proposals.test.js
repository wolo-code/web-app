'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const read = file => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');

function runtime() {
	const nodes = new Map();
	const node = id => {
		if(!nodes.has(id)) nodes.set(id, { value: '', checked: false, textContent: '', attributes: {},
			reportValidity() { return !!this.value; }, focus() {},
			getAttribute(key) { return this.attributes[key] || ''; }, setAttribute(key, value) { this.attributes[key] = value; } });
		return nodes.get(id);
	};
	const writes = [], drafts = [], notifications = [];
	let resolveWrite, rejectWrite;
	const acknowledgement = new Promise((resolve, reject) => { resolveWrite = resolve; rejectWrite = reject; });
	const ref = { child() { return this; }, push() { return { key: '-request-123' }; }, update(data) { writes.push(data); return acknowledgement; } };
	const api = { document: { getElementById: node }, database: { ref() { return ref; } },
		firebase: { database: { ServerValue: { TIMESTAMP: { '.sv': 'timestamp' } } } },
		window: { location: { assign(href) { drafts.push(href); } } },
		isOfflineMode() { return false; }, showOverlay() {}, hideOverlay() {},
		addClassIfPresent() {}, removeClassIfPresent() {}, showNotification(message) { notifications.push(message); },
		latLng_p: { lat: 28.2, lng: 83.98 }, address: 'Pokhara, Nepal', gpId: 'place-123' };
	vm.createContext(api);
	for(const file of ['RegionAnchors', 'City', 'NoCity']) vm.runInContext(read('Root/JS/Component/Root/' + file + '.js'), api);
	node('no_city_name').value = 'Pokhara & Lakes';
	node('no_city_country').value = 'Nepal';
	return { api, node, writes, drafts, notifications, resolveWrite, rejectWrite };
}

test('proposal is persisted once, then the acknowledged request ID appears in draft subject and fallback link', async () => {
	const r = runtime();
	r.api.showCityProposal();
	const submitting = r.api.noCity_add();
	r.api.noCity_add();
	await Promise.resolve();
	assert.equal(r.writes.length, 1);
	assert.equal(r.drafts.length, 0);
	const entry = r.writes[0]['/CityRequest/-request-123'];
	assert.equal(entry.city_name, 'Pokhara & Lakes');
	assert.equal(entry.processed, false);
	assert.equal(entry.address, 'Pokhara, Nepal');
	// Navigation while waiting must not change the submitted city/location.
	r.api.latLng_p = { lat: 0, lng: 0 };
	r.node('no_city_name').value = 'Other city';
	r.resolveWrite();
	assert.equal(await submitting, '-request-123');
	assert.equal(r.drafts.length, 1);
	const url = new URL(r.drafts[0]);
	assert.equal(url.pathname, 'support@wolo.codes');
	assert.equal(url.searchParams.get('subject'), 'Wolo add city request -request-123');
	assert.match(url.searchParams.get('body'), /Pokhara & Lakes/);
	assert.match(url.searchParams.get('body'), /28.2, 83.98/);
	assert.equal(r.node('no_city_email_details').attributes.href, r.drafts[0]);
	assert.equal(r.node('no_city_request_id').textContent, '-request-123');
	r.api.hideNoCityMessage();
	r.api.showCityProposal();
	assert.equal(r.api.cityProposalRequest.id, '-request-123');
	assert.equal(r.writes.length, 1);
	r.api.newCityProposal();
	assert.equal(r.api.cityProposalRequest, null);
	assert.equal(r.node('no_city_name').value, '');
});

test('rejected writes never open an email or announce success; users can retry', async () => {
	const r = runtime();
	r.api.showCityProposal();
	const submitting = r.api.noCity_add();
	await Promise.resolve();
	r.rejectWrite(new Error('permission denied'));
	assert.equal(await submitting, null);
	assert.equal(r.drafts.length, 0);
	assert.equal(r.api.cityProposalInFlight, false);
	assert(!r.notifications.includes('City request submitted'));
});

test('city-only proposals do not borrow an unrelated map location, and offline submission does not write', async () => {
	const r = runtime();
	r.api.latLng_p = null;
	r.api.showCityProposal();
	const submitting = r.api.noCity_add();
	await Promise.resolve();
	assert.equal(r.writes[0]['/CityRequest/-request-123'].lat_lng, null);
	r.resolveWrite();
	await submitting;
	const offline = runtime();
	offline.api.isOfflineMode = () => true;
	offline.api.noCity_add();
	assert.equal(offline.writes.length, 0);
	assert.equal(offline.drafts.length, 0);
});

