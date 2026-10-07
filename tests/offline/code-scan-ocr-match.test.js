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

function regionWord(text, x0, y0, x1, y1) {
	return { text, confidence: 95, bbox: { x0, y0, x1, y1 } };
}

test('spatial matching reads only city words above the code inside the container', () => {
	const words = [
		regionWord('Delhi', 250, 100, 340, 125),
		regionWord('tomato', 350, 180, 440, 220),
		regionWord('unrelated', 600, 100, 750, 125),
		regionWord('New', 180, 100, 240, 125),
		regionWord('apple', 230, 180, 330, 220),
		regionWord('cat', 100, 180, 210, 220),
		regionWord('footer', 180, 250, 240, 280),
		regionWord('heading', 180, -100, 240, -70)
	];
	const vocab = buildIncludes();
	const match = ocrMatch.matchOcrRegionsToWoloCode({ data: { words } }, vocab.includes, vocab.canonical);
	assert.equal(match.code, 'new delhi cat apple tomato');
	assert.deepEqual(match.regions.code, { x0: 100, y0: 180, x1: 440, y1: 220 });
	assert.deepEqual(match.regions.city, { x0: 180, y0: 100, x1: 340, y1: 125 });
	const container = match.regions.container;
	assert.ok(Math.abs((container.x1 - container.x0) / (container.y1 - container.y0) - (1 + Math.sqrt(5)) / 2) < 0.001);
});

test('city spelling is preserved instead of corrected using Wolo dictionary words', () => {
	const vocab = buildIncludes();
	const match = ocrMatch.matchOcrRegionsToWoloCode({ data: { words: [
		regionWord('Bunbury', 170, 100, 330, 130),
		regionWord('cat', 100, 180, 210, 220),
		regionWord('apple', 230, 180, 330, 220),
		regionWord('tomato', 350, 180, 440, 220)
	] } }, vocab.includes, vocab.canonical);
	assert.equal(ocrMatch.splitMatchForReview(match).city, 'bunbury');
});

test('text outside the label does not become a city and repeated code words do not enlarge the code region', () => {
	const includes = word => ['cat', 'apple'].includes(word);
	const match = ocrMatch.matchOcrRegionsToWoloCode({ data: { words: [
		regionWord('cat', 900, 10, 950, 50),
		regionWord('cat', 100, 180, 210, 220),
		regionWord('apple', 230, 180, 330, 220),
		regionWord('cat', 350, 180, 440, 220)
	] } }, includes, ['cat', 'apple']);
	assert.equal(match.code, 'cat apple cat');
	assert.equal(match.cityWordCount, 0);
	assert.equal(match.regions.city, null);
	assert.equal(match.regions.code.x1, 440);
});

test('three dictionary words on separate lines are not treated as a code row', () => {
	const vocab = buildIncludes();
	assert.equal(ocrMatch.matchOcrRegionsToWoloCode({ data: { words: [
		regionWord('cat', 100, 20, 200, 50),
		regionWord('apple', 100, 100, 200, 130),
		regionWord('tomato', 100, 180, 200, 210)
	] } }, vocab.includes, vocab.canonical), null);
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

test('bboxIoU measures overlap between candidate boxes', () => {
	const a = {x0: 0, y0: 0, x1: 100, y1: 50};
	const b = {x0: 50, y0: 0, x1: 150, y1: 50};
	const identical = {x0: 10, y0: 10, x1: 90, y1: 40};
	assert.ok(ocrMatch.bboxIoU(identical, identical) > 0.99);
	assert.ok(ocrMatch.bboxIoU(a, b) > 0.3);
	assert.equal(ocrMatch.bboxIoU(a, {x0: 200, y0: 200, x1: 300, y1: 250}), 0);
});

test('isAspectRatioNear accepts 3:1 within tolerance', () => {
	const bbox = {x0: 0, y0: 0, x1: 300, y1: 100};
	assert.equal(ocrMatch.isAspectRatioNear(bbox, 3, 0.2), true);
	assert.equal(ocrMatch.isAspectRatioNear({x0: 0, y0: 0, x1: 100, y1: 100}, 3, 0.2), false);
});

test('getVideoViewfinderCropRect calculates exact visible video crop under object-fit cover', () => {
	// Exact aspect match
	const match = ocrMatch.getVideoViewfinderCropRect(1280, 720, 640, 360, 1);
	assert.deepEqual(match, { sx: 0, sy: 0, sw: 1280, sh: 720 });

	// Portrait camera on wide viewport: viewport 360x180 (2:1), video 720x1280 (9:16)
	// Under cover, video width 720 scales to 360, height scales to 640. Center 360/640 is visible:
	const portrait = ocrMatch.getVideoViewfinderCropRect(720, 1280, 360, 180, 1);
	assert.deepEqual(portrait, { sx: 0, sy: 460, sw: 720, sh: 360 });
	assert.equal(portrait.sw / portrait.sh, 360 / 180);

	// Landscape camera on narrower viewport: viewport 360x240 (1.5:1), video 1920x1080 (1.78:1)
	const landscape = ocrMatch.getVideoViewfinderCropRect(1920, 1080, 360, 240, 1);
	assert.deepEqual(landscape, { sx: 150, sy: 0, sw: 1620, sh: 1080 });
	assert.equal(landscape.sw / landscape.sh, 360 / 240);

	// 2x live zoom cuts visible area in half centered
	const zoomed = ocrMatch.getVideoViewfinderCropRect(1920, 1080, 360, 240, 2);
	assert.deepEqual(zoomed, { sx: 555, sy: 270, sw: 810, sh: 540 });
	assert.equal(zoomed.sw / zoomed.sh, 360 / 240);

	// Fallback when dimensions are 0
	const zero = ocrMatch.getVideoViewfinderCropRect(0, 0, 360, 240, 1);
	assert.deepEqual(zero, { sx: 0, sy: 0, sw: 0, sh: 0 });
});

test('extractMatchRegionDetails extracts union bbox and tilt angle from matched words', () => {
	const vocab = buildIncludes();
	const result = {
		data: {
			words: [
				{ text: 'cat', bbox: { x0: 100, y0: 100, x1: 200, y1: 150 } },
				{ text: 'apple', bbox: { x0: 220, y0: 110, x1: 320, y1: 160 } },
				{ text: 'tomato', bbox: { x0: 340, y0: 120, x1: 440, y1: 170 } }
			]
		}
	};
	const match = {
		words: ['cat', 'apple', 'tomato'],
		code: 'cat apple tomato',
		cityWordCount: 0
	};
	const details = ocrMatch.extractMatchRegionDetails(result, match, vocab.includes, vocab.canonical);
	assert.ok(details);
	assert.deepEqual(details.bbox, { x0: 100, y0: 100, x1: 440, y1: 170 });
	assert.equal(details.center.x, 270);
	assert.equal(details.center.y, 135);
	// first word center: (150, 125), last word center: (390, 145)
	// dx = 240, dy = 20 -> angle = Math.atan2(20, 240) ≈ 0.0831 rad
	assert.ok(Math.abs(details.angle - Math.atan2(20, 240)) < 0.001);
});
