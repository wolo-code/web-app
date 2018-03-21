/*
	Map code from Google Maps Javascript library documentaion under Apache 2.0 license
*/

var map;
var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var poiPlace;
var pendingLocate = false;
var pendingCitySubmit = false;
var infoWindow_open = false;
var DEFAULT_LATLNG = {lat: -34.397, lng: 150.644};

var INCORRECT_WCODE = 'INCORRECT INPUT! Should be at least 3 WCode words, optionally preceded by a city. E.g: "Bangalore cat apple tomato"';
var MESSAGE_LOADING = 'Loading ..';
var LOCATION_PERMISSION_DENIED = "Location permission was denied. Click to point or retry with the locate button";

function initMap() {

	map = new google.maps.Map(document.getElementById('map'), {
		center: DEFAULT_LATLNG,
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.BOTTOM_CENTER
		},
		zoom: 8,
		fullscreenControl: false,
		streetViewControl: false,
		zoomControl: false
	});

//	infoWindow = new google.maps.InfoWindow({map: map});
//	infoWindow.setContent("Waiting for location access right");
	locate();

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
		locate();
	});

	decode_button.addEventListener('click', function() {
		clearMap();
		suggestion_result.setInnerText = '';
		var code = document.getElementById('pac-input').value;
		execDecode(code);
	});

	document.getElementById('pac-input').addEventListener('input', suggestComplete);
	var clickHandler = new ClickEventHandler(map);
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
		if(curList != city_styled_wordlist && curList != wordList) {
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
				list = wordList;
				break;
			}
			else {
				list = matchWord(city_styled_wordlist, cityName);
				if(list && list.length > 0)
					break;
			}
		}
		for(; i < code.length; i++) {
			if(wordList.indexOf(code[i]) == -1)
				return null;
			else
				list = wordList;
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

function focus__(pos, code) {
	focus_(pos);
	setWcode(code, pos);
}

var ClickEventHandler = function(map) {
	this.map = map;
	this.placesService = new google.maps.places.PlacesService(map);

	this.map.addListener('click', this.handleClick.bind(this));
};

ClickEventHandler.prototype.handleClick = function(event) {
	if (event.placeId) {
		// Calling e.stop() on the event prevents the default info window from
		// showing.
		// If you call stop here when there is no placeId you will prevent some
		// other map click event handlers from receiving the event.
		event.stop();
		this.getPlaceInformation(event.placeId);
	}
	else {
		getAddress(resolveLatLng(event.latLng));
	}
};

ClickEventHandler.prototype.getPlaceInformation = function(placeId) {
	var me = this;
	this.placesService.getDetails({placeId: placeId}, function(place, status) {
		if (status === 'OK') {
			poiPlace = place;
			address = place.formatted_address;
			refreshAddress();
		}
	});
};

function focus_(pos, bounds) {
	
	hideNoCityMessage();

	if(typeof marker === 'undefined') {
		marker = new google.maps.Marker({
			position: pos,
			map: map,
			title: 'Hello World!'
		});
		marker.addListener('click', function() {
			if(infoWindow_open == false) {
				infoWindow.open(map, marker);
				infoWindow_open = true;
			}
			else {
				infoWindow.close();
				infoWindow_open = false;
			}
		})
	}
	else {
		marker.setPosition(pos);
	}

	if(marker.getMap() == null)
		marker.setMap(map);

	if(typeof bounds !== 'undefined') {
		map.fitBounds(bounds, 26);
	}
	else if (typeof accuCircle !== 'undefined') {
		accuCircle.setOptions({'fillOpacity': 0.10});
	}
	
	map.panTo(pos);
	map.panBy(0, getPanByOffset());
	infoWindow_setContent(MESSAGE_LOADING);
	infoWindow.open(map, marker);
	infoWindow_open = true;

}

function getPanByOffset() {
	if(window.innerHeight < 1000)
		return -118;
	else
		return 0;
}

function locate() {
	// Try HTML5 geolocation.
	if(!locationAccessCheck()) {
		pendingLocate = true;
		showLocateRightMessage();
	}
	else {
		pendingLocate = false;
		locateExec();
	}
}

function locateExec() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			setLocationAccess(true);
			var pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};
			if(typeof accuCircle === 'undefined') {
				accuCircle = new google.maps.Circle({
					strokeColor: '#69B7CF',
					strokeOpacity: 0,
					strokeWeight: 0,
					fillColor: '#69B7CF',
					fillOpacity: 0.35,
					map: map,
					center: pos,
					radius: position.coords.accuracy,
					clickable: false
				});
			}
			else {
				accuCircle.setOptions({'fillOpacity': 0.35});
				accuCircle.setCenter(pos);
				accuCircle.setRadius(position.coords.accuracy);
			}

			if(typeof myLocDot === 'undefined') {
				myLocDot = new google.maps.Marker({
					clickable: false,
					icon: new google.maps.MarkerImage('https://maps.gstatic.com/mapfiles/mobile/mobileimgs2.png',
							new google.maps.Size(22,22),
							new google.maps.Point(0,18),
							new google.maps.Point(11,11)),
					shadow: null,
					zIndex: 999,
					map: map,
					position: pos
				});
			}
			else {
				myLocDot.setPosition(pos);
			}
			if(initWCode == false) {
				focus_(pos, accuCircle.getBounds());
				encode(pos);
				getAddress(pos);
			}
			else {
				initWCode = false;
				map.setZoom(12);
			}
		}, function(error) {
			if(error.code = error.PERMISSION_DENIED) {
				showNotification(LOCATION_PERMISSION_DENIED);
				setLocationAccess(false);
			}
			else
				handleLocationError(true, infoWindow, map.getCenter());
		});
	} else {
		// Browser doesn't support Geolocation
		handleLocationError(false, infoWindow, map.getCenter());
	}
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	infoWindow_setContent(browserHasGeolocation ?
												'Error: The Geolocation service failed' :
												'Error: Your browser doesn\'t support geolocation');
	infoWindow.setPosition(pos);
	notification_top.classList.remove('hide');
}

function setInfoWindowText(code, latLng) {
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + code[0] + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code.slice(1, code.length).join(' ') + "</span> <span class='slash'>/</span></div></div><div id='infowindow_actions' class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src='/resource/address.svg' ><img id='copy_code_button' class='control' onclick='showCopyWcodeMessage();' src='/resource/copy.svg' ><img id='copy_link_button' class='control' onclick='copyWcodeLink();' src='/resource/link.svg' ><a href='"+ getIntentURL(latLng, code) + "'><img id='external_map_button' class='control' onclick='' src='/resource/map.svg' ></a></div>")
}

function getIntentURL(latLng, code) {
	if((navigator.userAgent.match(/android/i)))
		return 'geo:0,0?q='+latLng.lat+','+latLng.lng+'(\\ '+code.join(' ')+' /)';
	else
		return 'https://maps.google.com/maps?q=loc:'+latLng.lat+','+latLng.lng+'&t=h';
}

function clearMap() {
	marker.setMap(null);
}

function infoWindow_setContent(string) {
	if(typeof infoWindow == 'undefined')
		infoWindow = new google.maps.InfoWindow({'map': map});
	infoWindow.setContent(string);
}

function arrayContainsArray(superset, subset) {
	return subset.every(function (value) {
		return (superset.indexOf(value.toLowerCase()) >= 0);
	});
}

function clearURL() {
	if(window.location.pathname.substr(1) != '')
		window.history.pushState({"html":'',"pageTitle":''}, '', '/');
}
