/**
 * Encodes Coordinates to words
 *
 * @param {!Object} req Cloud Function request context.
 * @param {!Object} res Cloud Function response context.
 */
 
var factor_lat_1 = 100;
var factor_lat_2 = 3;
var factor_lat_3 = 3;
var factor_lng_1 = 100;
var factor_lng_2 = 3;
var factor_lng_3 = 3;

exports.encode = function encode(req, res) {
	
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Content-Type, version');

	//respond to CORS preflight requests
	if (req.method == 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	if(req.headers.version != 1)
		res.send({"error" : "Version mismatch"});
	else {
		var city_begin = req.body.city_begin;
		var position = req.body.position;

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

		console.log(code, lat_diff_1 + " " + lat_diff_2 + " " + lat_diff_3 + " " + lng_diff_1 + " " + lng_diff_2 + " " + lng_diff_3);
		res.send({"code" : code});
	}
	
}
