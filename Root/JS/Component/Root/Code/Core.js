// var pendingPosition;
// var pendingWords;
// var wordList;
// var current_city_gp_id;
// var is_current_city;
// const PURE_WCODE_CITY_PICKED;
// const PURE_WCODE_CITY_FAILED;

function encode(position, locating_encode) {
	clearCode();
	getAddress(position, function(address_components) {
			var city_gp_id = getCityGpId(address_components);
			if(city_gp_id != null) {
				getCityFromCityGp_id( city_gp_id, function(city) {
					if(typeof locating_encode != 'undefined' && locating_encode == true) {
						current_city_gp_id = city_gp_id;
						setCurrentCity_status(true);
					}
					else if(current_city_gp_id == city_gp_id)
						setCurrentCity_status(true);
					else
						setCurrentCity_status(false);
					getCityCenterFromId(city, function(city) {
						if(city != null)
							encode_continue(city, position);
						else
							encode_continue(null, position);
					});
				}, function() {
				encode_continue(null, position)
				} );
				getCity_by_perifery_list(position, false);
			}
			else {
				getCity_by_perifery_list(position, true);
			}
		});
}

function setCurrentCity_status(status) {
	if(status) {
		document.getElementById('map').classList.remove('different_city');
		document.getElementById('map').classList.add('current_city');
	}
	else {
		document.getElementById('map').classList.remove('current_city');
		document.getElementById('map').classList.add('different_city');
	}
}

function encode_continue(city, position) {
	if(city == null) {
		if(!pendingCity) {
			pendingPosition = position;
			getAddress(position, function(address_components) {
				var city_gp_id = getCityGpId(address_components);
				if(city_gp_id != null)
					addCity(city_gp_id, function(city_id) {
						getCityFromId(city_id, function(city) {
							getCityCenterFromId(city, function(city) {
								encode_(city, position);
							});
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
		for(var i = 0; i < 3; i++) {
			if(typeof wordList != 'undefined' && wordList.includes(words[city_words_length+i]) != true) {
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
						focus___(position);
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
