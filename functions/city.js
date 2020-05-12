const functions = require('firebase-functions');
const admin = require('firebase-admin');
const geoFire = require('geofire');

admin.initializeApp(functions.config().firebase);

// mailgun variable names - 'apiKey' and 'domain' - MUST be same
const domain = 'wolo.codes';
const apiKey = functions.config().mailgun.api_key;
const mailgun = require('mailgun-js')({apiKey, domain});

const googleMaps_apiKey = functions.config().google_maps.api_key;
const googleMapsClient = require('@google/maps').createClient({key: googleMaps_apiKey});

exports.emailOnCitySubmit = functions.database.ref('/CityRequest/{pushId}').onWrite((data, context) => {
	if ( data.before.exists() || !data.after.exists())
		return null;

	var subdomain;
	if(typeof functions.config().app != 'undefined' && typeof functions.config().app.subdomain != 'undefined')
		subdomain_part = functions.config().app.subdomain+'.';
	else
		subdomain_part = '';
		
	const entry = data.after.val();
	console.log('CityRequest - entry : ', context.params.pushId, entry);
	const id_link = "<a href='https://"+subdomain_part+"wolo.codes/console#"+context.params.pushId+"'>"+context.params.pushId+'</a>';
	const mail_data = {
		from: "Wolo codes - app <"+subdomain_part+"app_location@wolo.codes>",
		subject: "New City request",
		html: `<p>New City request:</p>` + combine({'Id':id_link, 'Address':entry.address}),
		'h:Reply-To': 'app_location@wolo.codes',
		to: 'admin@wolo.codes'
	}

	mailgun.messages().send(mail_data, function (error, body) {
		if(error) {
			console.log(error)
		}
	})

	return null;
});

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
	var locality_level_i;
	var administrative_level_3_i;
	var administrative_level_2_i;
	var administrative_level_1_i;
	var found_country_i;
	for(var i = address_components.length-1; i >= 0; i--) {
		if(address_components[i].types.includes('locality')) {
			found_city_i = i;
			locality_level_i = i;
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
		var locality = locality_level_i != null? address_components[locality_level_i].long_name : null;
		var administrative_level_3 = administrative_level_3_i != null? address_components[administrative_level_3_i].long_name : null;
		var administrative_level_2 = administrative_level_2_i != null? address_components[administrative_level_2_i].long_name : null;
		var administrative_level_1 = administrative_level_1_i != null? address_components[administrative_level_1_i].long_name : null;
		var country = found_country_i != null? address_components[found_country_i].long_name : null;
		submit_city(place_id, city_lat, city_lng, city_name, city_accent, locality, administrative_level_3, administrative_level_2, administrative_level_1, country, function(push_id) { res.send({'added' : push_id}) } );
	}
	else {
		console.err("Error: " + address_components + ' - ' + geometry);
		res.send({'status' : 'failed'});
	}
}

function submit_city(gp_id, lat, lng, name, accent, locality, administrative_level_3, administrative_level_2, administrative_level_1, country, callback) {
	try {
		var refCityDetail = admin.database().ref('/CityDetail').push();
		var geoFireCenter = new geoFire.GeoFire(admin.database().ref('/CityCenter'));
		refCityDetail.set({
			'gp_id': gp_id,
			'name_id': name.toLocaleLowerCase(),
			'name': name,
			'accent': accent,
			'locality': locality,
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

function combine(objects) {
	var message = '';
	for (var object in objects) {
		message += object + ' : ' + objects[object] + '<br>';
	}
	return message;
}
