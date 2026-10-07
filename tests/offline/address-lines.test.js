const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
 const fields = {};
 const storage = new Map();
 const notices = [];
 let focused;
 for (const id of ['save_address', 'save_address_line_2', 'save_address_split_toggle', 'save_title_main', 'save_title_segment']) {
  fields[id] = { value: '', attributes: {}, classList: { toggle() {} }, setAttribute(k, v) { this.attributes[k] = v; }, focus() { focused = id; } };
 }
 const context = {
  window: { addEventListener() {} }, NOTIFICATION_DURATION_LONG: 1, saveList: {},
  document: { getElementById: id => fields[id] || null },
  localStorage: { getItem: k => storage.get(k) || null, setItem: (k, v) => storage.set(k, v) },
  current_address_lines: null, current_address: '', locating: false,
  getCodeCity: () => ({ id: 'city-1', name: 'City' }), getCodeWCode: () => ['a', 'b', 'c'],
  showNotification: text => notices.push(text), isOfflineMode: () => false, setTimeout
 };
 vm.createContext(context);
 for (const file of ['Account.js', 'Base/OfflineQueue.js', 'QR.js', 'CodeQR.js', 'Address.js'])
  vm.runInContext(fs.readFileSync('Root/JS/Component/Root/' + file, 'utf8'), context);
 context.renderSaveList = entries => { context.saveList = entries; };
 return { context, fields, storage, notices, focused: () => focused };
}

const lines = { address_line_1: '12 MG Road', address_line_2: 'Flat 4B, second floor' };
const plain = value => JSON.parse(JSON.stringify(value));

test('split/merge remembers boundaries, but merged saves only line 1', () => {
 const { context: c, fields, focused } = harness();
 c.setAccountDialogAddressFields(lines);
 assert.equal(c.saveAddressSplit, true);
 c.toggleAccountDialogAddressSplit();
 assert.equal(fields.save_address.value, '12 MG Road, Flat 4B, second floor');
 assert.equal(fields.save_address_line_2.hidden, true);
 assert.equal(fields.save_address_line_2.disabled, true);
 assert.deepEqual(plain(c.getAccountDialogSaveAddressLines()), { address_line_1: '12 MG Road, Flat 4B, second floor', address_line_2: '' });
 c.toggleAccountDialogAddressSplit();
 assert.deepEqual(plain(c.getAccountDialogSaveAddressLines()), lines);
 assert.equal(focused(), 'save_address_line_2');
 assert.equal(fields.save_address_split_toggle.attributes['aria-expanded'], 'true');
 assert.match(fields.save_address.placeholder, /12 MG Road/);
});

test('editing merged text invalidates the remembered split even if text is restored', () => {
 const { context: c, fields } = harness();
 c.setAccountDialogAddressFields(lines); c.toggleAccountDialogAddressSplit();
 c.onMergedAddressInput();
 c.toggleAccountDialogAddressSplit();
 assert.equal(fields.save_address_line_2.value, '');
 assert.equal(fields.save_address.value, '12 MG Road, Flat 4B, second floor');
 c.toggleAccountDialogAddressSplit(); fields.save_address.value = 'New address'; c.onMergedAddressInput();
 c.toggleAccountDialogAddressSplit();
 assert.deepEqual(plain(c.getAccountDialogSaveAddressLines()), { address_line_1: 'New address', address_line_2: '' });
});

test('legacy multiline addresses stay wholly in line 1; structured blank fields take precedence', () => {
 const { context: c } = harness();
 c.setAccountDialogAddressFields({ address: 'Old\naddress' });
 assert.equal(c.saveAddressSplit, false);
 assert.deepEqual(plain(c.getAccountDialogSaveAddressLines()), { address_line_1: 'Old\naddress', address_line_2: '' });
 assert.deepEqual(plain(c.readSavedAddressLines({ address: 'stale', address_line_1: '', address_line_2: '' })), { address_line_1: '', address_line_2: '' });
 c.setAccountDialogAddressFields({ address_line_2: 'Only second' });
 assert.equal(c.formatSavedAddress(c.getAccountDialogSaveAddressLines()), 'Only second');
 c.clearAccountDialogSaveForm();
 assert.equal(c.saveAddressSplit, false);
 assert.equal(c.formatSavedAddress(c.getAccountDialogSaveAddressLines()), '');
});

test('local save/reload and merged edit persist new fields and remove stale address', () => {
 const { context: c, storage } = harness();
 c.saveAddress('Home', '', lines);
 const key = Object.keys(c.readLocalBookmarks())[0];
 assert.equal(JSON.parse(storage.get(c.LOCAL_BOOKMARKS_KEY))[key].address_line_2, lines.address_line_2);
 const old = c.readLocalBookmarks(); old[key].address = 'stale'; c.writeLocalBookmarks(old);
 c.setAccountDialogAddressFields(lines); c.toggleAccountDialogAddressSplit();
 c.updateSavedAddress(key, 'Home', '', c.getAccountDialogSaveAddressLines());
 assert.equal(c.readLocalBookmarks()[key].address_line_2, '');
 assert.equal(c.readLocalBookmarks()[key].address, undefined);
 assert.equal(c.readLocalBookmarks()[key].address_line_1, '12 MG Road, Flat 4B, second floor');
});

