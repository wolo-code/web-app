var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var poiPlace;
var APP_MODE_BACKGROUND = {
	wcode: '#efefef',
	map: '#60d0e5',
	satellite: '#1b2f62'
};
var APP_MODE_BACKGROUND_DARK = {
	wcode: '#1a1a2e',
	map: '#0e3d4a',
	satellite: '#1b2f62'
};
var APP_MODE_BACKGROUND_DEFAULT = '#efefef';
var APP_MODE_BACKGROUND_DARK_DEFAULT = '#1a1a2e';
var GOOGLE_MAPS_DARK_STYLES = [
	{elementType: 'geometry', stylers: [{color: '#1d2c4d'}]},
	{elementType: 'labels.text.fill', stylers: [{color: '#8ec3b9'}]},
	{elementType: 'labels.text.stroke', stylers: [{color: '#1a3646'}]},
	{featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{color: '#4b6878'}]},
	{featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{color: '#64779e'}]},
	{featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{color: '#4b6878'}]},
	{featureType: 'landscape.man_made', elementType: 'geometry.stroke', stylers: [{color: '#334e87'}]},
	{featureType: 'landscape.natural', elementType: 'geometry', stylers: [{color: '#023e58'}]},
	{featureType: 'poi', elementType: 'geometry', stylers: [{color: '#283d6a'}]},
	{featureType: 'poi', elementType: 'labels.text.fill', stylers: [{color: '#6f9ba5'}]},
	{featureType: 'poi', elementType: 'labels.text.stroke', stylers: [{color: '#1d2c4d'}]},
	{featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{color: '#023e58'}]},
	{featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{color: '#3C7680'}]},
	{featureType: 'road', elementType: 'geometry', stylers: [{color: '#304a7d'}]},
	{featureType: 'road', elementType: 'labels.text.fill', stylers: [{color: '#98a5be'}]},
	{featureType: 'road', elementType: 'labels.text.stroke', stylers: [{color: '#1d2c4d'}]},
	{featureType: 'road.highway', elementType: 'geometry', stylers: [{color: '#2c6675'}]},
	{featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{color: '#255763'}]},
	{featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{color: '#b0d5ce'}]},
	{featureType: 'road.highway', elementType: 'labels.text.stroke', stylers: [{color: '#023e58'}]},
	{featureType: 'transit', elementType: 'labels.text.fill', stylers: [{color: '#98a5be'}]},
	{featureType: 'transit', elementType: 'labels.text.stroke', stylers: [{color: '#1d2c4d'}]},
	{featureType: 'transit.line', elementType: 'geometry.fill', stylers: [{color: '#283d6a'}]},
	{featureType: 'transit.station', elementType: 'geometry', stylers: [{color: '#3a4762'}]},
	{featureType: 'water', elementType: 'geometry', stylers: [{color: '#0e1626'}]},
	{featureType: 'water', elementType: 'labels.text.fill', stylers: [{color: '#4e6d70'}]}
];

// const INCORRECT_WCODE;
// const MESSAGE_LOADING;
// const LOCATION_PERMISSION_DENIED;

function getAppMode() {
	if(document.body.classList.contains('satellite'))
		return 'satellite';
	else if(document.body.classList.contains('map'))
		return 'map';
	else
		return 'wcode';
}

function getAppModeBackground(mode) {
	var backgrounds = document.documentElement.classList.contains('dark-mode') ? APP_MODE_BACKGROUND_DARK : APP_MODE_BACKGROUND;
	var fallback = document.documentElement.classList.contains('dark-mode') ? APP_MODE_BACKGROUND_DARK_DEFAULT : APP_MODE_BACKGROUND_DEFAULT;
	if(typeof backgrounds != 'object' || !backgrounds || !backgrounds[mode])
		return fallback || '#efefef';
	return backgrounds[mode];
}

function getGoogleMapStyles() {
	return document.documentElement.classList.contains('dark-mode') ? GOOGLE_MAPS_DARK_STYLES : [];
}

function syncAppModeBackground() {
	var mode = getAppMode();
	var background = getAppModeBackground(mode);
	var themeColor = document.querySelector('meta[name="theme-color"]');
	document.body.dataset.appMode = mode;
	if(themeColor)
		themeColor.setAttribute('content', background);
	document.documentElement.style.backgroundColor = background;
	document.body.style.backgroundColor = background;
	if(typeof map == 'object' && map) {
		var mapOptions = {backgroundColor: background};
		if(typeof getGoogleMapStyles == 'function')
			mapOptions.styles = getGoogleMapStyles();
		map.setOptions(mapOptions);
	}
}

