// var pendingPosition;
// var pendingWords;
// var wordList;
// var current_city_gp_id;
// var is_current_city;
// const PURE_WCODE_CITY_PICKED;
// const PURE_WCODE_CITY_FAILED;
// var encode_session_id

function encode(position, locating_encode) {
	var session_id;
	session_id = encode_session_id = Date.now();
	clearCode();
	getAddress(position, session_id, function(address_components) {
	
			var city_gp_id = getCityGpId(address_components);
			if(city_gp_id != null) {
				
				getCityFromCityGp_id( city_gp_id, session_id, function(city) {
					if(typeof locating_encode != 'undefined' && locating_encode == true) {
						current_city_gp_id = city_gp_id;
						setCurrentCity_status(true);
					}
					else if(current_city_gp_id == city_gp_id)
						setCurrentCity_status(true);
					else
						setCurrentCity_status(false);
					getCityCenterFromId_session(city, session_id, function(city) {
						if(city != null)
							encode_continue(city, position);
						else
							encode_continue(null, position);
					});
				}, function() {
				encode_continue(null, position)
				} );
				
				getCity_by_perifery_list(position, session_id, false);
				
			}
			else {
				getCity_by_perifery_list(position, session_id, true);
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
	encode_session_id = Date.now
	var session_id = encode_session_id;
	if(city == null) {
		if(!pendingCity) {
			pendingPosition = position;
			getAddress(position, session_id, function(address_components) {
				 var city_gp_id = getCityGpId(address_components);
				 if(city_gp_id != null)
					 sessionForwarder(session_id, function() {
						 addCity(city_gp_id, function(city_id) {
							 sessionForwarder(session_id, function() {
								 getCityFromId(city_id, function(city) {
									 sessionForwarder(session_id, function() {
										 getCityCenterFromId(city, function(city) {
											 sessionForwarder(session_id, function() {
												 encode_(city, position, session_id);
											 });
										 });
									 });
								 });
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
		encode_(city, position, session_id);
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
	pushLoader();
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
				getCityFromName(ipGroup, ipCity, function(city) {
					if(city == null)
						decode_continue(null, words.slice(city_words_length, words.length));
					else
						getCityCenterFromId(city, function(city) { decode_continue(city, words.slice(city_words_length, words.length)); });
				});
			}
			else if (words.length == 3) {
				
				if(typeof(current_city_gp_id) != 'undefined' && current_city_gp_id != null)
					getCityFromCityGp_idThenDecode(current_city_gp_id, words);
				else {
					
					if(!locationAccessCheck()) {
						if(geoIp_city_name && geoIp_city_name != '')
							decodeWithIpCity(words);
					}
					else {
						
						var position;
						if(myLocDot == null) {
							if(marker != null && marker.position != null) {
								position = marker.position;
								focus___(position);
								showNotification(PURE_WCODE_CITY_PICKED);
							}
							else {
								initLocate(false, function() {
									getCoarseLocation(function(position) {
										getCityFromPositionViaGMap(position, function(city) {
											getCityCenterFromId(city, function() {
												decode_continue(city, words);
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
							getCityFromPositionThenDecode(resolveLatLng(position), words);
						else {
							if(!geoIp_city_name && geoIp_city_name != '')
								decodeWithIpCity(words);
							else
								showNotification(PURE_WCODE_CITY_FAILED);
						}
							
					}
					
				}
				
			}

	}
	else
		showNotification(INCORRECT_WCODE);
}

function decode_continue(city, wcode) {
	popLoader();
	if(city != null)
		decode_(city, wcode);
	else
		showNotification(INCORRECT_CITY);
}

function decodeWithIpCity(words) {
	if(geoIp_city_name) {
		popLoader();
		if(geoIP_city)
			decode_(geoIP_city, words);
		else
			decode([geoIp_city_name.toLowerCase()].concat(words));
		showNotification(IP_CITY_DECODE);
	}
	else
		pendingWords_geo = words;
}
