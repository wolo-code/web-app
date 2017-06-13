var factor_lat_1 = 100;
var factor_lat_2 = 3;
var factor_lat_3 = 3;
var factor_lng_1 = 100;
var factor_lng_2 = 3;
var factor_lng_3 = 3;

function encode_(city_begin, position) {
	lat_diff = (position.lat - city_begin.lat) * factor_lat_1;
	lat_diff_1 = Math.floor(lat_diff);
	lat_diff_2_ = (lat_diff - lat_diff_1) * factor_lat_2;
	lat_diff_2 = Math.floor(lat_diff_2_);
	lat_diff_3 = Math.round((lat_diff_2_ - lat_diff_2) * factor_lat_3);
	lng_diff = (position.lng - city_begin.lng) * factor_lng_1;
	lng_diff_1 = Math.floor(lng_diff);
	lng_diff_2_ = (lng_diff - lng_diff_1) * factor_lng_2;
	lng_diff_2 = Math.floor(lng_diff_2_);
	lng_diff_3 = Math.round((lng_diff_2_ - lng_diff_2) * factor_lng_3);
	word_index_1 = (lat_diff_1 << 5) | (lng_diff_1);
	word_index_2 = (lat_diff_2 << 5) | (lng_diff_2);
	word_index_3 = (lat_diff_3 << 5) | (lng_diff_3);
	code = wordList[word_index_1] + " " + wordList[word_index_2] + " " + wordList[word_index_3];

	logCode(code, lat_diff_1 + " " + lat_diff_2 + " " + lat_diff_3 + " " + lng_diff_1 + " " + lng_diff_2 + " " + lng_diff_3);
	return code;
}

function decode_(city_begin, code) {
	word_index_1 = wordList.indexOf(code[0]);
	word_index_2 = wordList.indexOf(code[1]);
	word_index_3 = wordList.indexOf(code[2]);
	lat_diff_1 = word_index_1 >> 5;
	lng_diff_1 = word_index_1 & 0x1F;
	lat_diff_2 = word_index_2 >> 5;
	lng_diff_2 = word_index_2 & 0x1F;
	lat_diff_3 = word_index_3 >> 5;
	lng_diff_3 = word_index_3 & 0x1F;
	lat = (lat_diff_1 + (lat_diff_2 + (lat_diff_3 / factor_lat_3)) / factor_lat_2) / factor_lat_1 + city_begin.lat;
	lng = (lng_diff_1 + (lng_diff_2 + (lng_diff_3 / factor_lng_3)) / factor_lng_2) / factor_lng_1 + city_begin.lng;

	logDifference(lat, lat_diff_1 + " " + lat_diff_2 + " " + lat_diff_3 + " " + lng_diff_1 + " " + lng_diff_2 + " " + lng_diff_3);
	return {
		lat: (function() {
			return lat
		})(),
		lng: (function() {
			return lng
		})()
	};
}
