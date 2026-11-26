// const DEFAULT_WCODE;
// var pendingCity;
// var pendingCitySubmit;
var multiple_city;
var multiple_country;
var multiple_group;
var decodeCityLookup;
var decodeCityIssue = '';
var decodeCityPreview = null;
var decodeCityBlockedInput = null;

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
		getCityByIp();
	}
	else
		selectIpDecodeCity();
}

function setDecodeCityFromIp(city_name) {
	geoIp_city_name = city_name;
	if(selected_decode_city_source === 'ip' && decodeCityLookup)
		verifyDecodeIpCity(decodeCityLookup, city_name);
	else if(selected_decode_city_source == 'ip' || !selected_decode_city_source)
		selectIpDecodeCity();
}

function selectIpDecodeCity() {
	var lookup = startDecodeCityLookup('ip');
	if(!geoIp_city_name) {
		getCityByIp(function(name) {
			if(!name && decodeCityLookup === lookup)
				setDecodeCityIssue(detectedCityIssue());
		});
		return;
	}

	verifyDecodeIpCity(lookup, geoIp_city_name);
}

function verifyDecodeIpCity(lookup, name) {
	var country = typeof geoIp_country_code === 'string' ? geoIp_country_code : '';
	getDecodeIpCity(name, function(city, missing) {
		if(decodeCityLookup !== lookup)
			return;
		if(city)
			acceptDetectedDecodeCity(lookup, city, 'ip');
		else {
			var preview = /^[a-z]{2}$/i.test(country) ? {country: country} : null;
			setDecodeCityIssue(detectedCityIssue(missing), name, preview);
		}
	});
}

function resolveDecodeCityPreview(preview, callback) {
	if(preview.center || typeof google === 'undefined' || !google.maps || !google.maps.Geocoder) {
		callback(preview.center);
		return;
	}
	var name = normalizeCityLookupToken(preview.name);
	new google.maps.Geocoder().geocode({
		address: preview.name,
		componentRestrictions: {country: preview.country}
	}, function(results, status) {
		var matches = status === 'OK' && (results || []).filter(function(result) {
			return !result.partial_match && (result.address_components || []).some(function(component) {
				return normalizeCityLookupToken(component.long_name) === name && result.types.some(function(type) {
					return /^(locality|postal_town|sublocality(?:_level_\d+)?|administrative_area_level_\d+)$/.test(type) && component.types.includes(type);
				});
			});
		});
		callback(matches && matches.length === 1 && regionPosition(matches[0].geometry && matches[0].geometry.location));
	});
}

function startDecodeCityLookup(source) {
	selected_decode_city = null;
	selected_decode_city_source = source;
	setDecodeCityIssue('');
	setDecodeCityLabel('Loading...');
	syncDecodeCitySourceButtons();
	return decodeCityLookup = {};
}

function acceptDetectedDecodeCity(lookup, city, source) {
	setDecodeCity(city, source, source === 'geolocation');
	if(lookup.onComplete)
		lookup.onComplete();
}

function getDecodeIpCity(name, callback) {
	var nameId = normalizeCityLookupToken(name);
	var offline = isOfflineMode();
	getCitiesFromNameId(nameId, function(list, failed) {
		var ids = Object.keys(list || {});
		if(ids.length !== 1) {
			callback(null, !failed && !offline && ids.length === 0);
			return;
		}
		var city = list[ids[0]];
		city.id = ids[0];
		getCityCenterFromId(city, function(resolved) {
			callback(getWoloAnchorBegin(resolved) ? resolved : null);
		});
	}, {exact: true});
}

