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

function initDecodeCityContext() {
	decode_city_history = getDecodeCityHistory();
	syncDecodeCityHistoryControl();

	if(decode_city_history.length > 0) {
		setDecodeCity(decode_city_history[0], 'history', false);
		if(typeof seedCitiesFromHistory === 'function')
			seedCitiesFromHistory(decode_city_history);
	}
	else
		setDecodeCityLabel('');

	getCityByIp(function() {
		if(!selected_decode_city)
			selectIpDecodeCity();
	});
}

function setDecodeCityFromIp(city_name) {
	geoIp_city_name = city_name;
	if(selected_decode_city_source == 'ip' || !selected_decode_city)
		selectIpDecodeCity();
}

function selectIpDecodeCity() {
	if(!geoIp_city_name) {
		getCityByIp();
		return;
	}

	selected_decode_city = {
		name: geoIp_city_name
	};
	selected_decode_city_source = 'ip';
	setDecodeCityLabel(geoIp_city_name);
	syncDecodeCitySourceButtons();
}

function requestDecodeCityGeolocation() {
	selected_decode_city = null;
	selected_decode_city_source = 'geolocation';
	setDecodeCityLabel('loading...');
	syncDecodeCitySourceButtons();

	initLocate(true, function(failure) {
		function fail() {
			selected_decode_city_source = null;
			setDecodeCityLabel('');
			syncDecodeCitySourceButtons();
			if(typeof failure == 'function')
				failure();
			else
				popLoader();
			showNotification(PURE_WCODE_CITY_FAILED);
		}

		getCoarseLocation(function(position) {
			getCityFromPositionViaGMap(position, function(city) {
				getCityCenterFromId(city, function(city) {
					setDecodeCity(city, 'geolocation', true);
				});
			}, fail);
		}, fail);
	});
}

function setDecodeCity(city, source, save_history) {
	if(!city)
		return;

	selected_decode_city = city;
	selected_decode_city_source = source;
	rememberCity(city);

	if(city.gp_id)
		current_city_gp_id = city.gp_id;
	if(source == 'ip') {
		geoIP_city = city;
		geoIp_city_name = city.name;
	}

	setDecodeCityLabel(getDecodeCityDisplayName(city));
	if(save_history)
		saveDecodeCity(city);
	syncDecodeCitySourceButtons();
}

function setDecodeCityLabel(label) {
	var city_label = document.getElementById('decode_input_city');
	if(city_label)
		city_label.innerText = label || '\u00a0';
}

function getDecodeCityDisplayName(city) {
	if(!city)
		return '';
	if(city.name)
		return getProperCityAccent(city);
	return '';
}

function getDecodeCityStorageKey() {
	return 'decode_city_history';
}

function getDecodeCityHistory() {
	if(typeof(Storage) === 'undefined' || typeof localStorage[getDecodeCityStorageKey()] == 'undefined')
		return [];

	try {
		var history = JSON.parse(localStorage[getDecodeCityStorageKey()]);
		if(Array.isArray(history))
			return history.filter(function(city) { return city && city.name; });
	}
	catch(error) {}

	return [];
}

function saveDecodeCity(city) {
	if(typeof(Storage) === 'undefined' || !city || !city.name)
		return;

	var saved_city = cloneDecodeCity(city);
	var history = getDecodeCityHistory().filter(function(entry) {
		return getDecodeCityHistoryKey(entry) != getDecodeCityHistoryKey(saved_city);
	});
	history.unshift(saved_city);
	history = history.slice(0, 8);
	localStorage[getDecodeCityStorageKey()] = JSON.stringify(history);
	decode_city_history = history;
	syncDecodeCityHistoryControl();
}

function cloneDecodeCity(city) {
	var saved_city = {
		id: city.id,
		gp_id: city.gp_id,
		name: city.name,
		name_id: city.name_id,
		accent: city.accent,
		country: city.country,
		administrative_level_1: city.administrative_level_1,
		administrative_level_2: city.administrative_level_2,
		locality: city.locality
	};
	if(city.center)
		saved_city.center = {
			lat: city.center.lat,
			lng: city.center.lng
		};
	return saved_city;
}

