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
	persistDecodeCityHistory(history.slice(0, 8));
}

function persistDecodeCityHistory(history) {
	if(typeof(Storage) === 'undefined')
		return;

	decode_city_history = history;
	localStorage[getDecodeCityStorageKey()] = JSON.stringify(history);
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

function getDecodeCityHistoryToggles() {
	return [
		document.getElementById('decode_city_history_toggle'),
		document.getElementById('map_city_history_toggle')
	].filter(Boolean);
}

function syncDecodeCityHistoryControl() {
	decode_city_history = getDecodeCityHistory();

	var disabled = false; // Region selection and city proposals also work without history.
	var toggles = getDecodeCityHistoryToggles();
	for(var i = 0; i < toggles.length; i++)
		toggles[i].disabled = disabled;
}

function setDecodeCityHistoryExpanded(expanded) {
	var toggles = getDecodeCityHistoryToggles();
	for(var i = 0; i < toggles.length; i++) {
		toggles[i].setAttribute('aria-expanded', expanded ? 'true' : 'false');
		if(expanded)
			toggles[i].classList.add('activating');
		else
			toggles[i].classList.remove('activating');
	}
}

function showDecodeCityHistoryMessage() {
	decode_city_history = getDecodeCityHistory();

	initDecodeCityHistoryDeleteControls();
	hideDecodeCityHistoryDeletePrompt();
	renderDecodeCityHistoryList();
	if(typeof renderCityRegionMenu === 'function') renderCityRegionMenu('history', 'history');
	setDecodeCityHistoryExpanded(true);
	showOverlay(document.getElementById('decode_city_history_message'));
}

function hideDecodeCityHistoryMessage() {
	hideOverlay(document.getElementById('decode_city_history_message'));
	clearDecodeCityHistoryList();
	hideDecodeCityHistoryDeletePrompt();
	setDecodeCityHistoryExpanded(false);
}

function renderDecodeCityHistoryList() {
	var container = document.getElementById('decode_city_history_message_list');
	if(!container)
		return;

	clearDecodeCityHistoryList();
	container.classList.remove('hide');
	for(var i = 0; i < decode_city_history.length; i++) {
		var row = document.createElement('div');
		var city = decode_city_history[i];
		if(typeof isRegionAnchor === 'function' && isRegionAnchor(city))
			row.innerHTML = getRegionReferenceHTML(city, getDecodeCityDisplayName(city));
		else
			row.innerText = getDecodeCityDisplayName(city);
		row.data_id = i;
		row.title = 'Press and hold to remove';
		row.addEventListener('contextmenu', preventDecodeCityHistoryContextMenu);
		addLongpressListener(row, chooseDecodeCityFromHistory, showDeleteDecodeCityOption);
		container.appendChild(row);
	}
}

function clearDecodeCityHistoryList() {
	var container = document.getElementById('decode_city_history_message_list');
	if(container)
		container.innerHTML = '';
}

function preventDecodeCityHistoryContextMenu(e) {
	e.preventDefault();
}

function focusSelectedDecodeCityOnMap(city) {
	if(!city)
		return;
	if(typeof isDecodeView == 'function' && isDecodeView())
		return;
	if(typeof map == 'undefined' || !map)
		return;

	function go(resolved) {
		var center = resolved && resolved.center;
		var lat;
		var lng;
		if(!center)
			return;
		lat = typeof center.lat == 'function' ? center.lat() : center.lat;
		lng = typeof center.lng == 'function' ? center.lng() : center.lng;
		if(lat == null || lng == null)
			return;
		if(typeof animateMapToCityScope == 'function')
			animateMapToCityScope({ lat: lat, lng: lng });
		else {
			map.panTo({ lat: lat, lng: lng });
			if(typeof map.getZoom == 'function' && map.getZoom() < 11)
				map.setZoom(11);
		}
	}

	if(city.id && typeof getCityCenterFromId == 'function')
		getCityCenterFromId(city, go);
	else
		go(city);
}

function chooseDecodeCityFromHistory(e) {
	var id = e.currentTarget.data_id;
	var city = decode_city_history[parseInt(id, 10)];

	if(city) {
		setDecodeCity(city, 'history', true);
		hideDecodeCityHistoryMessage();
		focusSelectedDecodeCityOnMap(city);
	}
}

function showDeleteDecodeCityOption(e) {
	var index = parseInt(e.currentTarget.data_id, 10);
	var city = decode_city_history[index];
	var prompt = document.getElementById('decode_city_history_delete');
	var name = document.getElementById('decode_city_history_delete_name');
	var list = document.getElementById('decode_city_history_message_list');
	if(!city || !prompt || !name || !list)
		return;

	pending_delete_decode_city_index = index;
	name.innerText = getDecodeCityDisplayName(city);
	list.classList.add('hide');
	prompt.classList.remove('hide');
}

function hideDecodeCityHistoryDeletePrompt() {
	pending_delete_decode_city_index = null;
	var prompt = document.getElementById('decode_city_history_delete');
	var list = document.getElementById('decode_city_history_message_list');
	if(prompt)
		prompt.classList.add('hide');
	if(list)
		list.classList.remove('hide');
}

function cancelDeleteDecodeCity() {
	hideDecodeCityHistoryDeletePrompt();
}

function confirmDeleteDecodeCity() {
	if(pending_delete_decode_city_index == null)
		return;

	var removed = decode_city_history[pending_delete_decode_city_index];
	if(!removed) {
		hideDecodeCityHistoryDeletePrompt();
		return;
	}

	var removed_key = getDecodeCityHistoryKey(removed);
	var history = getDecodeCityHistory().filter(function(entry) {
		return getDecodeCityHistoryKey(entry) != removed_key;
	});
	persistDecodeCityHistory(history);

	var selected_key = selected_decode_city ? getDecodeCityHistoryKey(selected_decode_city) : null;
	if(selected_key == removed_key) {
		if(history.length > 0)
			setDecodeCity(history[0], 'history', false);
		else
			selectIpDecodeCity();
	}

	if(history.length == 0) {
		hideDecodeCityHistoryMessage();
		return;
	}

	hideDecodeCityHistoryDeletePrompt();
	renderDecodeCityHistoryList();
}

function initDecodeCityHistoryDeleteControls() {
	var confirm_button = document.getElementById('decode_city_history_delete_confirm');
	var cancel_button = document.getElementById('decode_city_history_delete_cancel');
	if(confirm_button && !confirm_button.data_bound)
		confirm_button.addEventListener('click', confirmDeleteDecodeCity);
	if(cancel_button && !cancel_button.data_bound)
		cancel_button.addEventListener('click', cancelDeleteDecodeCity);
	if(confirm_button)
		confirm_button.data_bound = true;
	if(cancel_button)
		cancel_button.data_bound = true;
}

function syncDecodeCitySourceButtons() {
	var controls = {
		geolocation: document.getElementById('decode_city_geolocation'),
		ip: document.getElementById('decode_city_ip'),
		history: document.getElementById('decode_city_history_toggle')
	};
	var mapHistory = document.getElementById('map_city_history_toggle');
	var source;

	for(source in controls) {
		if(controls[source]) {
			controls[source].classList.toggle('active', selected_decode_city_source == source);
			if(selected_decode_city_source == source)
				controls[source].classList.remove('activating');
		}
	}
	if(mapHistory) {
		mapHistory.classList.toggle('active', selected_decode_city_source == 'history');
		if(selected_decode_city_source == 'history')
			mapHistory.classList.remove('activating');
	}
}

function getCity_by_perifery_list(latLng, session_id, onChoices) {
	if(!geoFireInit()) {
		if(onChoices)
			onChoices([]);
		return;
	}
	var coordinates = {};
	var details = {};
	var ready = false;
	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		// Include the corners of the square city grid when choosing an encoding reference.
		radius: onChoices ? CITY_RANGE_RADIUS * Math.SQRT2 : CITY_RANGE_RADIUS
	});

	function publishWhenReady() {
		if(ready && Object.keys(coordinates).length === Object.keys(details).length)
			sessionForwarder(session_id, function() {
				syncNearCityList(coordinates, details, onChoices);
			});
	}

	pushLoader();
	geoQuery.on('ready', function() {
		geoQuery.cancel();
		popLoader();
		ready = true;
		publishWhenReady();
	});

	geoQuery.on('key_entered', function(key, location, distance) {
		sessionForwarder(session_id, function() {
			coordinates[key] = {center: {lat: location[0], lng: location[1]}, distance: distance};
			getCityFromId(key, function(city) {
				details[key] = city;
				publishWhenReady();
			});
		});
	});
}

