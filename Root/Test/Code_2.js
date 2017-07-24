var span = 0.5;
var n = 1024;
var d = span/n;

function encodeData(value) {
	return Math.floor(value/d);
}

function decodeData(data) {
	return data*d;
}

function encode_(city_begin, position) {
	var code = encode__(city_begin, position);
	var wcode = wordList[word_index_1] + " " + wordList[word_index_2];
	logCode(wcode, lat_diff + " " + lng_diff);
	return wcode;
}

function decode_(city_begin, code) {
	var latLng = decode__( city_begin, [wordList.indexOf(code[0]), wordList.indexOf(code[1])] );
	logDifference(latLng.lat, latLng.lng, lat_diff + " " + lng_diff);
	return {
		lat: (function() {
			return latLng.lat
		})(),
		lng: (function() {
			return latLng.lng
		})()
	};
}

function encode__(city_begin, position) {
	lat_diff = encodeData(position.lat - city_begin.lat);
	lng_diff = encodeData(position.lng - city_begin.lng);
	word_index_1 = lat_diff;
	word_index_2 = lng_diff;

	var code = [word_index_1, word_index_2];
	return code;
}

function decode__(city_begin, code) {
	lat_diff_bin = code[0];
	lng_diff_bin = code[1];
	var lat_diff = decodeData(lat_diff_bin);
	var lng_diff = decodeData(lng_diff_bin);
	lat = lat_diff + city_begin.lat;
	lng = lng_diff + city_begin.lng;

	return({"lat":lat, "lng":lng});
}
