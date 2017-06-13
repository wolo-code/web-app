/*
	Map code from Google Maps Javascript library documentaion under Apache 2.0 license
*/

var map;
var marker;
var infoWindow;
var accuCircle;
var myLocDot;

function initMap() {

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

	infoWindow = new google.maps.InfoWindow({map: map});
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
			encode(places[0].geometry.location);
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
		encode(event.latLng);
		focus_(event.latLng);
  });

	location_button.addEventListener('click', function() {
		locate();
	});

	decode_button.addEventListener('click', function() {
		clearMap();
		result.setInnerText = '';
		var valid = false;

		var code = document.getElementById('pac-input').value.replace(/(\\|\/)/gm, '').trim().toLowerCase();
		if(code.length > 0) {
			var splitChar;
			if(code.indexOf(' ') != -1)
				splitChar = ' ';
			else {
				splitChar = '.';
			}
			var words = code.split(splitChar);
				if(words.length == 4) {
					if(words[0] == 'bangalore') {
						for (i = 1; i < words.length; i++) {
							if (wordList.includes(words[i]) == true) {
								valid = true;
							}
							else {
								valid = false;
								break;
							}
						}
					}
				}
		}

		if(valid) {
			decode(words);
		}
		else {
			alert('Incorrect input. Should be 4 words beginning with Bangalore which is followed by 3 WCodes. E.g: "Bangalore cat apple tomato"');
		}
	});

	var clickHandler = new ClickEventHandler(map);

	document.getElementById('pac-input').addEventListener('input', suggestComplete);
}

var city_list = ['Bangalore'];

function suggestComplete(event) {
	var input = document.getElementById('pac-input').value;
	if(!input.includes(' ')) {
		changeInput(city_list, input);
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
			if(word.startsWith(input))
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
	infoWindow.setContent('Loading');
	encode(marker.position);
}

function focus__(pos, code) {
	focus_(pos);
	setInfoWindowText(code, pos);
}

var ClickEventHandler = function(map) {
	this.map = map;

	// Listen for clicks on the map.
	this.map.addListener('click', this.handleClick.bind(this));
};

ClickEventHandler.prototype.handleClick = function(event) {
	focus_(event.latLng);
	encode(event.latLng);
	// If the event has a placeId, use it.
	if (event.placeId) {
		// Calling e.stop() on the event prevents the default info window from
		// showing.
		// If you call stop here when there is no placeId you will prevent some
		// other map click event handlers from receiving the event.
		event.stop();
	}
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

	if(typeof bounds !== 'undefined')
		map.fitBounds(bounds);
	else if (typeof accuCircle !== 'undefined')
		//map.setZoom(15);
		accuCircle.setOptions({'fillOpacity': 0.10});

	infoWindow.setContent('(loading..)');
	infoWindow.open(map, marker);

}

function locate() {
	// Try HTML5 geolocation.
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
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
			}
			else {
				initWCode = false;
				map.setZoom(12);
			}
		}, function() {
			handleLocationError(true, infoWindow, map.getCenter());
		});
	} else {
		// Browser doesn't support Geolocation
		handleLocationError(false, infoWindow, map.getCenter());
	}
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	infoWindow.setPosition(pos);
	infoWindow.setContent(browserHasGeolocation ?
												'Error: The Geolocation service failed.' :
												'Error: Your browser doesn\'t support geolocation.');
	focusDefault();
}

function setInfoWindowText(code, latLng) {
	infoWindow.setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + code[0] + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code.slice(1, code.length).join(' ') + "</span> <span class='slash'>/</span></div></div><div class='center'><img id='copy_button' class='control' onclick='copyWCode();' src='/resource/copy.svg' ><img id='copy_link_button' class='control' onclick='copyLink();' src='/resource/link.svg' ><a href='"+ getIntentURL(latLng) + "'><img id='copy_button' class='control' onclick='' src='/resource/map.svg' ></a></div>")
}

function getIntentURL(latLng) {
	if((navigator.userAgent.match(/android/i)))
		return "geo:"+latLng.lat+","+latLng.lng;
	else
		//return "https://maps.google.com?q=Point@"+latLng.lat+","+latLng.lng;
		return "https://www.google.com/maps/place/"+latLngToDms(latLng)+"/@"+latLng.lat+","+latLng.lng+",12z";
		//return "http://maps.google.com/maps?&z=10&q="+latLng.lat+"+"+latLng.lng+"&ll="+latLng.lat+"+"+latLng.lng;
}

function focusDefault() {
	alert("This is a POC demo. For now, please select a place in Bangalore India.");
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

function latLngToDms(latLng) {
	var lat_dir, lng_dir;
	if(latLng.lat > 90)
		lat_dir = 'S';
	else
		lat_dir = 'N';
	if(latLng.lng > 90)
		lng_dir = 'W';
	else
		lng_dir = 'E';
	return deg_to_dms(latLng.lat)+lat_dir+"+"+deg_to_dms(latLng.lng)+lng_dir+"+"+"label";
}

function deg_to_dms (deg) {
	var d = Math.floor (deg);
	var minfloat = (deg-d)*60;
	var m = Math.floor(minfloat);
	var secfloat = (minfloat-m)*60;
	var s = Math.round(secfloat);
	// After rounding, the seconds might become 60. These two
	// if-tests are not necessary if no rounding is done.
	if (s==60) {
		m++;
		s=0;
	}
	if (m==60) {
		d++;
		m=0;
	}
	return ("" + d + '°' + m + '&#39;' + s + '&#34;');
}
