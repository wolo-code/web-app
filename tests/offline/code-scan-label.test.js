'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const matcher = require('../../Root/JS/Component/Root/CodeScanOcrMatch.js');
const vocabulary = ['mail', 'nebula', 'flower', 'cat', 'apple', 'tomato'];
const includes = word => vocabulary.includes(word);
const word = (text, x0, y0, x1, y1, confidence = 95) => ({ text, bbox: { x0, y0, x1, y1 }, confidence });
const box = { x0: 90, y0: 225, x1: 370, y1: 330 };
const codeWords = () => [word('mail', 140, 275, 180, 297), word('nebula', 190, 275, 260, 297), word('flower /', 270, 275, 345, 297)];
const card = { x0: 60, y0: 60, x1: 400, y1: 465 };
const match = (words, labelContainers = [box, card]) => matcher.matchOcrRegionsToWoloCode({ data: { words, labelContainers } }, includes, vocabulary);

function raster(width, height, rectangles = []) {
	const data = new Uint8ClampedArray(width * height * 4).fill(255);
	for(const { x0, y0, x1, y1, radius = 0, missing = '' } of rectangles) {
		const inside = (x, y, inset) => {
			if(x < x0 + inset || x >= x1 - inset || y < y0 + inset || y >= y1 - inset) return false;
			const r = Math.max(0, radius - inset);
			const dx = Math.max(x0 + radius - x, 0, x - (x1 - radius - 1));
			const dy = Math.max(y0 + radius - y, 0, y - (y1 - radius - 1));
			return !r || dx * dx + dy * dy <= r * r;
		};
		for(let y = y0; y < y1; y++) for(let x = x0; x < x1; x++) {
			if(!inside(x, y, 0) || inside(x, y, 2) || missing === 'right' && x >= x1 - 3) continue;
			data.set([105, 183, 207, 255], (y * width + x) * 4);
		}
	}
	return { data };
}

test('detects actual rectangular and rounded borders at several proportions', () => {
	for(const [width, height, radius] of [[220, 80, 0], [220, 150, 12], [140, 190, 10], [300, 100, 16]]) {
		const expected = { x0: 40, y0: 35, x1: 40 + width, y1: 35 + height };
		const detected = matcher.detectLabelRectangles(raster(400, 300, [{ ...expected, radius }]), 400, 300);
		assert.ok(detected.some(candidate => matcher.bboxIoU(candidate, expected) > 0.92), JSON.stringify({ expected, detected }));
	}
});

test('blank images and borders with an entire side missing are rejected', () => {
	assert.deepEqual(matcher.detectLabelRectangles(raster(400, 300), 400, 300), []);
	assert.deepEqual(matcher.detectLabelRectangles(raster(400, 300, [{ x0: 40, y0: 35, x1: 300, y1: 160, missing: 'right' }]), 400, 300), []);
});

function cornerFrame(width, height, rect, leg, thickness, missing = -1) {
	const pixels = raster(width, height);
	let index = 0;
	for(const [x, dx] of [[rect.x0, 1], [rect.x1 - 1, -1]]) {
		for(const [y, dy] of [[rect.y0, 1], [rect.y1 - 1, -1]]) {
			if(index++ === missing) continue;
			for(let along = 0; along < leg; along++) for(let stroke = 0; stroke < thickness; stroke++) {
				pixels.data.set([105, 183, 207, 255], ((y + dy * stroke) * width + x + dx * along) * 4);
				pixels.data.set([105, 183, 207, 255], ((y + dy * along) * width + x + dx * stroke) * 4);
			}
		}
	}
	return pixels;
}

test('four printed corner brackets form a container at different image scales and orientations', () => {
	for(const scale of [0.5, 1, 2]) {
		const width = 600 * scale, height = 400 * scale;
		const rect = { x0: 50 * scale, y0: 50 * scale, x1: 550 * scale, y1: 350 * scale };
		const leg = 28 * scale, thickness = 2 * scale;
		for(const [frame, w, h] of [[rect, width, height], [matcher.rotateLabelBox(rect, width, height, 90), height, width]]) {
			const detected = matcher.detectLabelRectangles(cornerFrame(w, h, frame, leg, thickness), w, h);
			assert.ok(detected.some(box => box.anchored && matcher.bboxIoU(frame, box) > 0.95), JSON.stringify({ frame, detected }));
		}
		for(const missing of [0, 1, 2, 3]) {
			const detected = matcher.detectLabelRectangles(cornerFrame(width, height, rect, leg, thickness, missing), width, height);
			assert.equal(detected.length, 0, 'incomplete corner frame');
		}
	}
	const square = cornerFrame(400, 400, { x0: 50, y0: 50, x1: 350, y1: 350 }, 28, 2);
	assert.equal(matcher.detectLabelRectangles(square, 400, 400).some(box => box.anchored), false);
});

