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

var geoQuery_completed;
var nearCity;
var pending_encode_latLng;

function getCity_by_perifery_list(latLng, continue_encode) {
	geoQuery_completed = false;
	if(continue_encode)
		pending_encode_latLng = latLng;
	else
		pending_encode_latLng = null;
	nearCity = null;
	var nearCityList_coord = {};
	var nearCityList_detail = {};
	geoFireInit();
	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		radius: CITY_RANGE_RADIUS
	});

	wait_loader.classList.remove('hide');
	geoQuery.on('ready', function() {
		geoQuery_completed = true;
		wait_loader.classList.add('hide');
		geoQuery.cancel();

		if(Object.keys(nearCityList_coord).length == Object.keys(nearCityList_detail).length)
			syncNearCityList(nearCityList_coord, nearCityList_detail);
	});

	geoData = geoQuery.on('key_entered', function(key, location, distance) {
		nearCityList_coord[key] = {city: {id: key, center: { lat: location[0], lng: location[1] } }, distance: distance};
		getCityFromId(key, function(city) {
			nearCityList_detail[key] = {city: city};
			if(geoQuery_completed && Object.keys(nearCityList_coord).length == Object.keys(nearCityList_detail).length)
					syncNearCityList(nearCityList_coord, nearCityList_detail);
		});
	});
}

function syncNearCityList(nearCityList_coord, nearCityList_detail) {
	if(Object.keys(nearCityList_coord).length === 0) {
		if(pending_encode_latLng)
			encode_continue(null, pending_encode_latLng);
	}
	else {
		var nearCityList = [];
		var nearCity_distance;
		nearCity = null;
		for(aCity in nearCityList_coord) {
			var xCity = new Object;
			xCity = nearCityList_coord[aCity];
			xCity.city.country = nearCityList_detail[aCity].city.country;
			xCity.city.gp_id = nearCityList_detail[aCity].city.gp_id;
			if(typeof nearCityList_detail[aCity].city.administrative_level_2 != 'undefined')
				xCity.city.administrative_level_2 = nearCityList_detail[aCity].city.administrative_level_2;
			else if(typeof nearCityList_detail[aCity].city.administrative_level_1 != 'undefined')
				xCity.city.administrative_level_1 = nearCityList_detail[aCity].city.administrative_level_1;
			xCity.city.name = nearCityList_detail[aCity].city.name;
			xCity.city.name_id = nearCityList_detail[aCity].city.name_id;
			nearCityList.push(xCity);
			if(nearCity == null || nearCityList_coord[aCity].distance < nearCity.distance) {
				nearCity = xCity;
				nearCity.distance = nearCityList_coord[aCity].distance;
			}
		}
		chooseCity_by_periphery(nearCityList, function(city) {
			encode_continue(city, resolveLatLng(marker.getPosition()));
		});
		if(pending_encode_latLng != null)
			encode_continue(nearCity.city, pending_encode_latLng);
	}
}

//			getCityFromIdThenEncode(nearCity.city.id, nearCity.city.center, latLng);

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

// only detail, not center
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

function getFullCity(city) {
	return city.country + ' \\ ' + getCityGroupName(city) + ': ' + getProperCityAccent(city);
}
