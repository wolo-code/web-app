'use strict';

const functions = require('firebase-functions');

// mailgun variable names - 'apiKey' and 'domain' - MUST be same
const domain = 'wcodes.org';
const apiKey = functions.config().mailgun.api_key;
const mailgun = require('mailgun-js')({apiKey, domain});

// 2^(10+5)
const N = 32768;

// LatLng limit
const SPAN = 0.5;

const SPAN_D = SPAN/N;

// resolution of addressable divisions
function ang_span_d(ang) {
	return Math.abs(Math.cos(ang * Math.PI / 180)/SPAN)/N;
}

function encodeData(value, d) {
	const i = Math.round(value/d);
	if(i < 0 || i > N) {
		console.log("Error: Out of data limit");
		console.log("Value: " + value);
		console.log("d: " + d);
	}
	else
		return i;
}

function decodeData(data, d) {
	return data*d+d/2;
}

function getCityBegin(cityCenter) {
	const lat = cityCenter.lat - SPAN/2;
	const lng = cityCenter.lng - ang_span_d(cityCenter.lng)*N/2;
	return {'lat': lat, 'lng': lng};
}

exports.encode = functions.https.onRequest((req, res) => {
	
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Headers', 'Content-Type, version');
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');

	//respond to CORS preflight requests
	if (req.method == 'OPTIONS') {
		res.status(204).send('');
		return;
	}

	if(req.headers.version != 1)
		res.send({"error" : "Version mismatch"});
	else {
		const code = encode(getCityBegin(req.body.city_center), req.body.position);
		for(var i of code)
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
	res.set('Cache-Control', 'public, max-age=300, s-maxage=600');
	
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
	const lat_diff = encodeData(position.lat - city_begin.lat, SPAN_D);
	const lng_diff = encodeData(position.lng - city_begin.lng, ang_span_d(city_begin.lng));
	const word_index_1 = lat_diff >> 5;
	const word_index_2 = lng_diff >> 5;
	const word_index_3 = (lat_diff & 0x001F) << 5 | (lng_diff & 0x001F);
	const code = [word_index_1, word_index_2, word_index_3];

	//console.log(code, lat_diff + " " + lng_diff);
	return code;
}

function decode(city_begin, code) {
	const word_index_1 = code[0];
	const word_index_2 = code[1];
	const word_index_3 = code[2];
	const lat_diff_bin = word_index_1 << 5 | word_index_3 >> 5;
	const lng_diff_bin = word_index_2 << 5 | word_index_3 & 0x001F;
	const lat_diff = decodeData(lat_diff_bin, SPAN_D);
	const lng_diff = decodeData(lng_diff_bin, ang_span_d(city_begin.lng));
	const lat = city_begin.lat + lat_diff;
	const lng = city_begin.lng + lng_diff;

	//console.log(code, lat_diff + " " + lng_diff);
	return({"lat":lat, "lng":lng});
}

exports.emailOnCitySubmit = functions.database.ref('/CityRequest/{pushId}').onWrite((data, context) => {
	if ( data.before.exists() || !data.after.exists())
		return null;
	
	const entry = data.after.val();
	console.log('CityRequest - entry : ', context.params.pushId, entry);
	const id_link = "<a href='https://location.wcodes.org/console#"+context.params.pushId+"'>"+context.params.pushId+'</a>';
	const mail_data = {
		from: 'WCode Location - app <app_location@wcodes.org>',
		subject: 'New City request',
		html: `<p>New City request:</p>` + combine({'Id':id_link, 'Address':entry.address}),
		'h:Reply-To': 'app_location@wcodes.org',
		to: 'admin@wcodes.org'
	}

	mailgun.messages().send(mail_data, function (error, body) {
		if(error) {
			console.log(error)
		}
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
