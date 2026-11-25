// var pendingPosition;
// var pendingWords;
// var wordList;
// var current_city_gp_id;
// var is_current_city;
// var encode_session_id

function encode(position, locating_encode) {
	var session_id = encode_session_id = Symbol();
	clearCode();
	if(typeof isOfflineMode === 'function' && isOfflineMode()) {
		if(typeof selected_decode_city !== 'undefined' && selected_decode_city && selected_decode_city.center && !isRegionAnchor(selected_decode_city)) {
			encode_(selected_decode_city, position, locating_encode);
			return;
		}
		if(typeof encodeRegionFallback === 'function' && encodeRegionFallback(position, locating_encode)) return;
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
		encode_continue(city, position, locating_encode);
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

function encode_continue(city, position, locating_encode) {
	encode_session_id = Symbol();
	if(city == null) {
		if(typeof encodeRegionFallback === 'function' && encodeRegionFallback(position, locating_encode))
			return;
		areaNotCovered(position);
	}
	else {
		if(pendingCity) {
			hideNoCityMessage();
			infoWindow_setContent(MESSAGE_LOADING);
			pendingCity = false;
		}
		encode_(city, position, locating_encode);
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

function decode(words, decodeMarker, selectionVersion, fromUrl, precisionWords) {
	pushLoader();
	function finish(city, wcode) {
		if(selectionVersion != null && selectionVersion !== mapSelectionVersion) {
			popLoader();
			return;
		}
		if(getWoloAnchorBegin(city)) {
			decode_continue(city, wcode, precisionWords);
			return;
		}
		popLoader();
		var reference = words.slice(0, -3).join(' ');
		if(!reference) {
			showDecodeReferenceRequired();
			return;
		}
		var indexed = /(?:^|[\s-])\d+$/.test(reference);
		var source = fromUrl ? ' in the link' : ' in the code';
		showInvalidCodeDialog(
			reference,
			indexed ? 'Region not found' : 'City not found',
			(indexed ? 'Check the region name and index' : 'Check the city name') + source + '.'
		);
	}
	var cityWordsLength = words.length - 3;
	var codeWords = words.slice(-3);
	if(cityWordsLength < 0 || (typeof wordList !== 'undefined' && codeWords.some(word => !wordList.includes(word)))) {
		popLoader();
		showInvalidCodeDialog(words.join(' '));
		return;
	}
	if(cityWordsLength > 0) {
		var group = words.slice(0, cityWordsLength - 1);
		var name = words[cityWordsLength - 1];
		getCityFromName(group, name, function(city) {
			getCityCenterFromId(city, function(resolved) { finish(resolved, codeWords); });
		}, function() { finish(null, codeWords); }, codeWords);
		return;
	}
	if(decodeCityIssue) {
		popLoader();
		showDecodeReferenceRequired(decodeCityIssue);
		return;
	}
	if(decodeCityLookup) {
		popLoader();
		var inputId = document.body.classList.contains('decode') ? 'decode_input' : 'pac-input';
		var input = document.getElementById(inputId);
		var submittedValue = input && input.value;
		decodeCityLookup.onResolved = function(city) {
			if((selectionVersion == null || selectionVersion === mapSelectionVersion) && (!input || input.value === submittedValue))
				decode_(city, codeWords, precisionWords);
		};
		return;
	}
	if(getWoloAnchorBegin(selected_decode_city)) {
		finish(selected_decode_city, codeWords);
		return;
	}
	if(typeof current_city_gp_id !== 'undefined' && current_city_gp_id != null) {
		getCityFromCityGp_idThenDecode(current_city_gp_id, codeWords, finish);
		return;
	}
	if(geoIp_city_name) {
		decodeWithIpCity(codeWords, selectionVersion, precisionWords);
		return;
	}
	finish(null, codeWords);
}

function showDecodeReferenceRequired(message) {
	if(document.body.classList.contains('decode'))
		setDecodeCityIssue(message || 'A city or region is needed to decode these words.');
	else
		showNotification('Enter the full Wolo Code or choose the reference used in the code');
}

function decode_continue(city, wcode, precisionWords) {
	popLoader();
	if(city != null)
		decode_(city, wcode, precisionWords);
	else {
		showInvalidCodeDialog((wcode && wcode.length) ? wcode.join(' ') : '');
	}
}

function decodeWithIpCity(words, selectionVersion, precisionWords) {
	var lookup = decodeCityLookup;
	getDecodeIpCity(geoIp_city_name, function(city, missing) {
		popLoader();
		if((selectionVersion != null && selectionVersion !== mapSelectionVersion) || lookup !== decodeCityLookup)
			return;
		if(city)
			decode_(city, words, precisionWords);
		else
			showDecodeReferenceRequired(detectedCityIssue(geoIp_city_name, missing));
	});
}
