const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('direct-link URL entry Go button starts disabled and styled with grayed-out state', () => {
	const externalPhp = fs.readFileSync('Root/HTML/Fragment/External.php', 'utf8');
	assert.match(externalPhp, /id='external_proceed'[\s\S]*title='Go'/);
	assert.match(externalPhp, /id='external_proceed'[\s\S]*aria-label='Go'/);
	assert.match(externalPhp, /id='external_proceed'[\s\S]*disabled/);

	const externalCss = fs.readFileSync('Root/CSS/Component/Root/Base/External.css', 'utf8');
	assert.match(externalCss, /#external_proceed:disabled[\s\S]*background:\s*#e8e8e8\s*!important/);
	assert.match(externalCss, /#external_proceed:disabled[\s\S]*pointer-events:\s*none/);
	assert.match(externalCss, /#external_proceed:disabled[\s\S]*fill:\s*#a8a8a8\s*!important/);

	const themeCss = fs.readFileSync('Root/CSS/Component/Root/Base/Theme.css', 'utf8');
	assert.match(themeCss, /html\.dark-mode #external_proceed:disabled[\s\S]*background:\s*#252538\s*!important/);
	assert.match(themeCss, /html\.dark-mode #external_proceed:disabled[\s\S]*fill:\s*#555577\s*!important/);
});

test('external URL preview dialog enforces stable width to prevent width layout change', () => {
	const externalCss = fs.readFileSync('Root/CSS/Component/Root/Base/External.css', 'utf8');
	assert.match(externalCss, /#external_message \{[\s\S]*width:\s*min\(300px,\s*calc\(100vw\s*-\s*32px\)\);/);
	assert.match(externalCss, /#external_wcode_container \{[\s\S]*width:\s*100%;/);
	assert.match(externalCss, /#external_address_container \{[\s\S]*width:\s*100%;/);

	const messageDialogCss = fs.readFileSync('Root/CSS/Base/Message_dialog.css', 'utf8');
	assert.match(messageDialogCss, /\.overlay > div:has\(> #external_message:not\(\.hide\)\) \{[\s\S]*width:\s*min\(300px,\s*calc\(100vw\s*-\s*32px\)\);/);
});

test('external URL preview enables Go button and updates address once target data arrives', () => {
	const elements = {
		external_message: { classList: { add() {}, remove() {}, contains: () => false } },
		external_proceed: { disabled: true },
		external_wcode_city: { textContent: '', innerText: '' },
		external_wcode_code: { textContent: '', innerText: '' },
		external_address: { textContent: '', classList: { add() {}, remove() {}, contains: () => true } },
		external_address_loader: { classList: { add() {}, remove() {}, contains: () => false } },
		overlay: { classList: { add() {}, remove() {}, contains: () => false } },
		external_redirect_status: { textContent: '' }
	};
	const context = {
		document: {
			getElementById: id => elements[id] || null,
			body: { classList: { add() {}, remove() {}, contains: () => false } }
		},
		window: { location: { assign() {}, replace() {} } },
		addClassIfPresent(el, cls) { if(el && el.classList) el.classList.add(cls); },
		removeClassIfPresent(el, cls) { if(el && el.classList) el.classList.remove(cls); },
		getWaitLoader() { return { classList: { add() {}, remove() {} } }; },
		showOverlay() {},
		hideOverlay() {},
		ensureMapViewForLocation() {},
		redirect_isActive() { return false; },
		getIntentURL() { return 'https://maps.google.com'; },
		external_latLng: null,
		external_wolo_code_string: ''
	};
	vm.createContext(context);

	const baseCode = fs.readFileSync('Root/JS/Base/Base.js', 'utf8');
	const externalCode = fs.readFileSync('Root/JS/Component/Root/External.js', 'utf8');
	vm.runInContext(baseCode, context);
	vm.runInContext(externalCode, context);

	// 1. Initial entry from URL - link preview shown, Go is disabled
	context.showInitialWoloLinkPreview({ words: ['nepal', 'kathmandu', 'cat', 'dog', 'tree'], suffix: '' });
	assert.equal(elements.external_proceed.disabled, true);
	assert.equal(elements.external_wcode_city.textContent, 'nepal kathmandu');
	assert.equal(elements.external_wcode_code.textContent, 'cat dog tree');

	// Clicking before data finishes fetching safely guards against navigation
	let assigned = false;
	context.window.location.assign = () => { assigned = true; };
	context.external_proceed_external();
	assert.equal(assigned, false, 'external navigation must not fire without target coordinates');

	// 2. Target data arrives (city and coordinates decoded)
	context.external_show({ lat: 27.7, lng: 85.3 }, 'Kathmandu', 'cat dog tree');
	assert.equal(elements.external_proceed.disabled, false, 'Go button must enable once target coordinates are set');
	assert.equal(elements.external_wcode_city.innerText, 'Kathmandu');

	// Clicking now triggers navigation
	context.external_proceed_external();
	assert.equal(assigned, true, 'external navigation proceeds once coordinates are resolved');
});
