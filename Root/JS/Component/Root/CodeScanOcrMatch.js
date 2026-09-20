/**
 * Match noisy on-device OCR text to a valid Wolo Code using the known word list.
 */
(function(global) {
	'use strict';

	function normalizeOcrText(text) {
		if(!text)
			return '';
		return String(text)
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
	}

	function levenshteinDistance(a, b) {
		var i;
		var j;
		var cost;
		var prev;
		var curr;
		if(a === b)
			return 0;
		if(!a)
			return b.length;
		if(!b)
			return a.length;
		prev = new Array(b.length + 1);
		curr = new Array(b.length + 1);
		for(j = 0; j <= b.length; j++)
			prev[j] = j;
		for(i = 1; i <= a.length; i++) {
			curr[0] = i;
			for(j = 1; j <= b.length; j++) {
				cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
				curr[j] = Math.min(
					curr[j - 1] + 1,
					prev[j] + 1,
					prev[j - 1] + cost
				);
			}
			prev = curr.slice();
		}
		return prev[b.length];
	}

	function fuzzyMatchWord(token, includesFn, canonicalWords) {
		var maxDist;
		var best = null;
		var bestDist = 99;
		var i;
		var word;
		var dist;
		if(!token || token.length < 2)
			return null;
		if(includesFn(token))
			return token;
		maxDist = token.length <= 4 ? 1 : 2;
		for(i = 0; i < canonicalWords.length; i++) {
			word = canonicalWords[i];
			if(Math.abs(word.length - token.length) > maxDist)
				continue;
			dist = levenshteinDistance(token, word);
			if(dist <= maxDist && dist < bestDist) {
				bestDist = dist;
				best = word;
			}
		}
		return best;
	}

	function correctTokens(tokens, includesFn, canonicalWords) {
		var corrected = [];
		var i;
		var match;
		for(i = 0; i < tokens.length; i++) {
			match = fuzzyMatchWord(tokens[i], includesFn, canonicalWords);
			corrected.push(match || tokens[i]);
		}
		return corrected;
	}

	function findWoloCodeInTokens(tokens, includesFn) {
		var i;
		var w1;
		var w2;
		var w3;
		var cityWords;
		var match = null;
		if(!tokens || tokens.length < 3)
			return null;
		for(i = 0; i <= tokens.length - 3; i++) {
			w1 = tokens[i];
			w2 = tokens[i + 1];
			w3 = tokens[i + 2];
			if(!includesFn(w1) || !includesFn(w2) || !includesFn(w3))
				continue;
			cityWords = tokens.slice(0, i);
			match = {
				words: cityWords.concat([w1, w2, w3]),
				code: cityWords.concat([w1, w2, w3]).join(' '),
				cityWordCount: cityWords.length,
				index: i
			};
		}
		return match;
	}

	function matchOcrTextToWoloCode(text, includesFn, canonicalWords) {
		var normalized = normalizeOcrText(text);
		var tokens;
		var corrected;
		if(!normalized)
			return null;
		tokens = normalized.split(' ').filter(Boolean);
		if(!tokens.length)
			return null;
		corrected = correctTokens(tokens, includesFn, canonicalWords || []);
		return findWoloCodeInTokens(corrected, includesFn);
	}

	function splitMatchForReview(match) {
		var cityCount;
		var cityWords;
		var woloWords;
		if(!match || !match.words || match.words.length < 3)
			return {city: '', words: ['', '', '']};
		cityCount = typeof match.cityWordCount == 'number' ? match.cityWordCount : 0;
		cityWords = match.words.slice(0, cityCount);
		woloWords = match.words.slice(cityCount);
		return {
			city: cityWords.join(' '),
			words: [woloWords[0] || '', woloWords[1] || '', woloWords[2] || '']
		};
	}

	function buildCodeFromReview(city, w1, w2, w3) {
		var parts = [];
		var cityTokens;
		var word;
		cityTokens = normalizeOcrText(city).split(' ').filter(Boolean);
		parts = parts.concat(cityTokens);
		word = normalizeOcrText(w1);
		if(word)
			parts.push(word);
		word = normalizeOcrText(w2);
		if(word)
			parts.push(word);
		word = normalizeOcrText(w3);
		if(word)
			parts.push(word);
		return parts.join(' ');
	}

	function validateReviewWords(w1, w2, w3, includesFn) {
		var words = [normalizeOcrText(w1), normalizeOcrText(w2), normalizeOcrText(w3)];
		var i;
		for(i = 0; i < words.length; i++) {
			if(!words[i] || !includesFn(words[i]))
				return false;
		}
		return true;
	}

	function bboxIoU(a, b) {
		var x0;
		var y0;
		var x1;
		var y1;
		var interW;
		var interH;
		var inter;
		var areaA;
		var areaB;
		if(!a || !b)
			return 0;
		x0 = Math.max(a.x0, b.x0);
		y0 = Math.max(a.y0, b.y0);
		x1 = Math.min(a.x1, b.x1);
		y1 = Math.min(a.y1, b.y1);
		interW = Math.max(0, x1 - x0);
		interH = Math.max(0, y1 - y0);
		inter = interW * interH;
		areaA = Math.max(0, a.x1 - a.x0) * Math.max(0, a.y1 - a.y0);
		areaB = Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
		if(areaA <= 0 || areaB <= 0)
			return 0;
		return inter / (areaA + areaB - inter);
	}

	function unionBboxes(bboxes) {
		var i;
		var bbox;
		var union = null;
		for(i = 0; i < bboxes.length; i++) {
			bbox = bboxes[i];
			if(!bbox)
				continue;
			if(!union) {
				union = {
					x0: bbox.x0,
					y0: bbox.y0,
					x1: bbox.x1,
					y1: bbox.y1
				};
				continue;
			}
			union.x0 = Math.min(union.x0, bbox.x0);
			union.y0 = Math.min(union.y0, bbox.y0);
			union.x1 = Math.max(union.x1, bbox.x1);
			union.y1 = Math.max(union.y1, bbox.y1);
		}
		return union;
	}

	function getCenteredFixedGuideBBox(width, height, aspect) {
		var cropWidth;
		var cropHeight;
		var sx;
		var sy;
		if(!width || !height)
			return null;
		if(width / height >= aspect) {
			cropHeight = height;
			cropWidth = Math.round(height * aspect);
		}
		else {
			cropWidth = width;
			cropHeight = Math.round(width / aspect);
		}
		sx = Math.max(0, Math.round((width - cropWidth) / 2));
		sy = Math.max(0, Math.round((height - cropHeight) / 2));
		return {
			x0: sx,
			y0: sy,
			x1: sx + cropWidth,
			y1: sy + cropHeight
		};
	}

	function isAspectRatioNear(bbox, targetAspect, tolerance) {
		var width;
		var height;
		var ratio;
		if(!bbox || !targetAspect)
			return false;
		width = bbox.x1 - bbox.x0;
		height = bbox.y1 - bbox.y0;
		if(width <= 0 || height <= 0)
			return false;
		ratio = width / height;
		return ratio >= targetAspect * (1 - tolerance) && ratio <= targetAspect * (1 + tolerance);
	}

	function luminanceAt(data, width, x, y) {
		var i = (y * width + x) * 4;
		return data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
	}

	function measureRectEdgeContrast(imageData, width, height, rect, sampleStep) {
		var data = imageData.data;
		var samples = 0;
		var total = 0;
		var x;
		var y;
		var inner;
		var outer;
		var step = sampleStep || 4;
		if(!rect || width <= 0 || height <= 0)
			return 0;
		for(x = rect.x0; x < rect.x1; x += step) {
			if(rect.y0 > 0) {
				inner = luminanceAt(data, width, x, rect.y0);
				outer = luminanceAt(data, width, x, rect.y0 - 1);
				total += Math.abs(inner - outer);
				samples += 1;
			}
			if(rect.y1 < height - 1) {
				inner = luminanceAt(data, width, x, rect.y1 - 1);
				outer = luminanceAt(data, width, x, rect.y1);
				total += Math.abs(inner - outer);
				samples += 1;
			}
		}
		for(y = rect.y0; y < rect.y1; y += step) {
			if(rect.x0 > 0) {
				inner = luminanceAt(data, width, rect.x0, y);
				outer = luminanceAt(data, width, rect.x0 - 1, y);
				total += Math.abs(inner - outer);
				samples += 1;
			}
			if(rect.x1 < width - 1) {
				inner = luminanceAt(data, width, rect.x1 - 1, y);
				outer = luminanceAt(data, width, rect.x1, y);
				total += Math.abs(inner - outer);
				samples += 1;
			}
		}
		return samples ? total / samples : 0;
	}

	function extractMatchBBoxFromOcr(result, match, includesFn, canonicalWords) {
		var ocrWords = result && result.data && result.data.words;
		var wanted;
		var bboxes = [];
		var i;
		var word;
		var token;
		var corrected;
		if(!ocrWords || !match || !match.words)
			return null;
		wanted = {};
		for(i = 0; i < match.words.length; i++)
			wanted[match.words[i]] = true;
		for(i = 0; i < ocrWords.length; i++) {
			word = ocrWords[i];
			if(!word || !word.text || !word.bbox)
				continue;
			token = normalizeOcrText(word.text).split(' ').filter(Boolean)[0];
			if(!token)
				continue;
			corrected = fuzzyMatchWord(token, includesFn, canonicalWords) || token;
			if(wanted[corrected])
				bboxes.push(word.bbox);
		}
		return unionBboxes(bboxes);
	}

	function isFixedBorderReady(canvas, matchBBox, aspect, tolerance, minContrast) {
		var guide;
		var ctx;
		var imageData;
		var contrast;
		if(!canvas || !matchBBox)
			return false;
		guide = getCenteredFixedGuideBBox(canvas.width, canvas.height, aspect);
		if(!guide)
			return false;
		if(!isAspectRatioNear(matchBBox, aspect, tolerance))
			return false;
		if(bboxIoU(matchBBox, guide) < 0.35)
			return false;
		ctx = canvas.getContext('2d');
		if(!ctx)
			return false;
		imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		contrast = measureRectEdgeContrast(imageData, canvas.width, canvas.height, guide);
		return contrast >= (minContrast || 12);
	}

	function isCodeScanSupported() {
		return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
	}

	var codeScanOcrMatch = {
		normalizeOcrText: normalizeOcrText,
		levenshteinDistance: levenshteinDistance,
		fuzzyMatchWord: fuzzyMatchWord,
		correctTokens: correctTokens,
		findWoloCodeInTokens: findWoloCodeInTokens,
		matchOcrTextToWoloCode: matchOcrTextToWoloCode,
		splitMatchForReview: splitMatchForReview,
		buildCodeFromReview: buildCodeFromReview,
		validateReviewWords: validateReviewWords,
		bboxIoU: bboxIoU,
		unionBboxes: unionBboxes,
		getCenteredFixedGuideBBox: getCenteredFixedGuideBBox,
		isAspectRatioNear: isAspectRatioNear,
		measureRectEdgeContrast: measureRectEdgeContrast,
		extractMatchBBoxFromOcr: extractMatchBBoxFromOcr,
		isFixedBorderReady: isFixedBorderReady,
		isCodeScanSupported: isCodeScanSupported
	};

	if(typeof module !== 'undefined' && module.exports) {
		module.exports = codeScanOcrMatch;
	}
	if(typeof global !== 'undefined') {
		global.codeScanOcrMatch = codeScanOcrMatch;
	}
})(typeof window !== 'undefined' ? window : global);
