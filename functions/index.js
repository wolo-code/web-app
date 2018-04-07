const functions = require('firebase-functions');
var apiKey = "key-ceb0ce32644bf63b3c75c4a09acf12a2";
var domain = 'wcodes.org';
var mailgun = require('mailgun-js')({apiKey, domain});
	
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

function getCityBegin(cityCenter) {
	var lat = cityCenter.lat - SPAN/2;
	var lng = cityCenter.lng - ang_span_d(cityCenter.lng)*N/2;
	return {'lat': lat, 'lng': lng};
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
	else {
		code = encode(getCityBegin(req.body.city_center), req.body.position);
		for(i of code)
			if(i < 0 || i > 1023) {
				console.log("Error: Out of WCode index limit");
				console.log(req.body.city_center);
				console.log(req.body.position);
				res.status(204).send('');
				return;
			}
		res.send({"code" : code});
	}
	
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
		res.send(decode(getCityBegin(req.body.city_center), req.body.code));
	
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

exports.emailOnCitySubmit = functions.database.ref('/CityRequest/{pushId}').onWrite((data, context) => {
	if ( data.before.exists() || !data.after.exists())
		return null;
	
	const entry = data.after.val();
	console.log('CityRequest - entry : ', context.params.pushId, entry);
	var id_link = "<a href='https://location.wcodes.org/console#"+context.params.pushId+"'>"+context.params.pushId+'</a>';
	var data = {
		from: 'WCode Location - app <app_location@wcodes.org>',
		subject: 'New City request',
		html: `<p>New City request:</p>` + combine({'Id':id_link, 'Address':entry.address}),
		'h:Reply-To': 'app_location@wcodes.org',
		to: 'admin@wcodes.org'
	}

	mailgun.messages().send(data, function (error, body) {
		console.log(body)
	})
	
	return null;
});

function combine(objects) {
	var message = '';
	for (var object in objects) {
		message += object + ' : ' + objects[object] + '<br>';
	}
	return message;
}