function requestDecodeCityGeolocation() {
	var lookup = startDecodeCityLookup('geolocation');
	initLocate(true, function(failure) {
		if(decodeCityLookup !== lookup)
			return;
		getCoarseLocation(function(position) {
			if(decodeCityLookup !== lookup)
				return;
			getCityFromPositionViaGMap(position, function(city) {
				if(decodeCityLookup !== lookup)
					return;
				getCityCenterFromId(city, function(city) {
					if(decodeCityLookup !== lookup)
						return;
					if(getWoloAnchorBegin(city))
					acceptDetectedDecodeCity(lookup, city, 'geolocation');
					else
						setDecodeCityIssue(detectedCityIssue());
				});
			}, function(name, missing, center) {
				if(decodeCityLookup === lookup)
					setDecodeCityIssue(detectedCityIssue(missing), name, center && {center: center});
			});
		}, function() {
			if(decodeCityLookup !== lookup)
				return;
			setDecodeCityIssue('Couldn’t detect your location.');
			if(!locationAccessCheck() && typeof failure == 'function')
				failure();
		});
	});
}

function detectedCityIssue(missing) {
	return missing ? 'Check that the city matches your Wolo Code.' : 'Couldn’t verify the detected city.';
}

function isDecodeCityRetryBlocked(input) {
	return input && input.value === decodeCityBlockedInput;
}

function setDecodeCityStatus(message) {
	var status = document.getElementById('decode_city_status');
	if(status)
		status.textContent = message || '';
	var input = document.getElementById('decode_input');
	decodeCityBlockedInput = message && input ? input.value : null;
	if(typeof syncProceedButtons === 'function')
		syncProceedButtons();
}

function setDecodeCityIssue(message, name, preview) {
	decodeCityIssue = message;
	decodeCityPreview = name && preview ? Object.assign({name: name}, preview) : null;
	setDecodeCityStatus('');
	if(message) {
		var lookup = decodeCityLookup;
		decodeCityLookup = null;
		setDecodeCityLabel(name || 'Choose city or region', !!name);
		if(lookup && lookup.onComplete)
			lookup.onComplete();
	}
}

function setDecodeCity(city, source, save_history) {
	if(!city)
		return;

	decodeCityLookup = null;
	setDecodeCityIssue('');
	selected_decode_city = city;
	selected_decode_city_source = source;
	rememberCity(city);

	if(city.gp_id)
		current_city_gp_id = city.gp_id;
	setDecodeCityLabel(getDecodeCityDisplayName(city));
	if(save_history)
		saveDecodeCity(city);
	syncDecodeCitySourceButtons();
}

function setDecodeCityLabel(label, unavailable) {
	var city_label = document.getElementById('decode_input_city');
	if(city_label) {
		city_label.innerText = label || '\u00a0';
		city_label.setAttribute('data-unavailable', unavailable ? 'true' : 'false');
		city_label.setAttribute('aria-label', label ? label + '. Choose city or region' : 'Choose city or region');
	}
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
		document.getElementById('decode_input_city'),
		document.getElementById('decode_city_history_toggle'),
		document.getElementById('map_city_history_toggle')
	].filter(Boolean);
}