function getDecodeCityHistoryKey(city) {
	return city.id || city.gp_id || city.name;
}

function syncDecodeCityHistoryControl() {
	decode_city_history = getDecodeCityHistory();

	var toggle = document.getElementById('decode_city_history_toggle');
	if(toggle)
		toggle.disabled = decode_city_history.length == 0;
}

function showDecodeCityHistoryMessage() {
	var toggle = document.getElementById('decode_city_history_toggle');
	var container = document.getElementById('decode_city_history_message_list');
	if(!toggle || !container || decode_city_history.length == 0)
		return;

	toggle.classList.add('activating');
	clearDecodeCityHistoryList();
	for(var i = 0; i < decode_city_history.length; i++) {
		var row = document.createElement('div');
		row.innerText = getDecodeCityDisplayName(decode_city_history[i]);
		row.data_id = i;
		row.addEventListener('click', chooseDecodeCityFromHistory);
		container.appendChild(row);
	}
	toggle.setAttribute('aria-expanded', true);
	showOverlay(document.getElementById('decode_city_history_message'));
}

function hideDecodeCityHistoryMessage() {
	hideOverlay(document.getElementById('decode_city_history_message'));
	clearDecodeCityHistoryList();
	var toggle = document.getElementById('decode_city_history_toggle');
	if(toggle) {
		toggle.setAttribute('aria-expanded', false);
		toggle.classList.remove('activating');
	}
}

function clearDecodeCityHistoryList() {
	var container = document.getElementById('decode_city_history_message_list');
	if(container)
		container.innerHTML = '';
}

function chooseDecodeCityFromHistory(e) {
	var id = e.currentTarget.data_id;
	var city = decode_city_history[parseInt(id, 10)];

	if(city) {
		setDecodeCity(city, 'history', true);
		hideDecodeCityHistoryMessage();
	}
}

function syncDecodeCitySourceButtons() {
	var controls = {
		geolocation: document.getElementById('decode_city_geolocation'),
		ip: document.getElementById('decode_city_ip'),
		history: document.getElementById('decode_city_history_toggle')
	};

	for(var source in controls) {
		if(controls[source]) {
			controls[source].classList.toggle('active', selected_decode_city_source == source);
			if(selected_decode_city_source == source)
				controls[source].classList.remove('activating');
		}
	}
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
	function finish(city) {
		if (city) {
			rememberCity(city);
			callback(city);
			return;
		}
		if (isOfflineMode()) {
			getCityFromCache(id, function(cached) {
				if (cached) {
					callback(cached);
				} else {
					showNotification('City not available offline. Open this city once while online.');
				}
			});
			return;
		}
		showNotification("Error: City not found!");
	}

	if (isOfflineMode()) {
		getCityFromCache(id, finish);
		return;
	}

	var ref = database.ref('CityDetail'+'/'+id);
	pushLoader();
	ref.once('value').then(function(snapshot) {
		popLoader();
		var city = snapshot.val();
		if (city) {
			city.id = id;
			finish(city);
		} else {
			finish(null);
		}
	}).catch(function() {
		popLoader();
		getCityFromCache(id, finish);
	});
}

function getCityFromName(group, name, callback) {
	var city_name_part = group.concat([name]);
	var query_list = [];
	for(var i = 0; i < city_name_part.length; i++) {
		query_list.push({
			group: city_name_part.slice(0, i),
			name: city_name_part.slice(i).join(' ')
		});
	}

	getCityFromNameQuery(query_list, 0, callback);
}