test('cloud update clears legacy field and writes explicit blank line 2', () => {
 const { context: c } = harness(); let payload;
 c.firebase = { auth: () => ({ currentUser: { uid: 'u' } }), database: () => ({ ref: () => ({ update: (p, cb) => { payload = p; cb(null); } }) }) };
 c.updateSavedAddress('key', 'Home', '', { address_line_1: 'Merged', address_line_2: '' });
 assert.equal(payload.address, null);
 assert.equal(payload.address_line_1, 'Merged');
 assert.equal(payload.address_line_2, '');
});

test('failed modal save retains draft and split state; successful save clears it', () => {
 const { context: c, fields } = harness();
 fields.save_title_main.value = 'Home'; c.setAccountDialogAddressFields(lines);
 c.saveAddress = () => {};
 c.onAccountDialogSave();
 assert.deepEqual(plain(c.getAccountDialogSaveAddressLines()), lines);
 assert.equal(c.saveAddressSplit, true);
 c.setAccountDialogAddOpen = () => {}; c.setAccountDialogSavesOpen = () => {};
 c.saveAddress = (title, segment, address, cb) => cb();
 c.onAccountDialogSave();
 assert.equal(fields.save_address.value, ''); assert.equal(c.saveAddressSplit, false);
});

test('offline cloud push normalizes legacy queue items and carries both structured lines', async () => {
 const { context: c } = harness(); const writes = [];
 c.firebase = { database: Object.assign(() => ({ ref: () => ({ push: (p, cb) => { writes.push(p); cb(null); } }) }), { ServerValue: { TIMESTAMP: 1 } }) };
 await c.pushOfflineSave({ uid: 'u', ...lines });
 await c.pushOfflineSave({ uid: 'u', address: 'Old\ntext' });
 assert.equal(writes[0].address_line_2, lines.address_line_2);
 assert.equal(writes[1].address_line_1, 'Old\ntext');
 assert.equal(writes[1].address_line_2, '');
 assert.equal(writes[0].address, undefined);
});

test('offline enqueue and local-to-cloud sync retain structured address lines', async () => {
 const { context: c } = harness(); let queued, synced;
 c.firebase = { auth: () => ({ currentUser: { uid: 'u' } }), database: Object.assign(() => ({ ref: () => ({ set: (p, cb) => { synced = p; cb(null); } }) }), { ServerValue: { TIMESTAMP: 1 } }) };
 c.isOfflineMode = () => true;
 c.putOfflineSaveQueueItem = item => { queued = item; return Promise.resolve(); };
 c.getOfflineSaveQueue = () => Promise.resolve([]);
 c.saveAddress('Home', '', lines);
 await Promise.resolve();
 assert.equal(queued.payload.address_line_2, lines.address_line_2);
 c.isOfflineMode = () => false;
 c.writeLocalBookmarks({ local_test: { city_id: 'city-1', code: ['a','b','c'], ...lines } });
 assert.equal(await c.syncLocalBookmark('local_test'), true);
 assert.equal(synced.address_line_1, lines.address_line_1);
 assert.equal(synced.address_line_2, lines.address_line_2);
 assert.equal(synced.address, undefined);
 assert.equal(c.readLocalBookmarks().local_test, undefined);
});

test('QR save preserves unchanged boundaries, parses edited text, and compares formatted bookmarks', () => {
 const { context: c } = harness();
 c.current_address_lines = { address_line_1: '', address_line_2: 'Second only' };
 assert.deepEqual(plain(c.getQRSaveAddressLines('Second only')), { address_line_1: '', address_line_2: 'Second only' });
 assert.deepEqual(plain(c.getQRSaveAddressLines('Road\nFlat\nFloor')), { address_line_1: 'Road', address_line_2: 'Flat, Floor' });
 c.current_address_lines = lines;
 assert.equal(c.getCodeQRValue('address'), '12 MG Road\nFlat 4B, second floor');
 const state = c.getQRBookmarkState({ key: { city_id: 'city-1', code: ['a','b','c'], ...lines } }, { id: 'city-1' }, ['a','b','c'], c.formatSavedAddress(lines));
 assert.equal(state.saved, true); assert.equal(state.changed, false);
});

test('opening a saved address carries both lines to the map panel, reopened form, and address QR', () => {
 const { context: c, fields } = harness();
 fields.address_text_content = { innerText: '' };
 c.address_text_content = fields.address_text_content;
 c.getAddressPanel = () => ({ classList: { remove() {} } });
 c.setAddressPanelHeading = () => {};
 c.refreshAddressCodes = () => {};
 c.getCityCenterFromId = (city, cb) => cb(city);
 c.decode_continue = () => {};
 c.saveList = { key: { title: 'Home', segment: 'Gate', code: ['a','b','c'], ...lines } };
 c.processSaveEntry_continue({ data_city: { id: 'city-1' }, data_key: 'key' });
 c.address = 'Geocoded address';
 c.showAddress();
 assert.equal(fields.address_text_content.innerText, '12 MG Road\nFlat 4B, second floor');
 assert.equal(c.getCodeQRValue('address'), fields.address_text_content.innerText);
 c.syncAccountDialogSaveForm();
 assert.equal(c.saveAddressSplit, true);
 assert.deepEqual(plain(c.getAccountDialogSaveAddressLines()), lines);
});
