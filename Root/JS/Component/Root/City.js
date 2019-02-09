// const DEFAULT_WCODE;
// var pendingCity;
// var pendingCitySubmit;

function getCityFromPositionThenEncode(latLng) {
	var nearCity = new Object;

	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		radius: CITY_RANGE_RADIUS
	});

	geoQuery.on("ready", function() {
		geoQuery.cancel();
		if(nearCity == null)
			encode_continue(null, latLng);
		else
			encode_continue(nearCity.city, latLng);
	});

	geoData = geoQuery.on("key_entered", function(key, location, distance) {
		if(typeof nearCity.distance == 'undefined' || distance < nearCity.distance) {
			nearCity.city = {name:CityList[key].name, center:{ lat: location[0], lng: location[1]} };
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

	geoData = geoQuery.on("key_entered", function(key, location, distance) {
		if(typeof nearCity.distance == 'undefined' || distance < nearCity.distance) {
			nearCity.city = {name:CityList[key].name, center:{ lat: location[0], lng: location[1]} };
			nearCity.distance = distance;
		}
	});

}

function getCityNameFromId(id) {
	return CityList[id].name;
}

function getCityIdFromName(cityName) {
	if(cityName in city_id_hashlist)
		return city_id_hashlist[cityName];
	return null;
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
	if(address == "")
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