function syncDecodeCityHistoryControl() {
	decode_city_history = getDecodeCityHistory();

	var disabled = false; // City and region search work without history.
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
	var regionList = document.getElementById('decode_region_history_message_list');
	for(var i = 0; i < decode_city_history.length; i++) {
		var row = document.createElement('div');
		row.className = 'decode_city_history_row';
		var city = decode_city_history[i];
		var displayName = getDecodeCityDisplayName(city);
		var regional = typeof isRegionAnchor === 'function' && isRegionAnchor(city);
		if(selected_decode_city && getDecodeCityHistoryKey(city) === getDecodeCityHistoryKey(selected_decode_city))
			row.setAttribute('aria-current', 'true');

		var name = document.createElement('span');
		name.className = 'decode_city_history_name';
		if(regional)
			name.innerHTML = getRegionReferenceHTML(city, displayName);
		else
			name.innerText = displayName;
		row.appendChild(name);

		var remove_btn = document.createElement('button');
		remove_btn.type = 'button';
		remove_btn.className = 'decode_city_history_remove';
		remove_btn.textContent = '\u00d7';
		remove_btn.title = 'Remove ' + displayName;
		remove_btn.setAttribute('aria-label', 'Remove ' + displayName);
		remove_btn.data_id = i;

		remove_btn.addEventListener('pointerdown', function(e) { e.stopPropagation(); });
		remove_btn.addEventListener('pointerup', function(e) { e.stopPropagation(); });
		remove_btn.addEventListener('pointercancel', function(e) { e.stopPropagation(); });
		remove_btn.addEventListener('touchstart', function(e) { e.stopPropagation(); });
		remove_btn.addEventListener('touchend', function(e) { e.stopPropagation(); });
		remove_btn.addEventListener('contextmenu', function(e) { e.stopPropagation(); e.preventDefault(); });
		remove_btn.addEventListener('click', function(e) {
			e.stopPropagation();
			var index = parseInt(e.currentTarget.data_id, 10);
			removeDecodeCityByIndex(index);
		});
		row.appendChild(remove_btn);

		row.data_id = i;
		row.title = displayName;
		row.setAttribute('role', 'button');
		row.tabIndex = 0;
		row.addEventListener('keydown', function(e) {
			if((e.key === 'Enter' || e.key === ' ') && e.target === row) {
				e.preventDefault();
				chooseDecodeCityFromHistory(e);
			}
		});
		row.addEventListener('contextmenu', preventDecodeCityHistoryContextMenu);
		addLongpressListener(row, chooseDecodeCityFromHistory, showDeleteDecodeCityOption);
		(regional && regionList ? regionList : container).appendChild(row);
	}
}

function clearDecodeCityHistoryList() {
	var container = document.getElementById('decode_city_history_message_list');
	if(container)
		container.innerHTML = '';
	var regions = document.getElementById('decode_region_history_message_list');
	if(regions)
		regions.innerHTML = '';
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
	var picker = document.getElementById('history_region_menu');
	if(picker)
		picker.hidden = true;
	prompt.classList.remove('hide');
}

