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
		var city = getCityFromName(words[0]);
		decode_(city, words.splice(1, words.length-1))
	}
	else
		pendingWords = words;
}
