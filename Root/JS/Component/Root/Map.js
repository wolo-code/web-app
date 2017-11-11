/*
	Map code from Google Maps Javascript library documentaion under Apache 2.0 license
*/

var map;
var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var city_plus_wordList = [];
var poiPlace;
var pendingLocate = false;
var pendingCitySubmit = false;

function initMap() {
	for(var i = 0; i < CityList.length; i++) {
		city_plus_wordList.push(CityList[i].name);
	}
	city_plus_wordList = city_plus_wordList.concat(wordList);

	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: -34.397, lng: 150.644},
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.BOTTOM_CENTER
		},
		zoom: 8,
		fullscreenControl: false
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
			focus_(places[0].geometry.location);
			encode(resolveLatLng(places[0].geometry.location));
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
		clearAddress();
		focus_(event.latLng);
		encode(resolveLatLng(event.latLng));
	});

	location_button.addEventListener('click', function() {
		locate();
	});

	decode_button.addEventListener('click', function() {
		clearMap();
		result.setInnerText = '';
		var code = document.getElementById('pac-input').value.replace(/(\\|\/)/gm, '').trim().toLowerCase();
		execDecode(code);
	});

	document.getElementById('pac-input').addEventListener('input', suggestComplete);
	var clickHandler = new ClickEventHandler(map);
}

function resolveLatLng(latLng) {
	return {'lat':latLng.lat(), 'lng':latLng.lng()};
}

function execDecode(code) {

	var valid = true;
	if(code.length > 0) {
		var splitChar;
		if(code.indexOf(' ') != -1)
			splitChar = ' ';
		else {
			splitChar = '.';
		}
		var words = code.split(splitChar);
		var city;
		if(words.length < 3)
			valid = false;
		else {

			if(words.length > 3) {
				var ipCityName = words.splice(0, words.length-3).join(' ');
				city = getCityFromName(ipCityName);
			}
			else {
				city = getCityFromPosition(resolveLatLng(myLocDot.position));
			}

			if(city == null) {
				valid = false;
			}
			else {
				for (var i = 0; i < 3; i++) {
					if (wordList.includes(words[i]) != true) {
						valid = false;
						break;
					}
				}
			}

		}
	}

	if(valid) {
		decode_(city, words);
	}
	else {
		alert('Incorrect input! Should be at least 3 WCode words, optionally preceded by a city. E.g: "Bangalore cat apple tomato"');
	}

}

function suggestComplete(event) {
	var input = document.getElementById('pac-input').value;
	if(!input.includes(' ')) {
		changeInput(city_plus_wordList, input);
	}
	else {
		var cur_word = input.split(' ');
		if(cur_word.length > 0 && cur_word[cur_word.length-1] != '')
			changeInput(wordList, cur_word[cur_word.length-1]);
		else {
			result.innerText = '';
		}
	}
};

function matchWord(list, input) {
	var reg = new RegExp(input.split('').join('\\w*').replace(/\W/, ''), 'i');
	return list.filter(function(word) {
		if (word.match(reg)) {
			if(word.toLowerCase().startsWith(input.toLowerCase()))
				return word;
		}
	});
}

function changeInput(list, val) {
	var autoCompleteResult = matchWord(list, val);
	result.innerText = '';
	if(autoCompleteResult.length == 1 && val == autoCompleteResult[0])
		return;
	if(autoCompleteResult.length < 5 || val.length > 2)
		for(var i = 0; i < autoCompleteResult.length && i < 10; i++) {
			var option = document.createElement('div');
			option.innerText = autoCompleteResult[i];
			option.addEventListener('click', chooseWord);
			result.appendChild(option);
		}
}

function chooseWord(event) {
	var cur_word = document.getElementById('pac-input').value.split(' ');
	cur_word[cur_word.length-1] = this.innerText;
	document.getElementById('pac-input').value = cur_word.join(' ') + ' ';
	document.getElementById('pac-input').focus();
	result.innerText = '';
}

var lastMarker;
function load(marker) {
	focus_(marker.position);
	window.marker.title = marker.title;
	infoWindow.open(map, window.marker);
	marker.setVisible(false);
	lastMarker = marker;
	infoWindow_setContent('Loading ..');
	encode(marker.position);
}

function focus__(pos, code) {
	focus_(pos);
	setInfoWindowText(code, pos);
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
	map.setCenter(pos);
	if(typeof marker === 'undefined') {
		marker = new google.maps.Marker({
			position: pos,
			map: map,
			title: 'Hello World!'
		});
		marker.addListener('click', function() {
			infoWindow.open(map, marker);
		})
	}
	else {
		marker.setPosition(pos);
	}

	if(marker.getMap() == null)
		marker.setMap(map);

	if(typeof bounds !== 'undefined') {
		map.fitBounds(bounds, 26);
		var offsetY = 0.06;
		if(map.getBounds() != null) {
			var span = map.getBounds().toSpan(); // a latLng - # of deg map span
			var newCenter = {
				lat: pos.lat + span.lat()*offsetY,
				lng: pos.lng
			};

			map.panTo(newCenter);
		}
	}
	else if (typeof accuCircle !== 'undefined')
		//map.setZoom(15);
		accuCircle.setOptions({'fillOpacity': 0.10});

	infoWindow_setContent('Loading ..');
	infoWindow.open(map, marker);
}

function locate() {
	// Try HTML5 geolocation.
	if(!locationAccess) {
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
			locationAccess = true;
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
			if(error.code = error.PERMISSION_DENIED)
				showNotification("Location permission was denied. Click to point");
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
	//focusDefault();
}

function setInfoWindowText(code, latLng) {
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + code[0] + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code.slice(1, code.length).join(' ') + "</span> <span class='slash'>/</span></div></div><div class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src='/resource/address.svg' ><img id='copy_code_button' class='control' onclick='copyWCode();' src='/resource/copy.svg' ><img id='copy_link_button' class='control' onclick='copyLink();' src='/resource/link.svg' ><a href='"+ getIntentURL(latLng, code) + "'><img id='external_map_button' class='control' onclick='' src='/resource/map.svg' ></a></div>")
}

function getIntentURL(latLng, code) {
	if((navigator.userAgent.match(/android/i)))
		return "geo:0,0?q="+latLng.lat+','+latLng.lng+"(\\ "+code.join(' ')+" /)";
	else
		return "https://maps.google.com/maps?q=loc:"+latLng.lat+','+latLng.lng;
}

function focusDefault() {
	setTimeout(function() { alert("This location appears to not be in the database. Please submit a request to add at support@wcodes.org") }, 100);
	setTimeout(function() { focusDefault_(); }, 1000);
}

function focusDefault_() {
	var position = {'lat':12.978328666666666,'lng':77.59628655555555};
	focus_(position);
	setInfoWindowText(['Bangalore', 'hand', 'cat', 'bone'], position);
	map.setZoom(12);
}

function clearMap() {
	marker.setMap(null);
}

function infoWindow_setContent(string) {
	if(typeof infoWindow == "undefined")
		infoWindow = new google.maps.InfoWindow({map: map});
	infoWindow.setContent(string);
}
