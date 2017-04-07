/**
 * Decodes Coordinates from words
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

exports.decode = function decode(req, res) {
	
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
		city_begin = req.body.city_begin;
		word_index_1 = req.body.code[0];
		word_index_2 = req.body.code[1];
		word_index_3 = req.body.code[2];
		
		lat_diff_1 = word_index_1 >> 5;
		lng_diff_1 = word_index_1 & 0x1F;
		lat_diff_2 = word_index_2 >> 5;
		lng_diff_2 = word_index_2 & 0x1F;
		lat_diff_3 = word_index_3 >> 5;
		lng_diff_3 = word_index_3 & 0x1F;
		lat = (lat_diff_1 + (lat_diff_2 + (lat_diff_3 / factor_lat_3)) / factor_lat_2) / factor_lat_1 + city_begin.lat;
		lng = (lng_diff_1 + (lng_diff_2 + (lng_diff_3 / factor_lng_3)) / factor_lng_2) / factor_lng_1 + city_begin.lng;
		
		res.send({"lat":lat, "lng":lng});
	}
	
}