function syncNearCityList(coordinates, details, onChoices) {
	var choices = [];
	for(var key of Object.keys(coordinates)) {
		if(!details[key])
			continue;
		var entry = {
			city: Object.assign({}, details[key], {id: key, center: coordinates[key].center}),
			distance: coordinates[key].distance
		};
		choices.push(entry);
	}
	chooseCity_by_periphery(choices, function(city) {
		encode_continue(city, resolveLatLng(marker.getPosition()));
	});
	if(onChoices)
		onChoices(choices);
}

function getCityFromIdThenEncode(city_id, city_center, latLng) {
	getCityFromId(city_id, function(city) {
		city.center = city_center;
		encode_continue(city, latLng);
	});
}

function getCityFromPositionThenDecode(latLng, wcode, finish) {
	var nearCity = null;

	if(!geoFireInit()) {
		finish(null, wcode);
		return;
	}
	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		radius: CITY_RANGE_RADIUS
	});

	pushLoader();
	geoQuery.on('ready', function() {
		popLoader();
		geoQuery.cancel();
		if(!nearCity || nearCity.id == null)
			finish(null, wcode);
		else
			getCityFromId(nearCity.id, function(city) {
				if(!city) {
					finish(null, wcode);
					return;
				}
				city.center = nearCity.center;
				finish(city, wcode);
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

function getCityFromCityGp_idThenDecode(city_gp_id, wcode, finish) {
	function callback_success(city) {
		getCityCenterFromId(city, function() {
			finish(city, wcode);
		} );
	};
	function callback_failure() {
		finish(null, wcode);
	};
	var session_id;
	session_id = dencode_session_id = Date.now();
	getCityFromCityGp_id(city_gp_id, encode_session_id, callback_success, callback_failure )
}

function isUsableCityId(id) {
	return id != null && id !== '' && id !== 'undefined' && id !== 'null';
}

function getCityMatchingId(id) {
	if (!isUsableCityId(id))
		return null;
	if (typeof code_city != 'undefined' && code_city
		&& (code_city.id == id || code_city.gp_id == id))
		return code_city;
	return null;
}

// only detail, not center
function getCityFromId(id, callback, options) {
	if(typeof regionAnchorFromId === 'function' && /^region:/.test(String(id || ''))) {
		callback(regionAnchorFromId(id));
		return;
	}
	var notify = !(options && options.notify === false);
	var reportFailure = options && options.notify === false;
	var useLoader = notify;

	function succeed(city) {
		if (city) {
			if (!isUsableCityId(city.id))
				city.id = id;
			rememberCity(city);
			callback(city);
			return;
		}
		if (notify) {
			if (isOfflineMode())
				showNotification('City not available offline. Open this city once while online.');
			else
				showNotification("Error: City not found!");
		}
		if (reportFailure && typeof callback == 'function')
			callback(null);
	}

	function lookupByGpId() {
		if (typeof getCityFromCityGp_id != 'function') {
			succeed(null);
			return;
		}
		getCityFromCityGp_id(id, function(city) {
			succeed(city || null);
		}, function() {
			succeed(null);
		});
	}

	function lookupCacheThenGpId() {
		var memoryCity = getCityMatchingId(id);
		if (memoryCity) {
			succeed(memoryCity);
			return;
		}
		if (typeof getCityFromCache != 'function') {
			if (isOfflineMode())
				succeed(null);
			else
				lookupByGpId();
			return;
		}
		getCityFromCache(id, function(cached) {
			if (cached) {
				succeed(cached);
				return;
			}
			if (isOfflineMode())
				succeed(null);
			else
				lookupByGpId();
		});
	}

	if (!isUsableCityId(id)) {
		succeed(null);
		return;
	}

	var memoryCity = getCityMatchingId(id);
	if (memoryCity) {
		succeed(memoryCity);
		return;
	}

	if (isOfflineMode()) {
		lookupCacheThenGpId();
		return;
	}

	var ref = database.ref('CityDetail'+'/'+id);
	if (useLoader)
		pushLoader();
	ref.once('value').then(function(snapshot) {
		if (useLoader)
			popLoader();
		var city = snapshot.val();
		if (city) {
			city.id = id;
			succeed(city);
		} else {
			lookupCacheThenGpId();
		}
	}).catch(function() {
		if (useLoader)
			popLoader();
		lookupCacheThenGpId();
	});
}

function normalizeCityLookupToken(token) {
	if(typeof normalizeWoloPathToken === 'function')
		return normalizeWoloPathToken(token);
	return String(token || '').toLowerCase().replace(/\+/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function getCityFromNameVariants(city_name_part) {
	var primary = city_name_part.map(function(part) { return normalizeCityLookupToken(part); });
	var variants = [primary];
	var withSpaces = primary.map(function(part) { return part.replace(/-/g, ' '); });
	if(withSpaces.join('\u0001') !== primary.join('\u0001'))
		variants.push(withSpaces);
	return variants;
}

function buildCityNameQueryList(city_name_part) {
	var query_list = [];
	for(var i = 0; i < city_name_part.length; i++) {
		query_list.push({
			group: city_name_part.slice(0, i),
			name: city_name_part.slice(i).join(' ')
		});
	}
	return query_list;
}

function getCityFromName(group, name, callback, onFailure) {
	var city_name_part = group.concat([name]).map(function(part) { return normalizeCityLookupToken(part); });
	if(typeof regionAnchorFromName === 'function') {
		var regional = regionAnchorFromName(city_name_part.join(' '));
		if(!regional)
			regional = regionAnchorFromName(city_name_part.join(' ').replace(/-/g, ' '));
		if(regional) {
			callback(regional);
			return;
		}
		var regionalMatch = /^(.*?)\s+[0-9]+$/.exec(city_name_part.join(' '));
		if(regionalMatch && regionByName(regionalMatch[1])) {
			if(typeof onFailure === 'function') onFailure();
			else decode_continue(null);
			return;
		}
	}
	var variants = getCityFromNameVariants(city_name_part).map(buildCityNameQueryList);
	getCityFromNameVariantsQuery(variants, 0, callback, onFailure);
}

function getCityFromNameVariantsQuery(variants, variantIndex, callback, onFailure) {
	if(variantIndex >= variants.length) {
		if (isOfflineMode()) {
			showNotification('City not available offline. Open this city once while online.');
		}
		if(typeof onFailure === 'function') onFailure();
		else decode_continue();
		return;
	}
	getCityFromNameQuery(variants[variantIndex], 0, callback, function() {
		getCityFromNameVariantsQuery(variants, variantIndex + 1, callback, onFailure);
	});
}

function getCityFromNameQuery(query_list, index, callback, onFailure) {
	if(index >= query_list.length) {
		if(typeof onFailure === 'function')
			onFailure();
		else
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
				getCityFromNameQuery(query_list, index + 1, callback, onFailure);
			}
		}).catch(function() {
			getCityFromNameQuery(query_list, index + 1, callback, onFailure);
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
			getCityFromNameQuery(query_list, index+1, callback, onFailure);
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
		getCityFromNameQuery(query_list, index + 1, callback, onFailure);
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

function getCityCenterFromId(city, callback, options) {
	if(typeof isRegionAnchor === 'function' && isRegionAnchor(city)) {
		callback(regionAnchorFromId(city.id));
		return;
	}
	if(!city) {
		if(typeof callback == 'function')
			callback(null);
		return;
	}
	var refresh = options && options.refresh;

	function finish(center) {
		var plain = typeof plainCityCenter == 'function' ? plainCityCenter(center) : center;
		if (plain) {
			city.center = plain;
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

	var existing = !refresh && typeof plainCityCenter == 'function'
		? plainCityCenter(city.center)
		: (!refresh && city.center && city.center.lat != null && typeof city.center.lat != 'function' ? city.center : null);
	if (existing) {
		city.center = existing;
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
	if(typeof regionAnchorFromName === 'function') {
		var anchor = regionAnchorFromName(name_id);
		if(anchor) { var regional = {}; regional[anchor.id] = anchor; callback(regional); return; }
	}
	if(!database || typeof database.ref != 'function') {
		if(typeof findCachedCitiesByNameId != 'function') {
			callback(null);
			return;
		}
		findCachedCitiesByNameId(name_id).then(function(matches) {
			var list = {};
			(matches || []).forEach(function(city) {
				if(city && city.id)
					list[city.id] = city;
			});
			callback(Object.keys(list).length ? list : null);
		}).catch(function() {
			callback(null);
		});
		return;
	}
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
	if(typeof encodeRegionFallback === 'function' && encodeRegionFallback(position)) {
		showAddress();
		return;
	}
	if(typeof showCityProposal === 'function') showCityProposal();
	else showNoCityMessage();
	showAddress();
	infoWindow_setContent("City not in database");
}

function notInRange(position) {
	showNotification("Error: place out of range of selected city");
	showAddress();
	infoWindow_setContent("<div class='control' onclick='showChooseCity_by_periphery_Message();'>Not in <span class='blue'>selected<span> city's range</div>");
	showChooseCity_by_periphery_Message();
}

function areaNotCovered(position) {
	code_wcode = null;
	if(position)
		showMarker(position);
	showNotification("Area not covered");
	showAddress();
	infoWindow_setContent("<div>Area not covered</div>");
	if(typeof addClassIfPresent == 'function')
		addClassIfPresent(document.getElementById('wait_loader'), 'hide');
	else if(typeof wait_loader != 'undefined' && wait_loader)
		wait_loader.classList.add('hide');
}

function submitCity(data) {
	if(!database || typeof database.ref != 'function')
		return Promise.reject(new Error('Requesting a city needs an internet connection'));
	var newPostKey = database.ref().child('CityRequest').push().key;
	var updates = {};
	updates['/CityRequest/' + newPostKey] = Object.assign({}, data, {
		time: firebase.database.ServerValue.TIMESTAMP,
		processed: false
	});
	return database.ref().update(updates).then(function() { return newPostKey; });
}

function tryDefaultCity() {
	if(typeof requestTryCityZoomOut === 'function')
		requestTryCityZoomOut();
	decode(DEFAULT_WCODE);
	addClassIfPresent(document.getElementById('notification_top'), 'hide');
	if(typeof infoWindow != 'undefined')
		infoWindow.close();
}

function getFullCity(city, groupLocality) {
	if(!city) {
		return '';
	}
	if(typeof isRegionAnchor === 'function' && isRegionAnchor(city)) return getRegionReferenceHTML(city);
	var locality = city.locality;
	var cityGroupName = getCityGroupName(city, ' \\ ');
	var properCityAccent = getProperCityAccent(city);
	if(!cityGroupName || (!locality && cityGroupName == properCityAccent))
		return city.country + ' \\ ' + properCityAccent;
	else {
		if(locality && !groupLocality)
			return city.country + ' \\ ' + cityGroupName + ' : ' + properCityAccent;
		else
			return city.country + ' \\ ' + cityGroupName + ' \\ ' + properCityAccent;
	}
}

function renderCityChoices(container, choices) {
	container.textContent = '';
	var entries = choices.map(function(choice) {
		var regional = typeof isRegionAnchor === 'function' && isRegionAnchor(choice.city);
		var label = getFullCity(choice.city, true);
		return {choice: choice, regional: regional, path: regional ? [label] : label.split(' \\ ')};
	});
	if(entries.length)
		container.appendChild(buildCityChoiceList(entries, 0));
}

function buildCityChoiceList(entries, depth) {
	var list = document.createElement('ul');
	list.className = 'city_choice_list';
	var groups = new Map();
	entries.forEach(function(entry) {
		// A city that ends here is a selectable leaf, even when it shares a group name.
		var key = entry.path.length > depth + 1 ? entry.path[depth] : entry;
		if(!groups.has(key))
			groups.set(key, []);
		groups.get(key).push(entry);
	});

	groups.forEach(function(group) {
		var item = document.createElement('li');
		list.appendChild(item);
		if(group.length === 1) {
			var entry = group[0];
			var button = document.createElement('button');
			button.type = 'button';
			button.className = 'city_choice_button';
			var label = document.createElement('span');
			label.className = 'city_choice_name';
			if(entry.regional)
				label.innerHTML = entry.path[0];
			else
				label.textContent = entry.path.slice(depth).join(' \\ ');
			button.appendChild(label);

			var status = entry.choice.status;
			if(status === 'Current') {
				button.setAttribute('aria-current', 'true');
			} else if(status) {
				var badge = document.createElement('span');
				badge.className = 'city_choice_status';
				badge.textContent = status;
				button.appendChild(badge);
			}
			if(depth)
				button.setAttribute('aria-label', entry.path.join(' \\ ') + (status ? ', ' + status : ''));
			button.data_id = entry.choice.key;
			button.addEventListener('click', entry.choice.select);
			item.appendChild(button);
			return;
		}

		var path = group[0].path;
		var end = depth + 1;
		while(group.every(function(entry) {
			return entry.path.length > end + 1 && entry.path[end] === path[end];
		}))
			end++;
		var heading = document.createElement('span');
		heading.className = 'city_choice_heading';
		heading.textContent = path.slice(depth, end).join(' \\ ');
		item.appendChild(heading);
		item.appendChild(buildCityChoiceList(group, end));
	});
	return list;
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
