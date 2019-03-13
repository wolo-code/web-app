// const DEFAULT_WCODE;
// var pendingCity;
// var pendingCitySubmit;

function getProperCityAccent(city) {
	var city_accent_normalized = city.accent.normalize('NFD').replace(/[\u0300-\u036f]/g, "");
	if(city.name.localeCompare(city_accent_normalized.toLocaleLowerCase()) == 0)
		return city_accent_normalized;
	else
		return capitalizeWords(city.name);
}

function getCityFromPositionThenEncode(latLng) {
	var nearCity = new Object;

	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		radius: CITY_RANGE_RADIUS
	});

	geoQuery.on("ready", function() {
		geoQuery.cancel();
		if(Object.keys(nearCity).length === 0)
			encode_continue(null, latLng);
		else
			getCityFromId(nearCity.city.id, function(city) {
				city.center = nearCity.city.center;
				encode_continue(city, latLng);
			});
	});

	geoData = geoQuery.on('key_entered', function(key, location, distance) {
		if(typeof nearCity.distance == 'undefined' || distance < nearCity.distance) {
			nearCity.city = {id:key, center:{ lat: location[0], lng: location[1]} };
			nearCity.distance = distance;
		}
	});

}

function getCityFromPositionThenDecode(latLng, wcode) {
	var nearCity = new Object;

	var geoQuery = geoFire.query({
	  center: [latLng.lat, latLng.lng],
	  radius: CITY_RANGE_RADIUS
	});

	geoQuery.on("ready", function() {
	  geoQuery.cancel();
		if(nearCity == null)
			decode_continue(null, wcode);
		else
			decode_continue(nearCity.city, wcode);
	});

	geoData = geoQuery.on('key_entered', function(key, location, distance) {
		if(typeof nearCity.distance == 'undefined' || distance < nearCity.distance) {
			nearCity.city = {name:CityList[key].name, center:{ lat: location[0], lng: location[1]} };
			nearCity.distance = distance;
		}
	});

}

function getCityFromId(id, callback) {
	var ref = database.ref('CityDetail'+'/'+id);
	ref.once('value').then(function(snapshot) {
		callback(snapshot.val());
	});
}

function getCityFromName(name, callback) {
	var ref = database.ref('CityDetail');
	ref.orderByChild('name').equalTo(name).on("child_added", function(snapshot) {
		var city = snapshot.val();
		city.id = snapshot.key;
    callback(city);
	});
}

function getCitiesFromName(name, callback) {
	var ref = database.ref('CityDetail');
	ref.orderByChild('name').startAt(name).limitToFirst(10).on("value", function(snapshot) {
    callback(snapshot.val());
	});
}

function getCityIdFromName(name, callback) {
	var ref = database.ref('CityDetail');
	ref.orderByChild('name').equalTo(name).on("child_added", function(snapshot) {
    callback(snapshot.key);
	});
}

function getCityAccentFromId(id) {
	if(typeof (CityList[id].accent) != 'undefined')
		return CityList[id].accent;
	else
		return CityList[id].name;
}

function noCity(position) {
	showAddress();
	showNoCityMessage();
	infoWindow.setContent("Location not in database");
}

function submitCity() {
	if(address == '')
		pendingCitySubmit = true;
	else {
		execSubmitCity();
		pendingCity = true;
	}
}

function execSubmitCity() {
	var newPostKey = database.ref().child('CityRequest').push().key;
	var updates = {};
	var data = {
			"time": firebase.database.ServerValue.TIMESTAMP,
			"lat_lng": latLng_p,
			"gp_id": gpId,
			"address": address,
			"processed": false
		};
	updates['/CityRequest/' + newPostKey] = data;
	database.ref().update(updates);
	showNotification("Request submitted");
}

function tryDefaultCity() {
	decode(DEFAULT_WCODE);
	notification_top.classList.add('hide');
	infoWindow.close();
}
