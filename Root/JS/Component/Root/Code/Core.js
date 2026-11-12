// var pendingPosition;
// var pendingWords;
// var wordList;
// var current_city_gp_id;
// var is_current_city;
// const PURE_WCODE_CITY_PICKED;
// const PURE_WCODE_CITY_FAILED;
// var encode_session_id

function encode(position, locating_encode) {
	var session_id = encode_session_id = Symbol();
	clearCode();
	if(typeof isOfflineMode === 'function' && isOfflineMode()) {
		if(typeof selected_decode_city !== 'undefined' && selected_decode_city && selected_decode_city.center && !isRegionAnchor(selected_decode_city)) {
			encode_(selected_decode_city, position);
			return;
		}
		if(typeof encodeRegionFallback === 'function' && encodeRegionFallback(position)) return;
	}
	// The regional code can be generated locally if city services stop responding.
	var timeout = setTimeout(function() { finish(null); }, 20000);

	function finish(city) {
		clearTimeout(timeout);
		if(session_id !== encode_session_id)
			return;
		if(city && city.gp_id) {
			if(locating_encode === true)
				current_city_gp_id = city.gp_id;
			setCurrentCity_status(current_city_gp_id == city.gp_id);
		}
		encode_continue(city, position);
	}

	getAddress(position, session_id, function(address_components) {
		var localityIds = [...new Set(address_components
			.filter(result => result.place_id && result.types.includes('locality'))
			.map(result => result.place_id))];
		var fallbackId = getCityGpId(address_components.filter(result => !result.types.includes('locality')));
		var localityHints = getNestedLocalityHints(address_components);

		function lookupCoveringCity(id, found, next) {
			getCityFromCityGp_id(id, session_id, function(city) {
				getCityCenterFromId_session(city, session_id, function(city) {
					if(cityCoversPosition(city, position))
						found(city);
					else
						next();
				});
			}, next);
		}

		function finishWithChoices(city) {
			finish(city);
			getCity_by_perifery_list(position, encode_session_id);
		}

		function finishNearby(choices, tryAddressFallback) {
			var covering = choices.filter(entry => cityCoversPosition(entry.city, position));
			var parents = covering.filter(entry => localityHints.some(hint => matchesLocalityHint(entry.city, hint)));
			if(parents.length === 1) {
				finish(parents[0].city);
				return;
			}

			var closest = covering.reduce((best, entry) => !best || entry.distance < best.distance ? entry : best, null);
			function finishClosest() {
				finish(closest ? closest.city : null);
			}
			if(tryAddressFallback && fallbackId)
				lookupCoveringCity(fallbackId, finish, finishClosest);
			else
				finishClosest();
		}

		function queryNearby() {
			getCity_by_perifery_list(position, session_id, finishNearby);
		}

		function tryLocality(index) {
			if(index < localityIds.length)
				lookupCoveringCity(localityIds[index], finishWithChoices, () => tryLocality(index + 1));
			else if(localityHints.length)
				getCity_by_perifery_list(position, session_id, choices => finishNearby(choices, true));
			else if(fallbackId)
				lookupCoveringCity(fallbackId, finishWithChoices, queryNearby);
			else
				queryNearby();
		}

		tryLocality(0);
	});
}

var localityContextFields = {
	country: 'country',
	administrative_level_1: 'administrative_area_level_1',
	administrative_level_2: 'administrative_area_level_2',
	administrative_level_3: 'administrative_area_level_3'
};

function normalizeLocalityName(name) {
	return (name || '').normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
}

function getNestedLocalityHints(results) {
	var localityNames = new Set();
	var hints = [];
	for(var result of results) {
		var components = result.address_components || [];
		var locality = components.find(component => component.types.includes('locality'));
		if(!locality || !locality.long_name)
			continue;
		var name = normalizeLocalityName(locality.long_name);
		if(result.place_id && result.types.includes('locality')) {
			localityNames.add(name);
			continue;
		}
		var hint = {name: name};
		for(var field in localityContextFields) {
			var component = components.find(item => item.types.includes(localityContextFields[field]));
			if(component && component.long_name)
				hint[field] = normalizeLocalityName(component.long_name);
		}
		hints.push(hint);
	}
	return hints.filter(hint => !localityNames.has(hint.name));
}

function matchesLocalityHint(city, hint) {
	return [city.name, city.accent, city.name_id].some(name => normalizeLocalityName(name) === hint.name) &&
		Object.keys(localityContextFields).every(field => !hint[field] || normalizeLocalityName(city[field]) === hint[field]);
}

function setCurrentCity_status(status) {
	var mapEl = document.getElementById('map');
	if(status) {
		removeClassIfPresent(mapEl, 'different_city');
		addClassIfPresent(mapEl, 'current_city');
	}
	else {
		removeClassIfPresent(mapEl, 'current_city');
		addClassIfPresent(mapEl, 'different_city');
	}
}

