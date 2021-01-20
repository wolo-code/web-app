var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var poiPlace;

// const INCORRECT_WCODE;
// const MESSAGE_LOADING;
// const LOCATION_PERMISSION_DENIED;

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

		cleanUp();
		markers.forEach(function(marker) {
			marker.setMap(null);
		});
		markers = [];

		var bounds = new google.maps.LatLngBounds();
		if(places.length == 1) {
			clearAddress();
			var pos = resolveLatLng(places[0].geometry.location);
			focus___(pos);
			encode(pos);
			clearAddress();
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
					bounds.union(place.geometry.viewport);
				} else {
					bounds.extend(place.geometry.location);
				}
			});
			map.fitBounds(bounds);
		}
	});

	map.addListener('click', function(event) {
		cleanUp(true);
		infoWindow_setContent(MESSAGE_LOADING);
		var pos = resolveLatLng(event.latLng);
		encode(pos);
		focus___(pos);
	});

	decode_button.addEventListener('click', function() {
		cleanUp();
		document.getElementById('accuracy_container').classList.add('hide');
		var code = document.getElementById('pac-input').value;
		execDecode(code);
	});

	map_type_button.addEventListener('click', function() {
		toggleMapType();
	});

	location_button.addEventListener('mousedown', processPositionButtonDown);
	location_button.addEventListener('touchstart', processPositionButtonTouchStart);

	document.getElementById('pac-input').addEventListener('input', suggestWrapper);
	clickHandler = new ClickEventHandler(map);

	if(init_map_mode == 'satellite')
		toggleMapType();

	postMap();

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

var lastMarker;
function load(marker) {
	focus___(marker.position);
	window.marker.title = marker.title;
	infoWindow.open(map, window.marker);
	marker.setVisible(false);
	lastMarker = marker;
	infoWindow_setContent(MESSAGE_LOADING);
	encode(resolveLatLng(marker.position));
}

function getPanByOffset() {
	if(window.innerHeight < 1000)
		return -118;
	else
		return 0;
}

function getIntentURL(latLng, code_string) {
	if(navigator.userAgent.match(/android/i))
		return 'geo:0,0?q='+latLng.lat+','+latLng.lng+'(\\ '+code_string+' /)';
	else if(navigator.userAgent.match(/(iPad|iPhone|iPod)/i))
		return 'https://maps.apple.com/?ll='+latLng.lat+','+latLng.lng+'&q='+'\\ '+code_string+' /';
	else
		return 'https://maps.google.com/maps?q=loc:'+latLng.lat+','+latLng.lng+'&t=h';
}

function clearMap() {
	if(marker)
		marker.setMap(null);
}

function cleanUp(full = false) {
	document.getElementById('suggestion_result').innerText = '';
	clearNotificationTimer();
	clearTimeout(presstimer);
	clearTimeout(watch_location_timer);
	clearLocating(full);
	clearMap();
	navigator.geolocation.clearWatch(watch_location_id);
	pendingPosition = null;
	pendingCity = null;
	notification_top.classList.add('hide');
	if(infoWindow) {
		infoWindow.close();
		infoWindow.setContent('');
	}
	clearAddress();
	hideAddress();
	clearURL();
	document.getElementById('proceed_container').classList.add('hide');
	firstFocus = true;
	selfBoundsChangedCount = 1;
	current_title = null;
	current_segment = null;
	current_address = null;
}

function toggleMapType() {
	if(map.getMapTypeId() == google.maps.MapTypeId.SATELLITE.toLowerCase()) {
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
		map_type_button.value = 'Map';
		document.body.classList.remove('satellite');
	}
	else {
		map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
		map_type_button.value = 'Sattelite';
		document.body.classList.add('satellite');
	}
}
