'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const geoFire = require('geofire');

admin.initializeApp(functions.config().firebase);

// mailgun variable names - 'apiKey' and 'domain' - MUST be same
const domain = 'wcodes.org';
const apiKey = functions.config().mailgun.api_key;
const mailgun = require('mailgun-js')({apiKey, domain});

const googleMaps_apiKey = functions.config().google_maps.api_key;
const googleMapsClient = require('@google/maps').createClient({key: googleMaps_apiKey});

// 2^(10+5)
const N = 32768;
const A = 6378137;
const B = 6356752.314140;
const E_SQ = (A*A-B*B)/(A*A);
const DEG_RAD = Math.PI/180;

function lat_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	const x = Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r));
	return Math.abs((x*x*x)/(DEG_RAD*A*(1-E_SQ)));
}

function lng_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	return Math.abs(Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r))/(DEG_RAD*A*Math.cos(lat_r)));
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
	return data*d;
}

function getCityBegin(cityCenter) {
	const lat = cityCenter.lat - lat_span_half(cityCenter.lat)*N;
	const lng = cityCenter.lng - lng_span_half(cityCenter.lat)*N;
	return {'lat': lat, 'lng': lng};
}

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
		for(var i of code)
			if(i < 0 || i > 1023) {
				console.log("Error: Out of WCode index limit");
				console.log(req.body.city_center);
				console.log(req.body.position);
				res.status(204).send('');
				return;
			}
		res.send({'code' : code});
	}

});

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

function encode(city_begin, position) {
	const lat_diff = encodeData(position.lat - city_begin.lat, lat_span_half(city_begin.lat)*2);
	const lng_diff = encodeData(position.lng - city_begin.lng, lng_span_half(city_begin.lat)*2);
	const word_index_1 = lat_diff >> 5;
	const word_index_2 = lng_diff >> 5;
	const word_index_3 = (lat_diff & 0x001F) << 5 | (lng_diff & 0x001F);
	const code = [word_index_1, word_index_2, word_index_3];

	return code;
}

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

	return({"lat":lat, "lng":lng});
}

exports.emailOnCitySubmit = functions.database.ref('/CityRequest/{pushId}').onWrite((data, context) => {
	if ( data.before.exists() || !data.after.exists())
		return null;

	const entry = data.after.val();
	console.log('CityRequest - entry : ', context.params.pushId, entry);
	const id_link = "<a href='https://location.wcodes.org/console#"+context.params.pushId+"'>"+context.params.pushId+'</a>';
	const mail_data = {
		from: "WCode Location - app <app_location@wcodes.org>",
		subject: "New City request",
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

exports.add_city = functions.https.onRequest((req, res) => {

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
		addCity(req.body.place_id, res);

});

function addCity(place_id, res) {
	var request = {
		placeid: place_id,
		fields: ['address_component', 'geometry']
	};

	googleMapsClient.place(request, function (err, response) {
		if (!err) {
			getAddressCity(place_id, response.json.result.address_components, response.json.result.geometry, res);
		}
		else {
			console.log(response);
			res.send({'status' : 'failed'});
		}
	});
}

function getAddressCity(place_id, address_components, geometry, res) {
	var found_city_i;
	var administrative_level_3_i;
	var administrative_level_2_i;
	var administrative_level_1_i;
	var found_country_i;
	for(var i = address_components.length-1; i >= 0; i--) {
		if(address_components[i].types.includes('locality')) {
			found_city_i = i;
			break;
		} else if ( found_city_i == null && (address_components[i].types.includes('sublocality') || address_components[i].types.includes('sublocality_level_1')) ) {
			found_city_i = i;
		} else if (address_components[i].types.includes('administrative_area_level_1')) {
			administrative_level_1_i = i;
			found_city_i = i;
		} else if (address_components[i].types.includes('administrative_area_level_2')) {
			administrative_level_2_i = i;
			found_city_i = i;
		} else if (address_components[i].types.includes('administrative_area_level_3')) {
			administrative_level_3_i = i;
			found_city_i = i;
		} else if (address_components[i].types.includes('country')) {
			found_country_i = i;
		}
	}
	var city_lat;
	var city_lng;
	var city_name;
	var city_accent;
	if(found_city_i != null) {
		city_name = address_components[found_city_i].short_name;
		city_accent = address_components[found_city_i].long_name;
		if(city_accent === city_name)
			city_accent = null;
		city_lat = geometry['location']['lat'];
		city_lng = geometry['location']['lng'];
		var administrative_level_3 = administrative_level_3_i != null? address_components[administrative_level_3_i].long_name : null
		var administrative_level_2 = administrative_level_2_i != null? address_components[administrative_level_2_i].long_name : null
		var administrative_level_1 = administrative_level_1_i != null? address_components[administrative_level_1_i].long_name : null
		var country = found_country_i != null? address_components[found_country_i].long_name : null;
		submit_city(place_id, city_lat, city_lng, city_name, city_accent, administrative_level_3, administrative_level_2, administrative_level_1, country, function(push_id) { res.send({'added' : push_id}) } );
	}
	else {
		console.err("Error: " + address_components + ' - ' + geometry);
		res.send({'status' : 'failed'});
	}
}

function submit_city(gp_id, lat, lng, name, accent, administrative_level_3, administrative_level_2, administrative_level_1, country, callback) {
	try {
		var refCityDetail = admin.database().ref('/CityDetail').push();
		var geoFireCenter = new geoFire.GeoFire(admin.database().ref('/CityCenter'));
		refCityDetail.set({
			'gp_id': gp_id,
			'name_id': name.toLocaleLowerCase(),
			'name': name,
			'accent': accent,
			'administrative_level_3': administrative_level_3,
			'administrative_level_2': administrative_level_2,
			'administrative_level_1': administrative_level_1,
			'country': country
		});
		geoFireCenter.set(refCityDetail.key, [lat, lng]).then( function() {
				if(typeof callback == 'function')
					callback(refCityDetail.key);
			}, function(err) {
				console.error("Error: " + err);
			}
		);
	}
	catch (err) {
		console.error(err);
	}
}