function encode_continue(city, position) {
	encode_session_id = Symbol();
	var session_id = encode_session_id;
	if(city == null) {
		if(typeof encodeRegionFallback === 'function' && encodeRegionFallback(position))
			return;
		areaNotCovered(position);
	}
	else {
		if(pendingCity) {
			hideNoCityMessage();
			infoWindow_setContent(MESSAGE_LOADING);
			pendingCity = false;
		}
		encode_(city, position, session_id);
	}
}

function getCityGpId(address_components) {
	var fallback = null;
	for(var i = 0; i < address_components.length; i++) {
		var result = address_components[i];
		if(!result.place_id)
			continue;
		if(result.types.includes('locality'))
			return result.place_id;
		if(fallback == null && (result.types.includes('administrative_area_level_1') ||
			result.types.includes('administrative_area_level_2') || result.types.includes('sublocality') ||
			result.types.includes('sublocality_level_1')))
			fallback = result.place_id;
	}
	return fallback;
}

function decode(words, decodeMarker, selectionVersion, fromUrl) {
	pushLoader();
	function finish(city, wcode) {
		if(selectionVersion != null && selectionVersion !== mapSelectionVersion) {
			popLoader();
			return;
		}
		if(fromUrl && !getWoloAnchorBegin(city)) {
			popLoader();
			var reference = words.slice(0, -3).join(' ');
			var indexed = /(?:^|[\s-])\d+$/.test(reference);
			showInvalidCodeDialog(
				reference,
				indexed ? 'Region not found' : 'City not found',
				indexed ? 'Check the region name and index in the link.' : 'Check the city name in the link.'
			);
			return;
		}
		decode_continue(city, wcode);
	}
	var city_words_length = words.length-3;

	var valid;

	if(words.length >= 3) {
		valid = true;
		for(var i = 0; i < 3; i++) {
			if(typeof wordList != 'undefined' && wordList.includes(words[city_words_length+i]) != true) {
				valid = false;
				break;
			}
		}
	}
	else
		valid = false;

	if(valid) {

			if(city_words_length > 0) {
				var ipGroup = words.slice(0, city_words_length-1);
				var ipCity = words.slice(city_words_length-1, city_words_length)[0];
				var codeWords = words.slice(city_words_length);
				getCityFromName(ipGroup, ipCity, function(city) {
					if(city == null)
						finish(null, codeWords);
					else
						getCityCenterFromId(city, function(city) { finish(city, codeWords); });
				}, fromUrl ? function() { finish(null, codeWords); } : undefined);
			}
			else if (words.length == 3) {
				
				if(selected_decode_city && selected_decode_city_source == 'ip') {
					decodeWithIpCity(words, selectionVersion);
				}
				else if(selected_decode_city && selected_decode_city.center) {
					finish(selected_decode_city, words);
				}
				else if(typeof(current_city_gp_id) != 'undefined' && current_city_gp_id != null)
					getCityFromCityGp_idThenDecode(current_city_gp_id, words, finish);
				else {
					
					if(!locationAccessCheck()) {
						if(geoIp_city_name && geoIp_city_name != '')
							decodeWithIpCity(words, selectionVersion);
					}
					else {
						
						var position;
						if(myLocDot == null) {
							var cityMarker = marker || decodeMarker;
							if(cityMarker != null && cityMarker.position != null) {
								position = cityMarker.position;
								if(marker)
									focus___(position);
								showNotification(PURE_WCODE_CITY_PICKED);
							}
							else {
								initLocate(false, function() {
									getCoarseLocation(function(position) {
										getCityFromPositionViaGMap(position, function(city) {
											getCityCenterFromId(city, function() {
												finish(city, words);
											} );
										}, handleLocationError) }, handleLocationError);
									return;
								});
							}
						}
						else {
							position = myLocDot.position;
						}
					
						if(position != null)
							getCityFromPositionThenDecode(resolveLatLng(position), words, finish);
						else {
							if(!geoIp_city_name && geoIp_city_name != '')
								decodeWithIpCity(words, selectionVersion);
							else
								showNotification(PURE_WCODE_CITY_FAILED);
						}
							
					}
					
				}
				
			}

	}
	else {
		if(typeof popLoader == 'function') {
			popLoader();
		}
		showInvalidCodeDialog(words.join(' '));
	}
}

function decode_continue(city, wcode) {
	popLoader();
	if(city != null)
		decode_(city, wcode);
	else {
		showInvalidCodeDialog((wcode && wcode.length) ? wcode.join(' ') : '');
	}
}

var pendingIpDecodeSelection;
function decodeWithIpCity(words, selectionVersion) {
	if(selectionVersion != null && selectionVersion !== mapSelectionVersion) {
		popLoader();
		return;
	}
	if(geoIp_city_name) {
		popLoader();
		if(geoIP_city)
			decode_(geoIP_city, words);
		else
			decode([geoIp_city_name.toLowerCase()].concat(words), null, selectionVersion);
		showNotification(IP_CITY_DECODE);
	}
	else {
		pendingWords_geo = words;
		pendingIpDecodeSelection = selectionVersion;
	}
}
