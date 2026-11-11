'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');

const read = file => fs.readFileSync(path.join(__dirname, '../../Root/JS', file), 'utf8');

test('city lookup tries exact hyphenated token before hyphen-as-space fallback', () => {
	const seen = [];
	const api = {
		pushLoader() {},
		popLoader() {},
		showNotification() {},
		decode_continue() {},
		chooseCity() {},
		isOfflineMode() { return false; },
		database: {
			ref() {
				return {
					orderByChild() { return this; },
					equalTo(value) {
						seen.push(value);
						return this;
					},
					once(_event, callback) {
						callback({ val() { return null; } });
						return { catch() {} };
					}
				};
			}
		}
	};
	vm.createContext(api);
	vm.runInContext(read('Base/Base.js'), api);
	vm.runInContext(read('Component/Root/City.js'), api);
	api.getCityFromName([], 'new-town', function() {}, function() {});
	assert.deepEqual(seen.slice(0, 2), ['new-town', 'new town']);
});
