const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('Root/JS/Component/Root/Account.js', 'utf8');
function harness(storage = new Map()) {
 const notices = [];
 const context = { window: { addEventListener() {} }, localStorage: {
  getItem: key => storage.get(key) || null,
  setItem: (key, value) => storage.set(key, value)
 }, document: { getElementById: () => null }, showNotification: text => notices.push(text),
 getCodeCity: () => ({ id: 'city-1', name: 'Test City' }), getCodeWCode: () => ['one', 'two', 'three'],
 setTimeout, console, saveList: {}, lastActiveSaveEntry: null };
 vm.createContext(context); vm.runInContext(source, context);
 context.renderSaveList = entries => { context.saveList = entries; };
 return { context, storage, notices };
}
test('signed-out bookmarks persist across reload and never require Firebase', () => {
 const { context, storage } = harness(); let saved = false;
 context.saveAddress('Home', 'Gate', 'Address', () => saved = true);
 assert.equal(saved, true);
 const reloaded = harness(storage).context; reloaded.loadSaveList();
 const keys = Object.keys(reloaded.saveList);
 assert.equal(keys.length, 1);
 assert.equal(reloaded.saveList[keys[0]].title, 'Home');
 assert.equal(reloaded.saveList[keys[0]].city_id, 'city-1');
 assert.equal(reloaded.saveList[keys[0]].uid, null);
});
test('local edits and deletions work without sign-in', () => {
 const { context } = harness(); context.saveAddress('Home', '', 'Old');
 const key = Object.keys(context.saveList)[0];
 context.updateSavedAddress(key, 'Office', 'Floor', 'New');
 assert.equal(context.readLocalBookmarks()[key].title, 'Office');
 context.getSaveEntryMenuRow = () => ({ data_key: key }); context.closeSaveEntryMenus = () => {};
 context.deleteSaveEntry({}); assert.equal(Object.keys(context.readLocalBookmarks()).length, 0);
});
test('local bookmarks remain alongside cloud bookmarks and survive logout', () => {
 const { context } = harness(); context.saveAddress('Local', '', '');
 let listener, detached = 0; let user = { uid: 'user-1' };
 context.firebase = { auth: () => ({ currentUser: user }), database: () => ({ ref: () => ({
  on: (event, cb) => { listener = cb; }, off: () => detached++
 }) }) };
 context.loadSaveList(); listener({ val: () => ({ cloudKey: { title: 'Cloud', code: ['a','b','c'] } }) });
 assert.equal(Object.keys(context.saveList).length, 2);
 user = null; context.loadSaveList(); assert.equal(detached, 1);
 assert.equal(Object.keys(context.saveList).length, 1);
 listener({ val: () => ({ cloudKey: { title: 'Cloud' } }) });
 assert.equal(Object.keys(context.saveList).length, 1);
});
test('storage failure does not report a successful save', () => {
 const { context, notices } = harness(); let saved = false;
 context.localStorage.setItem = () => { throw new Error('Quota'); };
 context.saveAddress('Home', '', '', () => saved = true);
 assert.equal(saved, false); assert.deepEqual(notices, ['Could not save bookmarks on this device']);
});
test('invalid local storage is tolerated and a location is required', () => {
 const { context, storage } = harness(); storage.set(context.LOCAL_BOOKMARKS_KEY, 'invalid');
 assert.equal(Object.keys(context.readLocalBookmarks()).length, 0);
 context.getCodeCity = () => null; context.saveAddress('Home', '', '');
 assert.equal(storage.get(context.LOCAL_BOOKMARKS_KEY), 'invalid');
});