test('estimates mild camera roll from the four printed corners in both directions', () => {
	const width = 480, height = 360;
	const rect = { x0: 85, y0: 110, x1: 395, y1: 250 };
	const upright = cornerFrame(width, height, rect, 34, 3);
	assert.equal(matcher.estimateLabelRoll(upright, width, height), 0);
	for(const angle of [-7, -1.5, 2, 10]) {
		const radians = angle * Math.PI / 180;
		const cos = Math.cos(radians), sin = Math.sin(radians);
		const tilted = raster(width, height);
		for(let y = 0; y < height; y++) for(let x = 0; x < width; x++) {
			const dx = x - width / 2, dy = y - height / 2;
			const sx = Math.round(width / 2 + dx * cos + dy * sin);
			const sy = Math.round(height / 2 - dx * sin + dy * cos);
			if(sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
			const offset = (sy * width + sx) * 4;
			tilted.data.set(upright.data.subarray(offset, offset + 4), (y * width + x) * 4);
		}
		assert.equal(matcher.detectLabelRectangles(tilted, width, height).length, 0);
		const measured = matcher.estimateLabelRoll(tilted, width, height);
		assert.ok(Math.abs(measured - angle) <= 0.35, `expected ${angle}°, estimated ${measured}°`);
	}
});

test('supplied screenshot detects the inner printed box and excludes Ram and Main door', () => {
	const fixture = path.join(__dirname, '../fixtures/scanner-label');
	const { width, height } = JSON.parse(fs.readFileSync(fixture + '.json', 'utf8'));
	const pixels = { data: zlib.inflateSync(fs.readFileSync(fixture + '.rgba.deflate')) };
	const detected = matcher.detectLabelRectangles(pixels, width, height);
	assert.ok(detected.some(candidate => matcher.bboxIoU(candidate, box) > 0.9));
	// Transcribed OCR geometry from the screenshot, including the incorrect review.
	const result = match([
		word('Ram', 214, 176, 245, 188), word('Main door', 205, 196, 255, 208),
		word('\\ Bengaluru', 106, 245, 194, 262), ...codeWords(),
		word('#43, 6th Main, Gaurav Nagar, Phase 7, J.P Nagar', 106, 356, 353, 369),
		word('Bengaluru, Karnataka, India - 560078', 136, 374, 323, 386),
		word('www.wolo.codes', 187, 425, 282, 439),
		word('ram main door benga', 129, 630, 342, 651),
		word('mail', 80, 696, 124, 719), word('nebula', 200, 696, 271, 719), word('flower', 329, 696, 397, 719)
	], detected);
	assert.deepEqual(matcher.splitMatchForReview(result), { city: 'bengaluru', words: ['mail', 'nebula', 'flower'] });
	assert.ok(matcher.bboxIoU(result.regions.container, box) > 0.9);
	assert.ok(matcher.bboxIoU(result.regions.card, card) > 0.9);
	assert.deepEqual(result.metadata, {
		title: 'Ram', segment: 'Main door',
		address_line_1: '#43, 6th Main, Gaurav Nagar, Phase 7, J.P Nagar',
		address_line_2: 'Bengaluru, Karnataka, India - 560078',
		address: '#43, 6th Main, Gaurav Nagar, Phase 7, J.P Nagar\n\nBengaluru, Karnataka, India - 560078'
	});
});

test('a row of dictionary words without a detected rectangle produces no candidate', () => {
	assert.equal(match(codeWords(), []), null);
	assert.equal(matcher.matchOcrRegionsToWoloCode({ data: { words: codeWords(), text: 'mail nebula flower' } }, includes, vocabulary), null);
});

test('all three code words must be fully inside the same detected rectangle', () => {
	assert.equal(match([word('mail', 60, 275, 140, 297), ...codeWords().slice(1)]), null);
	assert.equal(match(codeWords(), [{ ...box, x1: 200 }, { ...box, x0: 210 }]), null);
	assert.equal(match([...codeWords(), word('cat', 348, 275, 365, 297)]), null);
});

test('city can be wider than the words and need not overlap their horizontal span', () => {
	const result = match([word('New', 95, 245, 115, 260), word('Delhi', 120, 245, 170, 260), ...codeWords()]);
	assert.equal(result.code, 'new delhi mail nebula flower');
	const left = match([word('Bunbury', 95, 245, 130, 260), ...codeWords()]);
	assert.equal(matcher.splitMatchForReview(left).city, 'bunbury');
});

test('city uses the nearest row above the words and never text outside or below the box', () => {
	const result = match([
		word('Wrong', 120, 210, 180, 230), word('Heading', 120, 229, 180, 240),
		word('Bengaluru', 110, 245, 200, 263), ...codeWords(),
		word('Karnataka', 110, 305, 200, 320), word('Delhi', 371, 245, 420, 263)
	]);
	assert.equal(result.code, 'bengaluru mail nebula flower');
});

test('optional unreadable metadata and city do not prevent review of three words', () => {
	const result = match([
		word('Ram', 214, 176, 245, 188, 20), word('Bengaluru', 110, 245, 200, 263, 20),
		...codeWords(), word('Address', 110, 350, 200, 365, 20)
	]);
	assert.equal(result.code, 'mail nebula flower');
	assert.deepEqual(result.metadata, { title: '', segment: '', address_line_1: '', address_line_2: '', address: '' });
	assert.equal(result.regions.city, null);
	assert.equal(result.highConfidence, true);
	const uncertain = codeWords(); uncertain[1].confidence = 89;
	assert.equal(match(uncertain).highConfidence, false);
	const badCode = codeWords(); badCode[1].confidence = 20;
	assert.equal(match(badCode), null);
});

test('logo and footer OCR leave missing label details blank in both passes', () => {
	const variants = [
		[
			[word('olo', 170, 85, 218, 110), word('code', 222, 93, 275, 109)],
			[word('scan or enter at', 145, 435, 300, 452)]
		],
		[
			[word('\\W0L0/C0DE', 170, 85, 275, 110)],
			[word('w0lo . c0des', 170, 435, 290, 452)]
		],
		[
			[word('Wolo', 170, 85, 218, 110), word('Code', 222, 111, 275, 125)],
			[word('scan 0r enter at wolo,codes', 120, 435, 335, 452)]
		]
	];
	for(const [logo, footer] of variants) {
		const decorations = [...logo, ...footer];
		const expected = match(codeWords());
		const initial = match([...codeWords(), ...decorations]);
		const reread = matcher.fillLabelMetadata(match(codeWords()), decorations);
		assert.deepEqual(initial, expected);
		assert.deepEqual(reread, expected);
	}
});

test('one heading and one address stay in the first fields alongside misread branding', () => {
	const result = match([
		...codeWords(), word('olo code', 170, 85, 275, 110),
		word('Code House', 170, 176, 275, 190),
		word('12 Wolo Road', 170, 350, 275, 365), word('scan or enter at', 145, 435, 300, 452)
	]);
	assert.deepEqual(result.metadata, {
		title: 'Code House', segment: '', address_line_1: '12 Wolo Road', address_line_2: '', address: '12 Wolo Road'
	});
});

test('dictionary correction only applies to the code row; punctuation survives in metadata', () => {
	const result = match([
		word('Ram & Sons', 160, 176, 280, 188), word('Main door', 205, 196, 255, 208),
		word('Bunbury', 110, 245, 200, 263), word('mai1', 140, 275, 180, 297), ...codeWords().slice(1),
		word('#43, Main St. (Unit 2)', 106, 350, 300, 365)
	]);
	assert.equal(result.code, 'bunbury mail nebula flower');
	assert.equal(result.metadata.title, 'Ram & Sons');
	assert.equal(result.metadata.address, '#43, Main St. (Unit 2)');
});

test('separate nearby labels do not mix their code words, cities or metadata', () => {
	const result = match([
		...codeWords(), word('Bengaluru', 110, 245, 200, 263),
		word('Delhi', 400, 245, 460, 263), word('cat', 400, 275, 430, 292),
		word('apple', 440, 275, 480, 292), word('tomato', 490, 275, 550, 292),
		word('Other title', 400, 200, 480, 215)
	], [box, { x0: 390, y0: 225, x1: 570, y1: 330 }]);
	assert.equal(result.code, 'bengaluru mail nebula flower');
	assert.equal(result.metadata.title, '');
});

test('two wrapped address paragraphs preserve line 1 then line 2 with an empty line', () => {
	const result = match([
		...codeWords(), word('Ram', 200, 175, 240, 187), word('Main door', 190, 195, 260, 207),
		word('12 Long Road,', 70, 340, 230, 352), word('Bengaluru 560078', 70, 355, 230, 367),
		word('Flat 4B,', 70, 390, 230, 402), word('Second floor', 70, 405, 230, 417),
		word('www.wolo.codes', 160, 440, 300, 452), word('Background text', 70, 470, 230, 482)
	]);
	assert.equal(result.metadata.title, 'Ram');
	assert.equal(result.metadata.segment, 'Main door');
	assert.equal(result.metadata.address_line_1, '12 Long Road, Bengaluru 560078');
	assert.equal(result.metadata.address_line_2, 'Flat 4B, Second floor');
	assert.equal(result.metadata.address, '12 Long Road, Bengaluru 560078\n\nFlat 4B, Second floor');
});

test('metadata can extend beyond the code width but must be inside the whole card', () => {
	const result = match([
		...codeWords(), word('Wide title', 65, 180, 395, 195),
		word('12 Long Road', 65, 350, 395, 365), word('Outside', 30, 380, 395, 395)
	]);
	assert.equal(result.metadata.title, 'Wide title');
	assert.equal(result.metadata.address_line_1, '12 Long Road');
	assert.equal(result.metadata.address_line_2, '');
});

test('missing outer card keeps the code usable and leaves outside text for manual optional editing', () => {
	const result = match([word('Background title', 150, 180, 300, 195), ...codeWords()], [box]);
	assert.equal(result.code, 'mail nebula flower');
	assert.equal(result.regions.card, null);
	assert.equal(result.metadata.title, '');
});

test('title and segment may sit high above a shallow code box within the card', () => {
	const result = match([
		word('Wolo Code', 100, 65, 300, 80), word('Ram', 180, 100, 220, 115),
		word('Main door', 160, 130, 240, 145), ...codeWords()
	]);
	assert.equal(result.metadata.title, 'Ram');
	assert.equal(result.metadata.segment, 'Main door');
});

test('detail bands stay inside the card, nearest strips above and below the code first', () => {
	const bands = matcher.detailScanBands(box, card);
	const below = bands.filter(band => band.role === 'below');
	assert.equal(bands[0].role, 'above');
	assert.ok(bands[0].y1 <= box.y0);
	assert.ok(bands[0].y0 <= 176 && bands[0].y1 >= 208);
	assert.ok(bands[0].y0 > 130);
	assert.ok(below.length > 1);
	assert.ok(below[0].y0 >= box.y1 && below[0].y0 < below[1].y0);
	assert.ok(below[0].y1 < card.y1 - 2);
	below.forEach(band => {
		assert.ok(band.y1 <= card.y1);
		assert.ok(band.x0 >= card.x0 && band.x1 <= card.x1);
	});
	assert.equal(matcher.detailScanBands(box, null).length, 0);
});

test('band text fills a blank title, segment, and address and does not replace the code', () => {
	const found = match([word('Bengaluru', 110, 245, 200, 263), ...codeWords()]);
	assert.equal(found.metadata.title, '');
	matcher.fillLabelMetadata(found, [
		word('Ram', 180, 170, 230, 185), word('Main', 170, 196, 210, 208), word('door', 214, 196, 260, 208),
		word('#43, 6th Main, Gaurav Nagar', 100, 350, 360, 365),
		word('Bengaluru, Karnataka, India - 560078', 120, 400, 340, 415),
		word('www.wolo.codes', 160, 440, 300, 452, 90)
	]);
	assert.equal(found.code, 'bengaluru mail nebula flower');
	assert.equal(found.metadata.title, 'Ram');
	assert.equal(found.metadata.segment, 'Main door');
	assert.equal(found.metadata.address_line_1, '#43, 6th Main, Gaurav Nagar');
	assert.equal(found.metadata.address_line_2, 'Bengaluru, Karnataka, India - 560078');
	const kept = match([word('Home', 180, 170, 230, 185), ...codeWords()]);
	matcher.fillLabelMetadata(kept, [word('Ram', 180, 150, 230, 165)]);
	assert.equal(kept.metadata.title, 'Home');
	assert.equal(kept.metadata.segment, '');
});

test('blank detail OCR rows do not take the first address slot', () => {
	const found = match(codeWords());
	const address = word('12 Main Road', 120, 387, 340, 403);
	matcher.fillLabelMetadata(found, [word('  ', 115, 344, 280, 359), address]);
	assert.equal(found.metadata.address_line_1, address.text);
	assert.equal(found.metadata.address_line_2, '');
	assert.equal(found.metadata.address, address.text);
	assert.deepEqual(found.regions.address_line_1, address.bbox);
	assert.equal(found.regions.address_line_2, null);
});

test('address line 2 on its own has no leading blank paragraph', () => {
	assert.equal(matcher.formatScanAddress({ address_line_1: '', address_line_2: 'Flat 4B' }), 'Flat 4B');
	assert.equal(matcher.formatScanAddress({ address_line_1: '  ', address_line_2: ' Flat 4B ' }), 'Flat 4B');
});

test('reframing prefers the code near the image focus without restricting recognition to a guide', () => {
	const result = matcher.matchOcrRegionsToWoloCode({ data: {
		words: [...codeWords(), word('cat', 450, 275, 480, 295), word('apple', 490, 275, 530, 295), word('tomato', 540, 275, 590, 295)],
		labelContainers: [box, { x0: 440, y0: 225, x1: 620, y1: 330 }], scanFocus: { x: 530, y: 280 }
	} }, includes, vocabulary);
	assert.equal(result.code, 'cat apple tomato');
});
