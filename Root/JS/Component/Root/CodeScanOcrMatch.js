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
		isCodeScanSupported: isCodeScanSupported
	};

	if(typeof module !== 'undefined' && module.exports) {
		module.exports = codeScanOcrMatch;
	}
	if(typeof global !== 'undefined') {
		global.codeScanOcrMatch = codeScanOcrMatch;
	}
})(typeof window !== 'undefined' ? window : global);
