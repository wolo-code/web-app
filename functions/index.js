const functions = require('firebase-functions');

var factor_lat_1 = 100;
var factor_lat_2 = 3;
var factor_lat_3 = 3;
var factor_lng_1 = 100;
var factor_lng_2 = 3;
var factor_lng_3 = 3;

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
	code = [ word_index_1, word_index_2, word_index_3];

	//console.log(code, lat_diff_1 + " " + lat_diff_2 + " " + lat_diff_3 + " " + lng_diff_1 + " " + lng_diff_2 + " " + lng_diff_3);
	return code;
}

function decode(city_begin, code) {
	lat_diff_1 = code[0] >> 5;
	lng_diff_1 = code[0] & 0x1F;
	lat_diff_2 = code[1] >> 5;
	lng_diff_2 = code[1] & 0x1F;
	lat_diff_3 = code[2] >> 5;
	lng_diff_3 = code[2] & 0x1F;
	lat = (lat_diff_1 + (lat_diff_2 + (lat_diff_3 / factor_lat_3)) / factor_lat_2) / factor_lat_1 + city_begin.lat;
	lng = (lng_diff_1 + (lng_diff_2 + (lng_diff_3 / factor_lng_3)) / factor_lng_2) / factor_lng_1 + city_begin.lng;

	//console.log(code, lat_diff_1 + " " + lat_diff_2 + " " + lat_diff_3 + " " + lng_diff_1 + " " + lng_diff_2 + " " + lng_diff_3);
	return({"lat":lat, "lng":lng});
}
