/**
 * DIGIPIN codec (trimmed vendor of digipinjs-lib).
 * Algorithm per India Post DIGIPIN Technical Specification (March 2025).
 * Source: https://github.com/DEADSERPENT/digipin (MIT)
 */
(function(global) {
	'use strict';

	var LAT_MIN = 2.5;
	var LAT_MAX = 38.5;
	var LON_MIN = 63.5;
	var LON_MAX = 99.5;
	var DIGIPIN_LEVELS = 10;
	var GRID_SUBDIVISION = 4;
	var DIGIPIN_ALPHABET = '23456789CFJKLMPT';
	var _SPIRAL_GRID = [
		['F', 'C', '9', '8'],
		['J', '3', '2', '7'],
		['K', '4', '5', '6'],
		['L', 'M', 'P', 'T']
	];
	var _SYMBOL_TO_POS = {};
	var _ALPHABET_SET = {};
	var i;
	var r;
	var c;

	for (r = 0; r < 4; r++) {
		for (c = 0; c < 4; c++) {
			_SYMBOL_TO_POS[_SPIRAL_GRID[r][c]] = {row: r, col: c};
		}
	}
	for (i = 0; i < DIGIPIN_ALPHABET.length; i++) {
		_ALPHABET_SET[DIGIPIN_ALPHABET.charAt(i)] = true;
	}

	function isValidCoordinate(lat, lon) {
		return lat >= LAT_MIN && lat <= LAT_MAX && lon >= LON_MIN && lon <= LON_MAX;
	}

	function isValid(code, strict) {
		if (!code || typeof code !== 'string') {
			return false;
		}
		var upper = code.toUpperCase();
		var len = upper.length;
		var ch;
		if (strict && len !== DIGIPIN_LEVELS) {
			return false;
		}
		if (len < 1 || len > DIGIPIN_LEVELS) {
			return false;
		}
		for (i = 0; i < len; i++) {
			ch = upper.charAt(i);
			if (!_ALPHABET_SET[ch]) {
				return false;
			}
		}
		return true;
	}

	function encode(lat, lon, precision) {
		if (typeof lat !== 'number' || typeof lon !== 'number') {
			throw new Error('Latitude and longitude must be numbers');
		}
		if (!isValidCoordinate(lat, lon)) {
			throw new Error('Coordinates are outside India DIGIPIN bounds');
		}
		if (typeof precision === 'undefined') {
			precision = DIGIPIN_LEVELS;
		}
		if (precision < 1 || precision > DIGIPIN_LEVELS) {
			throw new Error('Precision must be between 1 and 10');
		}

		var code = '';
		var minLat = LAT_MIN;
		var maxLat = LAT_MAX;
		var minLon = LON_MIN;
		var maxLon = LON_MAX;
		var level;
		var latStep;
		var lonStep;
		var row;
		var col;

		for (level = 0; level < precision; level++) {
			latStep = (maxLat - minLat) / GRID_SUBDIVISION;
			lonStep = (maxLon - minLon) / GRID_SUBDIVISION;
			row = 3 - Math.floor((lat - minLat) / latStep);
			col = Math.floor((lon - minLon) / lonStep);
			row = Math.max(0, Math.min(row, 3));
			col = Math.max(0, Math.min(col, 3));
			code += _SPIRAL_GRID[row][col];
			maxLat = minLat + latStep * (4 - row);
			minLat = minLat + latStep * (3 - row);
			minLon = minLon + lonStep * col;
			maxLon = minLon + lonStep;
		}

		return code;
	}

	function decode(code) {
		if (!isValid(code)) {
			throw new Error('Invalid DIGIPIN code: ' + code);
		}
		var upper = code.toUpperCase();
		var minLat = LAT_MIN;
		var maxLat = LAT_MAX;
		var minLon = LON_MIN;
		var maxLon = LON_MAX;
		var ch;
		var pos;
		var latStep;
		var lonStep;
		var lat1;
		var lat2;
		var lon1;
		var lon2;

		for (i = 0; i < upper.length; i++) {
			ch = upper.charAt(i);
			pos = _SYMBOL_TO_POS[ch];
			latStep = (maxLat - minLat) / GRID_SUBDIVISION;
			lonStep = (maxLon - minLon) / GRID_SUBDIVISION;
			lat1 = maxLat - latStep * (pos.row + 1);
			lat2 = maxLat - latStep * pos.row;
			lon1 = minLon + lonStep * pos.col;
			lon2 = minLon + lonStep * (pos.col + 1);
			minLat = lat1;
			maxLat = lat2;
			minLon = lon1;
			maxLon = lon2;
		}

		return {lat: (minLat + maxLat) / 2, lon: (minLon + maxLon) / 2};
	}

	function normalizeInput(value) {
		return String(value || '').replace(/[\s\-]/g, '').toUpperCase();
	}

	function looksLikeDigipin(value) {
		var code = normalizeInput(value);
		return code.length === DIGIPIN_LEVELS && isValid(code, true);
	}

	var digipin = {
		encode: encode,
		decode: decode,
		isValid: isValid,
		isValidCoordinate: isValidCoordinate,
		normalizeInput: normalizeInput,
		looksLikeDigipin: looksLikeDigipin,
		DIGIPIN_LEVELS: DIGIPIN_LEVELS,
		DIGIPIN_ALPHABET: DIGIPIN_ALPHABET
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = digipin;
	}
	if (typeof global !== 'undefined') {
		global.digipin = digipin;
	}
})(typeof window !== 'undefined' ? window : global);