function hideDecodeCityHistoryDeletePrompt() {
	pending_delete_decode_city_index = null;
	var picker = document.getElementById('history_region_menu');
	if(picker)
		picker.hidden = false;
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

function removeDecodeCityByIndex(index) {
	if(typeof decode_city_history === 'undefined' || !decode_city_history)
		decode_city_history = getDecodeCityHistory();

	var removed = decode_city_history[index];
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

function confirmDeleteDecodeCity() {
	if(pending_delete_decode_city_index == null)
		return;

	var index = pending_delete_decode_city_index;
	pending_delete_decode_city_index = null;
	removeDecodeCityByIndex(index);
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
	var finished = false;
	var geoQuery = geoFire.query({
		center: [latLng.lat, latLng.lng],
		// Include the corners of the square city grid when choosing an encoding reference.
		radius: onChoices ? CITY_RANGE_RADIUS * Math.SQRT2 : CITY_RANGE_RADIUS
	});

	function finish() {
		if(finished)
			return;
		finished = true;
		clearTimeout(timeout);
		geoQuery.cancel();
		popLoader();
		sessionForwarder(session_id, function() {
			syncNearCityList(coordinates, details, onChoices);
		});
	}

	function publishWhenReady() {
		if(ready && Object.keys(coordinates).length === Object.keys(details).length)
			finish();
	}

	pushLoader();
	// GeoFire may never report readiness when the connection drops.
	var timeout = setTimeout(finish, 10000);
	geoQuery.on('ready', function() {
		ready = true;
		publishWhenReady();
	});

	geoQuery.on('key_entered', function(key, location, distance) {
		sessionForwarder(session_id, function() {
			if(finished)
				return;
			coordinates[key] = {center: {lat: location[0], lng: location[1]}, distance: distance};
			getCityFromId(key, function(city) {
				details[key] = city;
				publishWhenReady();
			}, {notify: false});
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

function getCityFromCityGp_idThenDecode(city_gp_id, wcode, finish) {
	function callback_success(city) {
		getCityCenterFromId(city, function(resolved) { finish(resolved, wcode); });
	}
	function callback_failure() {
		finish(null, wcode);
	}
	getCityFromCityGp_id(city_gp_id, callback_success, callback_failure);
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

function getCityFromName(group, name, callback, onFailure, codeWords) {
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
	getCityFromNameVariantsQuery(variants, 0, callback, onFailure, codeWords);
}

function getCityFromNameVariantsQuery(variants, variantIndex, callback, onFailure, codeWords) {
	if(variantIndex >= variants.length) {
		if (isOfflineMode()) {
			showNotification('City not available offline. Open this city once while online.');
		}
		if(typeof onFailure === 'function') onFailure();
		else decode_continue();
		return;
	}
	getCityFromNameQuery(variants[variantIndex], 0, callback, function() {
		getCityFromNameVariantsQuery(variants, variantIndex + 1, callback, onFailure, codeWords);
	}, codeWords);
}

function getCityFromNameQuery(query_list, index, callback, onFailure, codeWords) {
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
				chooseCity(list, filtered.map(function(city) { return city.id; }), callback, codeWords);
			} else {
				getCityFromNameQuery(query_list, index + 1, callback, onFailure, codeWords);
			}
		}).catch(function() {
			getCityFromNameQuery(query_list, index + 1, callback, onFailure, codeWords);
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
			getCityFromNameQuery(query_list, index+1, callback, onFailure, codeWords);
		else {
			if(matchList.length == 1) {
				let i = matchList[0];
				var city = list[i];
				city.id = i;
				callback(city);
			}
			else	
				chooseCity(list, matchList, callback, codeWords);
		}
	}).catch(function() {
		popLoader();
		getCityFromNameQuery(query_list, index + 1, callback, onFailure, codeWords);
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

	function getCachedCenter() {
		return getCachedCityCenter(city.id).catch(function() { return null; });
	}

	if (isOfflineMode()) {
		getCachedCenter().then(finish);
		return;
	}

	refCityCenter.child(city.id).once('value').then(function(snapshot) {
		var value = snapshot.val();
		return value && value.l ? { lat: value.l[0], lng: value.l[1] } : getCachedCenter();
	}, getCachedCenter).then(finish);
}

function getCitiesFromNameId(name_id, callback, options) {
	var picker = options && options.picker;
	var exact = options && options.exact;
	if(!picker && !exact && typeof regionAnchorFromName === 'function') {
		var anchor = regionAnchorFromName(name_id);
		if(anchor) { var regional = {}; regional[anchor.id] = anchor; callback(regional); return; }
	}
	var databaseUnavailable = !database || typeof database.ref != 'function';
	if(databaseUnavailable || ((picker || exact) && isOfflineMode())) {
		if(typeof findCachedCitiesByNameId != 'function') {
			callback(null, true);
			return;
		}
		var cached = picker ? scanCityDetail(function(city) {
			return normalizeCityLookupToken(city.name_id || city.name).startsWith(name_id);
		}) : findCachedCitiesByNameId(name_id);
		cached.then(function(matches) {
			var list = {};
			(picker ? matches.slice(0, 10) : matches || []).forEach(function(city) {
				if(city && city.id)
					list[city.id] = city;
			});
			callback(Object.keys(list).length ? list : null, databaseUnavailable);
		}).catch(function() {
			callback(null, true);
		});
		return;
	}
	var ref = database.ref('CityDetail');
	if(!picker) pushLoader();
	var query = ref.orderByChild('name_id');
	query = exact ? query.equalTo(name_id) : query.startAt(name_id).endAt(name_id+'\uf8ff').limitToFirst(10);
	query.once('value').then(function(snapshot) {
		if(!picker) popLoader();
		callback(snapshot.val());
	}, function() {
		if(!picker) popLoader();
		callback(null, true);
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

	function finishFailure(missing) {
		forwardCityCallback(callback_failure, [missing === true]);
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

	if (isOfflineMode() || !database) {
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
			fromCacheThen(function() { finishFailure(true); });
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
