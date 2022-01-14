const functions = require('firebase-functions');
const admin = require('firebase-admin');
const WebServiceClient = require('@maxmind/geoip2-node').WebServiceClient;

const userId =  functions.config().maxmind.user_id;
const apiKey = functions.config().maxmind.api_key;

const client = new WebServiceClient(userId, apiKey, {host: 'geolite.info'});

exports.getCity = functions.https.onRequest((req, res) => {
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
		client.city(req.headers['x-forwarded-for']).then(response => {
		 res.send({
		 	'status' : "success",
		 	'city': response.city.names.en,
		 	'country': response.country.isoCode
		 });
		}).catch(function(error) {
			console.log("error in try - " + error);
			res.send({'error' : "Exception"});
		});
	}
	
});
