var factor_lat_1 = 111.321543;
var factor_lat_2 = factor_lat_1 / 32;
var factor_long_1 = (Math.cos(13.057556) * 111.321543);
var factor_long_2 = factor_long_1 / 32;

function encode_(city_begin, position) {
	var lat_diff = (position.lat - city_begin.lat) * factor_lat_1;
	var lat_diff_1 = Math.floor(lat_diff);
	var lat_diff_2 = Math.round((lat_diff - lat_diff_1) * factor_lat_2);
	var long_diff = (position.lng - city_begin.lng) * factor_long_1;
	var long_diff_1 = Math.floor(long_diff);
	var long_diff_2 = Math.round((long_diff - long_diff_1) * factor_long_2);
	var word_index_1 = (lat_diff_1 << 5) | (long_diff_1);
	var word_index_2 = (lat_diff_2 << 5) | (long_diff_2);
	var code = wordList[word_index_1] + " " + wordList[word_index_2];

	logCode(code, lat_diff_1 + " " + lat_diff_2 + " " + long_diff_1 + " " + long_diff_2);
	return code;
}

function decode_(city_begin, code) {
	var word_index_1 = wordList.indexOf(code[0]);
	var word_index_2 = wordList.indexOf(code[1]);
	var lat_diff_1 = word_index_1 >> 5;
	var long_diff_1 = word_index_1 & 0x1F;
	var lat_diff_2 = word_index_2 >> 5;
	var long_diff_2 = word_index_2 & 0x1F;
	var lat = (lat_diff_1 + Math.round(lat_diff_2 / factor_lat_2)) / factor_lat_1 + city_begin.lat;
	var long = (long_diff_1 + Math.round(long_diff_2 / factor_long_2))  / factor_long_1 + city_begin.lng;

	logDifference(lat, long, lat_diff_1 + " " + lat_diff_2 + " " + long_diff_1 + " " + long_diff_2);
	return {
		lat: (function() {
			return lat
		})(),
		lng: (function() {
			return long
		})()
	};
}
