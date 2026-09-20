'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const ocrMatch = require(path.resolve(repoRoot, 'Root/JS/Component/Root/CodeScanOcrMatch.js'));
const wordListJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'Database/WordList.json'), 'utf8'));

function buildIncludes() {
	const words = new Set();
	for (const group of wordListJson) {
		for (const entry of group) {
			words.add(entry);
		}
	}
	return {
		includes(word) {
			return words.has(word);
		},
		canonical: wordListJson.map((group) => group[0])
	};
}

test('normalizeOcrText lowercases and strips punctuation', () => {
	assert.equal(ocrMatch.normalizeOcrText('BENGALURU CAT, APPLE!'), 'bengaluru cat apple');
});

test('fuzzyMatchWord corrects common OCR typos against the word list', () => {
	const vocab = buildIncludes();
	assert.equal(ocrMatch.fuzzyMatchWord('appl', vocab.includes, vocab.canonical), 'apple');
	assert.equal(ocrMatch.fuzzyMatchWord('xyzzy', vocab.includes, vocab.canonical), null);
});

test('matchOcrTextToWoloCode finds city plus three words', () => {
	const vocab = buildIncludes();
	const match = ocrMatch.matchOcrTextToWoloCode('bengaluru cat apple tomato', vocab.includes, vocab.canonical);
	assert.ok(match);
	assert.equal(match.code, 'bengaluru cat apple tomato');
});

test('matchOcrTextToWoloCode finds three words without city prefix', () => {
	const vocab = buildIncludes();
	const match = ocrMatch.matchOcrTextToWoloCode('cat apple tomato', vocab.includes, vocab.canonical);
	assert.ok(match);
	assert.equal(match.code, 'cat apple tomato');
});

test('matchOcrTextToWoloCode tolerates minor OCR noise', () => {
	const vocab = buildIncludes();
	const match = ocrMatch.matchOcrTextToWoloCode('bengaluru cqt appl tomato', vocab.includes, vocab.canonical);
	assert.ok(match);
	assert.equal(match.code, 'bengaluru cat apple tomato');
});

test('matchOcrTextToWoloCode rejects text without three valid words', () => {
	const vocab = buildIncludes();
	assert.equal(ocrMatch.matchOcrTextToWoloCode('bengaluru cat apple', vocab.includes, vocab.canonical), null);
});

test('splitMatchForReview separates city and three words', () => {
	const review = ocrMatch.splitMatchForReview({
		words: ['bengaluru', 'cat', 'apple', 'tomato'],
		cityWordCount: 1
	});
	assert.equal(review.city, 'bengaluru');
	assert.deepEqual(review.words, ['cat', 'apple', 'tomato']);
});

test('buildCodeFromReview joins city and words for decode', () => {
	assert.equal(
		ocrMatch.buildCodeFromReview('Bengaluru', 'cat', 'apple', 'tomato'),
		'bengaluru cat apple tomato'
	);
});

test('validateReviewWords requires three dictionary words', () => {
	const vocab = buildIncludes();
	assert.equal(ocrMatch.validateReviewWords('cat', 'apple', 'tomato', vocab.includes), true);
	assert.equal(ocrMatch.validateReviewWords('cat', 'apple', 'xyzzy', vocab.includes), false);
});
