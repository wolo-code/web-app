const code_common = require('./code_common');
const getCityBegin = code_common.getCityBegin;
const lat_span_half = code_common.lat_span_half;
const lng_span_half = code_common.lng_span_half;
const N = code_common.N;

const functions = require('firebase-functions');

exports.encode = functions.https.onRequest((req, res) => {

	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', "Content-Type, version");
	res.set('Cache-Control', "public, max-age=300, s-maxage=600");

	//respond to CORS preflight requests
	if (req.method == 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	if(req.headers.version != 1)
		res.send({'error' : "Version mismatch"});
	else {
		const code = encode(getCityBegin(req.body.city_center), req.body.position);
		if(code == null) {
			console.log("Error: Out of WCode index limit");
			console.log(req.body.city_center);
			console.log(req.body.position);
			res.status(416).send('');
		}
		else
			res.send({'code' : code});
	}

});

function encode(city_begin, position) {
	const lat_diff = encodeData(position.lat - city_begin.lat, lat_span_half(city_begin.lat)*2);
	if(lat_diff == null)
		return null;
	const lng_diff = encodeData(position.lng - city_begin.lng, lng_span_half(city_begin.lat)*2);
	if(lng_diff == null)
		return null;

	const word_index_1 = lat_diff >> 5;
	const word_index_2 = lng_diff >> 5;
	const word_index_3 = (lat_diff & 0x001F) << 5 | (lng_diff & 0x001F);
	const code = [word_index_1, word_index_2, word_index_3];

	return code;
}

function encodeData(value, d) {
	const i = Math.round(value/d);
	if(i < 0 || i >= N)
		return null;
	else
		return i;
}
