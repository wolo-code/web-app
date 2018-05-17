var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var poiPlace;
var pendingCitySubmit = false;
var infoWindow_open = false;

var INCORRECT_WCODE = 'INCORRECT INPUT! Should be at least 3 WCode words, optionally preceded by a city. E.g: "Bangalore cat apple tomato"';
var MESSAGE_LOADING = 'Loading ..';
var LOCATION_PERMISSION_DENIED = "Location permission was denied. Click to point or retry with the locate button";

function initMap() {

	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	// Bias the SearchBox results towards current map's viewport.
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});

	var markers = [];
	// Listen for the event fired when the user selects a prediction and retrieve
	// more details for that place.
	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();

		if (places.length == 0) {
			return;
		}

		clearMap();
		// Clear out the old markers.
		markers.forEach(function(marker) {
			marker.setMap(null);
		});
		markers = [];

		// For each place, get the icon, name and location.
		var bounds = new google.maps.LatLngBounds();
		if(places.length == 1) {
			clearAddress();
			var pos = resolveLatLng(places[0].geometry.location);
			focus_(pos);
			encode(pos);
			getAddress(pos);
		}
		else {
			places.forEach(function(place) {
				if (!place.geometry) {
					console.log("Returned place contains no geometry");
					return;
				}
				var icon = {
					url: place.icon,
					size: new google.maps.Size(71, 71),
					origin: new google.maps.Point(0, 0),
					anchor: new google.maps.Point(17, 34),
					scaledSize: new google.maps.Size(25, 25)
				};

				// Create a marker for each place.
				var resultMarker = new google.maps.Marker({
					map: map,
					icon: icon,
					title: place.name,
					position: place.geometry.location
				});
				resultMarker.addListener('click', function() {
					load(this);
				});
				markers.push(resultMarker);

				if (place.geometry.viewport) {
					// Only geocodes have viewport.
					bounds.union(place.geometry.viewport);
				} else {
					bounds.extend(place.geometry.location);
				}
			});
			map.fitBounds(bounds);
		}
	});

	map.addListener('click', function(event) {
		pendingPosition = null;
		notification_top.classList.add('hide');
		clearAddress();
		clearURL();
		var pos = resolveLatLng(event.latLng);
		focus_(pos);
		encode(pos);
	});

	location_button.addEventListener('click', function() {
		syncLocate(true);
	});

	decode_button.addEventListener('click', function() {
		clearMap();
		suggestion_result.setInnerText = '';
		var code = document.getElementById('pac-input').value;
		execDecode(code);
	});

	document.getElementById('pac-input').addEventListener('input', suggestComplete);
	clickHandler = new ClickEventHandler(map);
	
	if(pendingLocate)
		syncLocate();
}

function resolveLatLng(latLng) {
	return {'lat':latLng.lat(), 'lng':latLng.lng()};
}

function execDecode(code) {

	code = code.replace(/(\\|\/)/gm, '').trim().toLowerCase();
	var valid = true;
	if(code.length > 0) {
		var splitChar;
		if(code.indexOf(' ') != -1)
			splitChar = ' ';
		else {
			splitChar = '.';
		}
		var words = code.split(splitChar);
		if(words.length < 3)
			valid = false;
		else
			decode(words);
	}

	if(!valid)
		showNotification(INCORRECT_WCODE);

}

function suggestComplete(event) {
	var input_array = document.getElementById('pac-input').value.toLowerCase().split(' ');
	var curList;
	if(input_array.length > 0) {
		curList = getPossibleList(input_array.slice(0, -1));
	}
	if(curList !=  null) {
		var curWord = input_array[input_array.length-1];
		if(curList != city_styled_wordlist && curList != wordList.curList) {
			var compareWord = input_array.slice(0, -1).join(' ')+' ';
			var newList = [];
			var regEx = new RegExp(compareWord, 'ig');
			curList.forEach(function(city_name) {
				if(city_name.toLowerCase().startsWith(compareWord))
					newList.push(city_name.replace(regEx, ''));
			});
			curList = newList;
		}
		changeInput(curList, curWord);
	}
	else
		suggestion_result.innerText = '';
};

function getPossibleList(code) {
	var list;
	
	if(code.length == 0)
		list = city_styled_wordlist;
	else {
		var i;
		for(i = code.length; i > 0; i--) {
			var cityName = code.slice(0, i).join(' ');
			if(getCityFromName(cityName)) {
				list = wordList.curList;
				break;
			}
			else {
				list = matchWord(city_styled_wordlist, cityName);
				if(list && list.length > 0)
					break;
			}
		}
		for(; i < code.length; i++) {
			if(!wordList.indexOf(code[i]))
				return null;
			else
				list = wordList.curList;
		}
	}
	return list;
}

function matchWord(list, input) {
	var regEx = new RegExp(input.split('').join('\\w*').replace(/\W/, ''), 'i');
	return list.filter(function(word) {
		if (word.match(regEx)) {
			if(word.toLowerCase().startsWith(input))
				return word;
		}
	});
}

function changeInput(list, val) {
	var autoCompleteResult = matchWord(list, val);
	suggestion_result.innerText = '';
	if(autoCompleteResult.length == 1 && val == autoCompleteResult[0].toLowerCase())
		return;
	if(autoCompleteResult.length < 5 || val.length > 2)
		for(var i = 0; i < autoCompleteResult.length && i < 10; i++) {
			var option = document.createElement('div');
			option.innerText = autoCompleteResult[i];
			option.addEventListener('click', chooseWord);
			suggestion_result.appendChild(option);
		}
}

function chooseWord(event) {
	var cur_word = document.getElementById('pac-input').value.split(' ');
	cur_word[cur_word.length-1] = this.innerText;
	document.getElementById('pac-input').value = cur_word.join(' ') + ' ';
	document.getElementById('pac-input').focus();
	suggestion_result.innerText = '';
}

var lastMarker;
function load(marker) {
	focus_(marker.position);
	window.marker.title = marker.title;
	infoWindow.open(map, window.marker);
	infoWindow_open = true;
	marker.setVisible(false);
	lastMarker = marker;
	infoWindow_setContent(MESSAGE_LOADING);
	encode(marker.position);
}

function getPanByOffset() {
	if(window.innerHeight < 1000)
		return -118;
	else
		return 0;
}

function getIntentURL(latLng, code) {
	if((navigator.userAgent.match(/android/i)))
		return 'geo:0,0?q='+latLng.lat+','+latLng.lng+'(\\ '+code.join(' ')+' /)';
	else
		return 'https://maps.google.com/maps?q=loc:'+latLng.lat+','+latLng.lng+'&t=h';
}

function clearMap() {
	if(marker != null)
		marker.setMap(null);
}
