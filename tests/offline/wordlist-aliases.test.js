'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '../..');
const codeDir = path.join(repoRoot, 'Root/JS/Component/Root/Code');
const { WordList, normalizeCanonicalWordList, mergeCanonicalWordList } = require(path.join(codeDir, 'WordList.js'));

function loadJson(relative) {
	return JSON.parse(fs.readFileSync(path.join(repoRoot, relative), 'utf8'));
}

function loadCode(list) {
	const context = vm.createContext({ Math, isFinite });
	vm.runInContext(fs.readFileSync(path.join(codeDir, 'WordList.js'), 'utf8'), context);
	vm.runInContext(fs.readFileSync(path.join(codeDir, 'Code.js'), 'utf8'), context);
	context.wordList = new context.WordList(list);
	return context;
}

const v4Words = loadJson('Database/WordList.json').map(slot => slot[0]);
const v3 = v4Words.map((w, i) => (i === 235 ? 'death' : w));

test('bundled word list encodes with comet and still decodes death at the same index', () => {
	for (const file of ['Database/WordList.json', 'Root/Files/offline-data/WordList.json', 'Root/offline-data/WordList.json']) {
		const wordList = new WordList(loadJson(file));
		assert.equal(wordList.getWord(235), 'comet', file);
		assert.equal(wordList.indexOf('death'), 235, file);
		assert.equal(wordList.indexOf('comet'), 235, file);
		assert.ok(!wordList.curList.includes('death'), file);
	}
});

test("a Wolo code with 'death' decodes to the same position as one with 'comet'", () => {
	const ctx = loadCode(loadJson('Database/WordList.json'));
	const cityBegin = ctx.getCityBegin({ lat: 27.7172, lng: 85.324 });
	for (const indexes of [[235, 512, 17], [7, 235, 1000], [300, 4, 235]]) {
		const newWords = indexes.map(i => ctx.wordList.getWord(i));
		assert.ok(newWords.includes('comet'));
		const oldWords = newWords.map(w => (w === 'comet' ? 'death' : w));
		const decode = words => ctx.decode__(cityBegin, words.map(w => ctx.wordList.indexOf(w)));
		assert.deepEqual(decode(oldWords), decode(newWords));
		const position = decode(newWords);
		assert.deepEqual(Array.from(ctx.encode__(cityBegin, position)), indexes);
	}
});

test('normalizeCanonicalWordList accepts the v4 object and a legacy v3 array', () => {
	assert.equal(normalizeCanonicalWordList(v3).version, 3);
	assert.equal(normalizeCanonicalWordList({ version: 4, words: v3 }).version, 4);
	assert.equal(normalizeCanonicalWordList(v3.slice(1)), null);
	assert.equal(normalizeCanonicalWordList({ version: 4 }), null);
	assert.equal(normalizeCanonicalWordList(null), null);
});

test('mergeCanonicalWordList keeps retired words as aliases and never promotes them back', () => {
	const v4 = v3.slice();
	v4[235] = 'comet';
	const aliases = { version: 4, retired: { death: { index: 235, replacement: 'comet', retiredIn: 4 } } };

	const fromV3Snapshot = mergeCanonicalWordList({ version: 4, words: v4 }, aliases, v3.map(w => [w]));
	assert.deepEqual(fromV3Snapshot[235], ['comet', 'death']);
	const fresh = mergeCanonicalWordList({ version: 4, words: v4 }, aliases, []);
	assert.deepEqual(fresh[235], ['comet', 'death']);
	const noAliases = mergeCanonicalWordList({ version: 4, words: v4 }, null, v3.map(w => [w]));
	assert.deepEqual(noAliases[235], ['comet', 'death']);

	// An old plain-array (v3) source must not undo v4.
	const legacy = mergeCanonicalWordList(v3, null, fromV3Snapshot);
	assert.deepEqual(legacy, fromV3Snapshot);
	assert.equal(new WordList(legacy).getWord(235), 'comet');
});

test('bundled word list has the final v4 words; unpublished drafts are not aliases', () => {
	const wordList = new WordList(loadJson('Database/WordList.json'));
	for (const [old, word, i] of [['lead', 'crystal', 468], ['prison', 'burger', 685], ['rifle', 'puzzle', 720], ['trouser', 'microphone', 934], ['wind', 'sunrise', 1000], ['wound', 'sticker', 1014]]) {
		assert.equal(wordList.getWord(i), word);
		assert.equal(wordList.indexOf(old), i);
	}
	for (const draft of ['capsule', 'diagram', 'textile', 'emblem']) assert.equal(wordList.indexOf(draft), -1, draft);
});