function initMap() {

	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	// Bias the SearchBox results towards current map's viewport.
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});
	
	input.addEventListener("focus", function() {
		document.getElementById('search_icon').classList.add('hide');
	});

	input.addEventListener("change", function() {
		if(input.value == '')
			document.getElementById('search_icon').classList.remove('hide');
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

	addLongpressListener(document.getElementById('decode_button'), decode_input_from_map, decode_input_from_map_external);
	addLongpressListener(document.getElementById('decode_input_button'), decode_input_from_form_external, decode_input_from_form);

	map_type_button.addEventListener('click', function() {
		toggleMapViewType();
	});

	location_button.addEventListener('mousedown', processPositionButtonDown);
	location_button.addEventListener('touchstart', processPositionButtonTouchStart);

	document.getElementById('pac-input').addEventListener('input', suggestWrapper);
	document.getElementById('pac-input').addEventListener('keyup', enterHandler);
	document.getElementById('decode_input').addEventListener('input', suggestWrapper);
	document.getElementById('decode_input').addEventListener('keyup', enterHandler);
	
	clickHandler = new ClickEventHandler(map);

	if(init_map_mode == 'satellite')
		toggleMapType();
	else
		syncAppModeBackground();

	postMap();
	trackMapViewport();

}

function decode_input_from_map() {
	document.activeElement.blur();
	beginDecode(document.getElementById('pac-input').value);
}

function decode_input_from_map_external() {
	initWCode_jumpToMap = true;
	decode_input_from_map();
}

function decode_input_from_form() {
	if(!initWCode_jump_ask)
		toggleMapType();
	document.activeElement.blur();
	beginDecode(document.getElementById('decode_input').value);
}

function decode_input_from_form_external() {
	initWCode_jump_ask = true;
	decode_input_from_form();
}

function beginDecode(code) {
	cleanUp();
	document.getElementById('accuracy_container').classList.add('hide');
	execDecode(code);
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
	document.getElementById('map_input_suggestion_result').innerText = '';
	document.getElementById('decode_input_suggestion_result').innerText = '';
	clearNotificationTimer();
	listPressTimer.forEach(
			 function(presstimer) {clearTimeout(presstimer);}
		);
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

function activateMapType() {
	if(document.body.classList.contains('decode')) {
		document.body.classList.remove('decode');
		document.body.classList.add('map');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
	}
	syncAppModeBackground();
}

function activateSatelliteMapType() {
	document.body.classList.remove('decode');
	document.body.classList.remove('map');
	document.body.classList.add('satellite');
	map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
	syncAppModeBackground();
}

function toggleMapType() {
	// Mode = 'Map'
	if(document.body.classList.contains('decode')) {
		document.body.classList.remove('decode');
		document.body.classList.add('map');
	}
	// Mode = 'Decode'
	else if(map.getMapTypeId() == google.maps.MapTypeId.SATELLITE.toLowerCase()) {
		document.body.classList.remove('satellite');
		document.body.classList.add('decode');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
	}
	// Mode = 'Sattelite'
	else if(map.getMapTypeId() == google.maps.MapTypeId.ROADMAP.toLowerCase()) {
		map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
		document.body.classList.remove('map');
		document.body.classList.add('satellite');
	}
	syncAppModeBackground();
}

function toggleMapViewType() {
	if(document.body.classList.contains('decode')) {
		activateSatelliteMapType();
	}
	else if(map.getMapTypeId() == google.maps.MapTypeId.SATELLITE.toLowerCase()) {
		document.body.classList.remove('satellite');
		document.body.classList.add('map');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
	}
	else if(map.getMapTypeId() == google.maps.MapTypeId.ROADMAP.toLowerCase()) {
		document.body.classList.remove('map');
		document.body.classList.add('satellite');
		map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
	}
	syncAppModeBackground();
}

function toggleDecodeView() {
	if(document.body.classList.contains('decode')) {
		activateMapType();
	}
	else {
		document.body.classList.remove('map');
		document.body.classList.remove('satellite');
		document.body.classList.add('decode');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
	}
	syncAppModeBackground();
}
