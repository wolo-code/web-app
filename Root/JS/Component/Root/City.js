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

function getCity_by_perifery_list(latLng, session_id, continue_encode) {
	if(continue_encode)
		pending_encode_latLng = latLng;
	else
		pending_encode_latLng = null;
	getCity_by_perifery_list_fs(latLng, session_id);
}

function getCity_by_perifery_list_fs(latLng, session_id) {
	geoQuery_completed = false;
	nearCity = null;
	var nearCityList_coord = {};
	var nearCityList_detail = {};
	geoFireInit();
	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		radius: CITY_RANGE_RADIUS
	});

	pushLoader();
	geoQuery.on('ready', function() {
		geoQuery.cancel();
		sessionForwarder(session_id, function() {
			geoQuery_completed = true;
			popLoader();
			
			if(Object.keys(nearCityList_coord).length == Object.keys(nearCityList_detail).length)
				syncNearCityList(nearCityList_coord, nearCityList_detail);
		});
	});

	geoData = geoQuery.on('key_entered', function(key, location, distance) {
		sessionForwarder(session_id, function() {	
			nearCityList_coord[key] = {city: {id: key, center: { lat: location[0], lng: location[1] } }, distance: distance};
			getCityFromId(key, function(city) {
				nearCityList_detail[key] = {city: city};
				if(geoQuery_completed && Object.keys(nearCityList_coord).length == Object.keys(nearCityList_detail).length)
						syncNearCityList(nearCityList_coord, nearCityList_detail);
			});
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
		chooseCity_by_periphery_List_gpids = [];
		var nearCity_distance;
		nearCity = null;
		for(aCity in nearCityList_coord) {
			var xCity = new Object;
			xCity = nearCityList_coord[aCity];
			xCity.city.country = nearCityList_detail[aCity].city.country;
			xCity.city.gp_id = nearCityList_detail[aCity].city.gp_id;
			if(typeof nearCityList_detail[aCity].city.administrative_level_2 != 'undefined')
				xCity.city.administrative_level_2 = nearCityList_detail[aCity].city.administrative_level_2;
			if(typeof nearCityList_detail[aCity].city.administrative_level_1 != 'undefined')
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

	pushLoader();
	geoQuery.on('ready', function() {
		popLoader();
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

function getCityFromCityGp_idThenDecode(city_gp_id, wcode) {
	function callback_success(city) {
		getCityCenterFromId(city, function() {
			decode_continue(city, wcode);
		} );
	};
	function callback_failure() {
		decode_continue(null, wcode);
	};
	var session_id;
	session_id = dencode_session_id = Date.now();
	getCityFromCityGp_id(city_gp_id, encode_session_id, callback_success, callback_failure )
}

// only detail, not center
function getCityFromId(id, callback) {
	var ref = database.ref('CityDetail'+'/'+id);
	pushLoader();
	ref.once('value').then(function(snapshot) {
		popLoader();
		var city = snapshot.val();
		if(city) {
			city.id = id;
			callback(city);			
		} else {
			showNotification("Error: City not found!")
		}
	});
}

function getCityFromName(group, name, callback) {
	var ref = database.ref('CityDetail');
	pushLoader();
	ref.orderByChild('name_id').equalTo(name).once('value', function(snapshot) {
		popLoader();
		var list = snapshot.val();
		let matchList;
		matchList = matchCityByGroup(list, group, name);
		if(matchList.length == 0)
			decode_continue();
		else {
			if(matchList.length == 1) {
				let i = matchList[0];
				var city = list[i];
				city.id = i;
				callback(city);
			}
			else	
				chooseCity(list, matchList, callback);
		}
	});
}

function matchCityByGroup(list, group, name) {
	var matchList = [];
	var complete_group_id_list = [];
	if(list != null) {
		for(let i in list) {
			let complete_group_id = (list[i].country+'-'+list[i].administrative_level_1+'-'+list[i].administrative_level_2).toLowerCase().replace('--', '-');
			if(!complete_group_id_list.includes(complete_group_id)) {	
				if( group.length == 0 || complete_group_id.endsWith(group.join('-')) )
					matchList.push(i);
				complete_group_id_list.push(complete_group_id);
			}
		}
	}	
	return matchList;
}

function getCityCenterFromId_session(city, session_id, callback) {
	sessionForwarder(session_id, function(city, callback) {
			 getCityCenterFromId(city, callback);
		 }, [city, function() {
			 sessionForwarder(session_id, callback, [city]);
		}] );
}

function getCityCenterFromId(city, callback) {
	refCityCenter.child(city.id).once('value', function(snapshot) {
		var location = snapshot.val().l;
		city.center = { lat: location[0], lng: location[1] };
		callback(city);
	});
}

function getCitiesFromNameId(name_id, callback) {
	var ref = database.ref('CityDetail');
	pushLoader();
	ref.orderByChild('name_id').startAt(name_id).endAt(name_id+'\uf8ff').limitToFirst(10).once('value', function(snapshot) {
		popLoader();
		callback(snapshot.val());
	});
}

// unused
function getCityIdFromNameId(name_id, callback) {
	var ref = database.ref('CityDetail');
	pushLoader();
	ref.orderByChild('name_id').equalTo(name_id).once('value', function(snapshot) {
		popLoader();
		callback(Object.keys(snapshot.val())[0]);
	});
}

function getCityFromCityGp_id(city_gp_id, encode_session_id, callback_success, callback_failure) {
	var ref = database.ref('CityDetail');
	pushLoader();
	ref.orderByChild('gp_id').equalTo(city_gp_id).once('value', function(snapshot) {
		popLoader();
		if (snapshot.exists()) {
			var city = Object.values(snapshot.val())[0];
			city.id = Object.keys(snapshot.val())[0];
			sessionForwarder(encode_session_id, callback_success, [city]);
		}
		else {
			sessionForwarder(encode_session_id, callback_failure);
		}
	});	
}

function noCity(position) {
	showNoCityMessage();
	showAddress();
	infoWindow.setContent("City not in database");
}

function notInRange(position) {
	showNotification("Error: place out of range of selected city");
	showAddress();
	infoWindow.setContent("<div class='control' onclick='showChooseCity_by_periphery_Message();'>Not in <span class='blue'>selected<span> city's range</div>");
	showChooseCity_by_periphery_Message();
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
	if(typeof infoWindow != 'undefined')
		infoWindow.close();
}

function getFullCity(city) {
	locality = typeof city.locality != 'undefined'? city.locality : null; 
	cityGroupName = getCityGroupName(city, ' \\ ');
	properCityAccent = getProperCityAccent(city);
	if(cityGroupName == null || (!locality && (cityGroupName == properCityAccent) ) )
		return city.country + ' \\ ' + properCityAccent;
	else {
		if(locality)
			return city.country + ' \\ ' + cityGroupName + ' : ' + properCityAccent;
		else
			return city.country + ' \\ ' + cityGroupName + ' \\ ' + properCityAccent;
	}
}

function getCity_by_address_list(address_components) {
	chooseCity_by_periphery_gpid = [];
	for(let i in address_components) {
		if(address_components[i].types.includes('administrative_area_level_1') || address_components[i].types.includes('administrative_area_level_2') || address_components[i].types.includes('locality')) {
			let country = null;
			let administrative_level_1 = null;
			let administrative_level_2 = null;
			for(let j in address_components[i].address_components) {
				if(address_components[i].address_components[j].types.includes('country'))
					country = address_components[i].address_components[j].long_name;
				else if(address_components[i].address_components[j].types.includes('administrative_area_level_1'))
					administrative_level_1 = address_components[i].address_components[j].long_name;
				else if(address_components[i].address_components[j].types.includes('administrative_area_level_2'))
					administrative_level_2 = address_components[i].address_components[j].long_name;
			}
			chooseCity_by_periphery_gpid[i] = new Object;
			chooseCity_by_periphery_gpid[i].city = { 'gp_id': address_components[i].place_id,
				'center' : resolveLatLng(address_components[i].geometry.location),
				'name' : address_components[i].address_components[0].long_name,
				'country' : country,
				'administrative_level_1' : administrative_level_1,
				'administrative_level_2' : administrative_level_2
			}
		}
	}
}
