var CityList = [];
var city_plus_wordList = [];
var pendingPosition;
var pendingWords;

function getCityFromPosition(latLng) {
	var nearCityList = [];
	CityList.forEach (function(city) {
		var dLat = Math.abs(city.center.lat - latLng.lat);
		var dLng = Math.abs(city.center.lng - latLng.lng);
		if(dLat < 0.25) {
			if(dLng < 0.25) {
				var dSquare = dLat * dLat + dLng * dLng;
				if(nearCityList.length == 0) {
					nearCityList.push({'city':city, 'dLng':dLng});
				}
				else {
					for(i = 0; i < nearCityList.length; i++) {
						if(nearCityList[i].dLng > dLng) {
							nearCityList.splice(i, 0, {'city':city, 'dLng':dLng});
							break;
						}
					}
				}
			}
		}
	} );
	
	if(nearCityList.length == 0)
		return null;
	else
		return nearCityList[0].city;//address_string.replace(/(,| )/gm, '_');
}

function getCityFromName(cityName) {
	var city;
	for(var i = 0; i < CityList.length; i++) {
		if(CityList[i].name.toLowerCase().localeCompare(cityName) == 0)
			return CityList[i];
	}
}

function encode(position) {
	if(CityList.length > 0) {
		var city = getCityFromPosition(position);
		if(city == null) {
			pendingPosition = position;
			noCity(position);
		}
		else
			encode_(city, position);
	}
	else
		pendingPosition = position;
}

function decode(words) {
	if(CityList.length > 0) {
		var city;
		var valid = false;
		
		var city_words_length = words.length-3;
		if(words.length > 3) {
			var ipCityName = words.slice(0, city_words_length).join(' ');
			city = getCityFromName(ipCityName);
			valid = true;
		}
		else if (words.length == 3) {
			city = getCityFromPosition(resolveLatLng(myLocDot.position));
			if(city != null)
				valid = true;
		}

		if(valid) {
			for (var i = 0; i < 3; i++) {
				if (wordList.includes(words[city_words_length+i]) != true) {
					valid = false;
					break;
				}
			}
		}
		
		if(valid) {
			decode_(city, words.splice(city_words_length, words.length-city_words_length));
		}
		else {
			showNotification(INCORRECT_WCODE);
		}			
	}
	else
		pendingWords = words;
}