function getCityFromNameQuery(query_list, index, callback) {
	if(index >= query_list.length) {
		if (isOfflineMode()) {
			showNotification('City not available offline. Open this city once while online.');
		}
		decode_continue();
		return;
	}

	var query = query_list[index];
	if (isOfflineMode()) {
		findCachedCitiesByNameId(query.name).then(function(matches) {
			var filtered = matches.filter(function(city) {
				return matchCityByGroup({ [city.id]: city }, query.group, query.name).length > 0;
			});
			if (filtered.length === 1) {
				callback(filtered[0]);
			} else if (filtered.length > 1) {
				var list = {};
				filtered.forEach(function(city) {
					list[city.id] = city;
				});
				chooseCity(list, filtered.map(function(city) { return city.id; }), callback);
			} else {
				getCityFromNameQuery(query_list, index + 1, callback);
			}
		}).catch(function() {
			getCityFromNameQuery(query_list, index + 1, callback);
		});
		return;
	}

	var ref = database.ref('CityDetail');
	pushLoader();
	ref.orderByChild('name_id').equalTo(query.name).once('value', function(snapshot) {
		popLoader();
		var list = snapshot.val();
		let matchList;
		matchList = matchCityByGroup(list, query.group, query.name);
		if(matchList.length == 0)
			getCityFromNameQuery(query_list, index+1, callback);
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
	}).catch(function() {
		popLoader();
		getCityFromNameQuery(query_list, index + 1, callback);
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
	function finish(center) {
		if (center) {
			city.center = center;
			rememberCity(city);
			callback(city);
			return;
		}
		if (isOfflineMode()) {
			showNotification('City center not available offline for ' + (city.name || 'this city'));
			callback(city);
			return;
		}
		callback(city);
	}

	if (city.center && city.center.lat != null && city.center.lng != null) {
		rememberCity(city);
		callback(city);
		return;
	}

	if (isOfflineMode()) {
		getCachedCityCenter(city.id).then(function(center) {
			finish(center);
		});
		return;
	}

	refCityCenter.child(city.id).once('value', function(snapshot) {
		var value = snapshot.val();
		if (!value || !value.l) {
			getCachedCityCenter(city.id).then(finish);
			return;
		}
		finish({ lat: value.l[0], lng: value.l[1] });
	}).catch(function() {
		getCachedCityCenter(city.id).then(finish);
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
	if(typeof encode_session_id == 'function') {
		callback_failure = callback_success;
		callback_success = encode_session_id;
		encode_session_id = null;
	}

	function forwardCityCallback(callback, ar_param) {
		if(typeof callback == 'undefined')
			return;
		if(encode_session_id == null) {
			if(typeof ar_param === "undefined")
				callback();
			else
				callback(...ar_param);
		}
		else
			sessionForwarder(encode_session_id, callback, ar_param);
	}

	function finishSuccess(city) {
		if (city && city.id)
			rememberCity(city);
		forwardCityCallback(callback_success, [city]);
	}

	function finishFailure() {
		forwardCityCallback(callback_failure);
	}

	function fromCacheThen(fallback) {
		if (typeof findCachedCityByGpId !== 'function') {
			fallback();
			return;
		}
		findCachedCityByGpId(city_gp_id).then(function(city) {
			if (!city) {
				fallback();
				return;
			}
			getCachedCityCenter(city.id).then(function(center) {
				if (center)
					city.center = center;
				finishSuccess(city);
			}).catch(function() {
				finishSuccess(city);
			});
		}).catch(function() {
			fallback();
		});
	}

	if (isOfflineMode()) {
		fromCacheThen(finishFailure);
		return;
	}

	var ref = database.ref('CityDetail');
	pushLoader();
	ref.orderByChild('gp_id').equalTo(city_gp_id).once('value', function(snapshot) {
		popLoader();
		if (snapshot.exists()) {
			var city = Object.values(snapshot.val())[0];
			city.id = Object.keys(snapshot.val())[0];
			finishSuccess(city);
		}
		else {
			fromCacheThen(finishFailure);
		}
	}).catch(function() {
		popLoader();
		fromCacheThen(finishFailure);
	});
}

function noCity(position) {
	showNoCityMessage();
	showAddress();
	infoWindow_setContent("City not in database");
}

function notInRange(position) {
	showNotification("Error: place out of range of selected city");
	showAddress();
	infoWindow_setContent("<div class='control' onclick='showChooseCity_by_periphery_Message();'>Not in <span class='blue'>selected<span> city's range</div>");
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
