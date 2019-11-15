// const DEFAULT_WCODE;
// var pendingCity;
// var pendingCitySubmit;
var multiple_city;
var multiple_country;
var multiple_group;

function getCityAccent(city) {
	if(typeof city.accent != 'undefined')
		return city.accent;
	else
		return city.name;
}

function getProperCityAccent(city) {
	if(typeof city.accent != 'undefined') {
		var city_accent_normalized = city.accent.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
		if(city.name.toLocaleLowerCase().localeCompare(city_accent_normalized.toLocaleLowerCase()) == 0)
			return city_accent_normalized;
	}
	return city.name;
}

function getCityFromPositionThenEncode(latLng) {
	var nearCity = new Object;

	geoFireInit();
	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		radius: CITY_RANGE_RADIUS
	});

	wait_loader.classList.remove('hide');;
	geoQuery.on('ready', function() {
		wait_loader.classList.add('hide');
		geoQuery.cancel();
		if(Object.keys(nearCity).length === 0)
			encode_continue(null, latLng);
		else
			getCityFromIdThenEncode(nearCity.city.id, nearCity.city.center, latLng);
	});

	geoData = geoQuery.on('key_entered', function(key, location, distance) {
		if(typeof nearCity.distance == 'undefined' || distance < nearCity.distance) {
			nearCity.city = {id:key, center:{ lat: location[0], lng: location[1]} };
			nearCity.distance = distance;
		}
	});

}

function getCityFromIdThenEncode(city_id, city_center, latLng) {
	getCityFromId(city_id, function(city) {
		city.center = city_center;
		encode_continue(city, latLng);
	});
}

function getCityFromPositionThenDecode(latLng, wcode) {
	var nearCity = new Object;

	geoFireInit();
	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		radius: CITY_RANGE_RADIUS
	});

	wait_loader.classList.remove('hide');
	geoQuery.on('ready', function() {
		wait_loader.classList.add('hide');
		geoQuery.cancel();
		if(nearCity == null)
			decode_continue(null, wcode);
		else
			getCityFromId(nearCity.id, function(city) {
				city.center = nearCity.center;
				decode_continue(city, wcode);
			});
	});

	geoData = geoQuery.on('key_entered', function(key, location, distance) {
		if(typeof nearCity.distance == 'undefined' || distance < nearCity.distance) {
			nearCity = {
				id:key,
				center: {
					lat: location[0],
					lng: location[1]
				},
				distance: distance
			};
		}
	});

}

function getCityFromId(id, callback) {
	var ref = database.ref('CityDetail'+'/'+id);
	wait_loader.classList.remove('hide');
	ref.once('value').then(function(snapshot) {
		wait_loader.classList.add('hide');
		var city = snapshot.val();
		city.id = id;
		callback(city);
	});
}

function getCityFromName(name, callback) {
	var ref = database.ref('CityDetail');
	wait_loader.classList.remove('hide');
	ref.orderByChild('name_id').equalTo(name).once('value', function(snapshot) {
		wait_loader.classList.add('hide');
		var list = snapshot.val();
		if(list == null)
			decode_continue();
		else {
			if (Object.keys(list).length > 1)
				chooseCity(list, callback);
			else {
				var id = Object.keys(list)[0];
				var city = list[id];
				city.id = id;
				callback(city);
			}
		}
	});
}

function getCityCenterFromId(city, callback) {
	refCityCenter.child(city.id).once('value', function(snapshot) {
		var location = snapshot.val().l;
		city.center = { lat: location[0], lng: location[1]};
		callback(city);
	});
}

function getCitiesFromNameId(name_id, callback) {
	var ref = database.ref('CityDetail');
	wait_loader.classList.remove('hide');
	ref.orderByChild('name_id').startAt(name_id).endAt(name_id+'\uf8ff').limitToFirst(10).once('value', function(snapshot) {
		wait_loader.classList.add('hide');
		callback(snapshot.val());
	});
}

// unused
function getCityIdFromNameId(name_id, callback) {
	var ref = database.ref('CityDetail');
	wait_loader.classList.remove('hide');
	ref.orderByChild('name_id').equalTo(name_id).once('value', function(snapshot) {
		wait_loader.classList.add('hide');
		callback(Object.keys(snapshot.val())[0]);
	});
}

function getCityFromCityGp_id(city_gp_id, callback_success, callback_failure) {
	var ref = database.ref('CityDetail');
	wait_loader.classList.remove('hide');
	ref.orderByChild('gp_id').equalTo(city_gp_id).once('value', function(snapshot) {
		wait_loader.classList.add('hide');
		if (snapshot.exists()) {
			var city = Object.values(snapshot.val())[0];
			city.id = Object.keys(snapshot.val())[0];
			callback_success(city);
		}
		else
			callback_failure();
	});	
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
