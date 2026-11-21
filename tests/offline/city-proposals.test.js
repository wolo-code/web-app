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
	assert.equal(r.node('no_city_location').textContent, 'Nearby: 28.200000, 83.980000');
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

test('proposals require a selected map location and offline submission does not write', async () => {
	const r = runtime();
	r.api.latLng_p = null;
	r.api.showCityProposal();
	assert.equal(r.node('no_city_location').textContent, 'No map location selected');
	const submitting = r.api.noCity_add();
	assert.equal(submitting, undefined);
	assert.equal(r.writes.length, 0);
	assert.equal(r.drafts.length, 0);
	assert(r.notifications.includes('Select a location on the map before proposing a city'));
	const offline = runtime();
	offline.api.isOfflineMode = () => true;
	offline.api.noCity_add();
	assert.equal(offline.writes.length, 0);
	assert.equal(offline.drafts.length, 0);
});

test('propose a city dialog markup and styles match UX requirements', () => {
	const html = read('Root/HTML/Fragment/NoCity.php');
	const css = read('Root/CSS/Component/Root/Base/No_City.css');

	// Mandatory fields indicated by *; optional indicator removed.
	assert.match(html, /<label for='no_city_name'>City name \*<\/label>/);
	assert.match(html, /<label id='no_city_location_label'>Location \*<\/label>/);
	assert.doesNotMatch(html, /optional/i);

	// Map location is mandatory: no optional include checkbox.
	assert.doesNotMatch(html, /no_city_include_location/);
	assert.doesNotMatch(html, /Include selected map location/);

	// Country label uses territory instead of region to avoid conflicting with regional codes.
	assert.match(html, /<label for='no_city_country'>Country or territory<\/label>/);
	assert.doesNotMatch(html, /Country or region/);

	// Submit button text is 'Submit', not 'Submit request'.
	assert.match(html, /<button id='no_city_submit_yes' class='border' type='button'>Submit<\/button>/);
	assert.doesNotMatch(html, /Submit request/);

	// Text input boxes use flat underline styling only (border: 0, border-bottom).
	assert.match(css, /#no_city_message input\[type='text'\]\s*\{[^}]*border:\s*0;/);
	assert.match(css, /#no_city_message input\[type='text'\]\s*\{[^}]*border-bottom:\s*1px solid #999;/);
	assert.match(css, /#no_city_message input\[type='text'\]\s*\{[^}]*border-radius:\s*0;/);

	// Close button has equal top and right offsets.
	assert.match(css, /#no_city_message #no_city_message_close\s*\{[^}]*top:\s*16px;\s*right:\s*16px;/);

	// Location text is indented slightly under the Location label.
	assert.match(css, /#no_city_location\s*\{[^}]*padding-left:\s*8px;/);

	// Submit and cancel buttons have a comfortable gap between them.
	assert.match(css, /#no_city_message \.message_dialog_control\s*\{[^}]*gap:\s*18px;/);
});

