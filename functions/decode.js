const code_common = require('./code_common');
const getCityBegin = code_common.getCityBegin;
const lat_span_half = code_common.lat_span_half;
const lng_span_half = code_common.lng_span_half;

const functions = require('firebase-functions');

exports.decode = functions.https.onRequest((req, res) => {

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
	else
		res.send(decode(getCityBegin(req.body.city_center), req.body.code));

});

function decode(city_begin, code) {
	const word_index_1 = code[0];
	const word_index_2 = code[1];
	const word_index_3 = code[2];
	const lat_diff_bin = word_index_1 << 5 | word_index_3 >> 5;
	const lng_diff_bin = word_index_2 << 5 | word_index_3 & 0x001F;
	const lat_diff = decodeData(lat_diff_bin, lat_span_half(city_begin.lat)*2);
	const lng_diff = decodeData(lng_diff_bin, lng_span_half(city_begin.lat)*2);
	const lat = city_begin.lat + lat_diff;
	const lng = city_begin.lng + lng_diff;

	return({'lat':lat, 'lng':lng});
}

function decodeData(data, d) {
	return data*d;
}
