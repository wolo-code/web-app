const functions = require('firebase-functions');

// 2^(10+5)
var N = 32768;

// LatLng limit
var SPAN = 0.5;

var SPAN_D = SPAN/N;

// resolution of addressable divisions
function ang_span_d(ang) {
	return Math.abs(Math.cos(ang * Math.PI / 180)/SPAN)/N;
}

function encodeData(value, d) {
	return Math.floor(value/d);
}

function decodeData(data, d) {
	return data*d+d/2;
}

exports.encode = functions.https.onRequest((req, res) => {
	
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Content-Type, version');

	//respond to CORS preflight requests
	if (req.method == 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	if(req.headers.version != 1)
		res.send({"error" : "Version mismatch"});
	else
		res.send({"code" : encode(req.body.city_begin, req.body.position)});
	
});

exports.decode = functions.https.onRequest((req, res) => {
	
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Content-Type, version');

	//respond to CORS preflight requests
	if (req.method == 'OPTIONS') {
		res.status(204).send('');
		return;
	}
	
	if(req.headers.version != 1)
		res.send({"error" : "Version mismatch"});
	else		
		res.send(decode(req.body.city_begin, req.body.code));
	
});

function encode(city_begin, position) {
	lat_diff = encodeData(position.lat - city_begin.lat, SPAN_D);
	lng_diff = encodeData(position.lng - city_begin.lng, ang_span_d(city_begin.lng));
	word_index_1 = lat_diff >> 5
	word_index_2 = lng_diff >> 5;
	word_index_3 = (lat_diff & 0x001F) << 5 | (lng_diff & 0x001F);
	var code = [word_index_1, word_index_2, word_index_3];

	//console.log(code, lat_diff + " " + lng_diff);
	return code;
}

function decode(city_begin, code) {
	word_index_1 = code[0];
	word_index_2 = code[1];
	word_index_3 = code[2];
	lat_diff_bin = word_index_1 << 5 | word_index_3 >> 5;
	lng_diff_bin = word_index_2 << 5 | word_index_3 & 0x001F;
	var lat_diff = decodeData(lat_diff_bin, SPAN_D);
	var lng_diff = decodeData(lng_diff_bin, ang_span_d(city_begin.lng));
	lat = lat_diff + city_begin.lat;
	lng = lng_diff + city_begin.lng;

	//console.log(code, lat_diff + " " + lng_diff);
	return({"lat":lat, "lng":lng});
}
