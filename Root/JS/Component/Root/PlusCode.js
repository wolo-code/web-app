/**
 * Open Location Code / Plus Code encoder (trimmed from google/open-location-code).
 * Apache License 2.0. Source: https://github.com/google/open-location-code
 */
(function(global) {
	'use strict';

	var CODE_ALPHABET = '23456789CFGHJMPQRVWX';
	var ENCODING_BASE = 20;
	var SEPARATOR = '+';
	var SEPARATOR_POSITION = 8;
	var PAIR_CODE_LENGTH = 10;
	var PAIR_PRECISION = 8000;
	var LATITUDE_MAX = 90;
	var LONGITUDE_MAX = 180;

	function clipLatitude(latitude) {
		return Math.min(LATITUDE_MAX, Math.max(-LATITUDE_MAX, latitude));
	}

	function normalizeLongitude(longitude) {
		while (longitude < -LONGITUDE_MAX) {
			longitude += 2 * LONGITUDE_MAX;
		}
		while (longitude >= LONGITUDE_MAX) {
			longitude -= 2 * LONGITUDE_MAX;
		}
		return longitude;
	}

	function encode(latitude, longitude) {
		if (typeof latitude !== 'number' || typeof longitude !== 'number' || !isFinite(latitude) || !isFinite(longitude)) {
			throw new Error('Latitude and longitude must be finite numbers');
		}
		latitude = clipLatitude(latitude);
		longitude = normalizeLongitude(longitude);
		if (latitude === LATITUDE_MAX) {
			latitude = latitude - (1 / PAIR_PRECISION);
		}

		var latInt = Math.floor((latitude + LATITUDE_MAX) * PAIR_PRECISION);
		var lngInt = Math.floor((longitude + LONGITUDE_MAX) * PAIR_PRECISION);
		var maxLatInt = 2 * LATITUDE_MAX * PAIR_PRECISION;
		if (latInt >= maxLatInt) {
			latInt = maxLatInt - 1;
		}

		var latChars = [];
		var lngChars = [];
		var i;
		var code = '';
		for (i = 0; i < PAIR_CODE_LENGTH / 2; i++) {
			latChars.push(CODE_ALPHABET.charAt(latInt % ENCODING_BASE));
			lngChars.push(CODE_ALPHABET.charAt(lngInt % ENCODING_BASE));
			latInt = Math.floor(latInt / ENCODING_BASE);
			lngInt = Math.floor(lngInt / ENCODING_BASE);
		}
		for (i = latChars.length - 1; i >= 0; i--) {
			code += latChars[i] + lngChars[i];
			if (code.length === SEPARATOR_POSITION) {
				code += SEPARATOR;
			}
		}
		return code;
	}

	var pluscode = {
		encode: encode
	};

	if (typeof module !== 'undefined' && module.exports) {
		module.exports = pluscode;
	}
	if (typeof global !== 'undefined') {
		global.pluscode = pluscode;
	}
})(typeof window !== 'undefined' ? window : global);
