var CityList;
// var city_styled_wordlist;
// var city_plus_wordList;
var pendingPosition;
var pendingWords;
var wordList;

// const PURE_WCODE_CITY_PICKED;
// const PURE_WCODE_CITY_FAILED;

function encode(position) {
	clearWcode();
	if(CityList != null) {
		getCityFromPositionThenEncode(position);
	}
	else
		pendingPosition = position;
}

function encode_continue(city, position) {
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
		if(CityList != null) {

			if(city_words_length > 0) {
				var ipCityName = words.slice(0, city_words_length).join(' ');
				var cityId = getCityIdFromName(ipCityName);
				if(cityId == null)
					decode_continue(null, words.slice(city_words_length, words.length));
				else
					refCityCenter.child(cityId).once('value', function(snapshot) {
						var location = snapshot.val().l;
						decode_continue({name:CityList[cityId].name, center:{ lat: location[0], lng: location[1]} }, words.slice(city_words_length, words.length));
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
			pendingWords = words;
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
