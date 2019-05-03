var pendingPosition;
var pendingWords;
var wordList;

// const PURE_WCODE_CITY_PICKED;
// const PURE_WCODE_CITY_FAILED;

function encode(position) {
	clearCode();
	getCityFromPositionThenEncode(position);
}

function encode_continue(city, position) {
	if(city == null) {
		if(!pendingCity) {
			pendingPosition = position;
			var city_gp_id = getCityGpId(address_results);
			if(city_gp_id != null)
				addCity(city_gp_id, function(city_id) {
					getCityFromId(city_id, function(city) {
						getCityCenterFromId(city, function(city) {
							encode_(city, position);
						});
					});
				});
		}
	}
	else {
		if(pendingCity) {
			hideNoCityMessage();
			infoWindow_setContent(MESSAGE_LOADING);
			pendingCity = false;
		}
		encode_(city, position);
	}
}

function getCityGpId(address_components) {
	var found_city_i;
	for(var i = address_components.length-1; i >= 0; i--) {
		if ( address_components[i].types.includes('administrative_area_level_1') || address_components[i].types.includes('administrative_area_level_2') ) {
			found_city_i = i;
		} else if(address_components[i].types.includes('locality')) {
			found_city_i = i;
			break;
		} else if ( found_city_i == null && (address_components[i].types.includes('sublocality') || address_components[i].types.includes('sublocality_level_1')) ) {
			found_city_i = i;
			break;
		}
	}

	if(found_city_i != null)
		return address_components[found_city_i].place_id;
	else {
		noCity(latLng_p);
		return null;
	}
}

function decode(words) {
	var city_words_length = words.length-3;

	var valid = true;

	if(words.length >= 3) {
		for (var i = 0; i < 3; i++) {
			if (wordList.includes(words[city_words_length+i]) != true) {
				valid = false;
				break;
			}
		}
	}

	if(valid) {

			if(city_words_length > 0) {
				var ipCityName = words.slice(0, city_words_length).join(' ');
				getCityFromName(ipCityName, function(city) {
					if(city == null)
						decode_continue(null, words.slice(city_words_length, words.length));
					else
						getCityCenterFromId(city, function(city) { decode_continue(city, words.slice(city_words_length, words.length)); });
				});
			}
			else if (words.length == 3) {
				var position;
				if(myLocDot == null) {
					if(marker != null && marker.position != null) {
						position = marker.position;
						focus_(position);
						showNotification(PURE_WCODE_CITY_PICKED);
					}
					else
						showNotification(PURE_WCODE_CITY_FAILED);
					return;
				}
				else {
					position = myLocDot.position;
				}

				if(position != null)
					getCityFromPositionThenDecode(resolveLatLng(position), words);
			}

	}
	else
		showNotification(INCORRECT_WCODE);
}

function decode_continue(city, wcode) {
	if(city != null)
		decode_(city, wcode);
	else
		showNotification(INCORRECT_WCODE);
}
