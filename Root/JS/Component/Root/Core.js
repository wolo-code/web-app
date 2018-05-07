var CityList = [];
var city_styled_wordlist = [];
var city_plus_wordList = [];
var pendingPosition;
var pendingWords;

const PURE_WCODE_CITY_PICKED = "Since your city is not set - city was chosen from the last location";
const PURE_WCODE_CITY_FAILED = "Since your city is not set - you must first choose the city or preceed the WCode with city name";

function getCityFromPosition(latLng) {
	var nearCity;
	CityList.forEach (function(city) {
		var dLat = Math.abs(city.center.lat - latLng.lat);
		var dLng = Math.abs(city.center.lng - latLng.lng);
		if(dLat < 0.25) {
			if(dLng < 0.25) {
				var dSquare = dLat * dLat + dLng * dLng;
				if(nearCity == null || nearCity.dLng > dLng)
					nearCity = {'city':city, 'dLng':dLng};
			}
		}
	} );
	
	if(nearCity == null)
		return null;
	else
		return nearCity.city;
}

function getCityFromName(cityName) {
	var city;
	for(var i = 0; i < CityList.length; i++) {
		if(CityList[i].name.toLowerCase().localeCompare(cityName) == 0)
			return CityList[i];
	}
	return null;
}

function encode(position) {
	clearWcode();
	if(CityList.length > 0) {
		var city = getCityFromPosition(position);
		if(city == null) {
			if(!pendingCity) {
				pendingPosition = position;
				noCity(position);
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
			var position;
			if(myLocDot == null) {
				if(marker != null && marker.position != null) {
					position = marker.position;
					focus(position);
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
				city = getCityFromPosition(resolveLatLng(position));
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
			decode_(city, words.slice(city_words_length, words.length));
		}
		else {
			showNotification(INCORRECT_WCODE);
		}			
	}
	else
		pendingWords = words;
}
