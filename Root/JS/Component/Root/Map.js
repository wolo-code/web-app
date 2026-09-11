var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var poiPlace;
var APP_MODE_BACKGROUND = {
	wcode: '#efefef',
	map: '#60d0e5',
	satellite: '#1b2f62',
	osm: '#d8e8d8',
	apple: '#e8e4dc',
	esri: '#e4ecd8',
	microsoft: '#d8e0e8'
};
var APP_MODE_BACKGROUND_DARK = {
	wcode: '#1a1a2e',
	map: '#0e3d4a',
	satellite: '#1b2f62',
	osm: '#1a2a1a',
	apple: '#2a2620',
	esri: '#222a1a',
	microsoft: '#1a2430'
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
	else if(document.body.classList.contains('osm'))
		return 'osm';
	else if(document.body.classList.contains('apple'))
		return 'apple';
	else if(document.body.classList.contains('esri'))
		return 'esri';
	else if(document.body.classList.contains('microsoft'))
		return 'microsoft';
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
		if(mode === 'apple') {
			mapOptions.backgroundColor = 'transparent';
			mapOptions.styles = [];
		}
		else if(typeof getGoogleMapStyles == 'function')
			mapOptions.styles = getGoogleMapStyles();
		map.setOptions(mapOptions);
	}
	if(typeof syncAppleMapAppearance === 'function') {
		syncAppleMapAppearance();
	}
}

function initMap() {
	initOsmMapType();

	var input = document.getElementById('pac-input');
	var placesLib = typeof getGooglePlacesLibrary == 'function' ? getGooglePlacesLibrary() : null;
	var searchBox = (placesLib && placesLib.SearchBox && input) ? new placesLib.SearchBox(input) : null;
	if(input)
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	if(searchBox) {
		map.addListener('bounds_changed', function() {
			searchBox.setBounds(map.getBounds());
		});
	}
	
	input.addEventListener("focus", function() {
		document.getElementById('search_icon').classList.add('hide');
	});

	input.addEventListener("change", function() {
		if(input.value == '')
			document.getElementById('search_icon').classList.remove('hide');
		syncProceedButtons();
	});
	
	var markers = [];
	if(searchBox) {
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
	}

	map.addListener('click', function(event) {
		cleanUp(true);
		infoWindow_setContent(MESSAGE_LOADING);
		var pos = resolveLatLng(event.latLng);
		encode(pos);
		focus___(pos);
	});
	map.addListener('bounds_changed', function() {
		if(typeof scheduleAppleMapFollow === 'function') {
			scheduleAppleMapFollow();
		}
	});
	map.addListener('idle', function() {
		if(typeof syncAppleMapFromGoogle === 'function') {
			syncAppleMapFromGoogle();
		}
	});

	addLongpressListener(document.getElementById('decode_button'), decode_input_from_map, decode_input_from_map_external);
	addLongpressListener(document.getElementById('decode_input_button'), decode_input_from_form_external, decode_input_from_form);

	map_type_button.addEventListener('click', function() {
		toggleMapViewType();
	});

	location_button.addEventListener('mousedown', processPositionButtonDown);
	location_button.addEventListener('touchstart', processPositionButtonTouchStart);

	document.getElementById('pac-input').addEventListener('input', suggestWrapper);
	if(typeof syncProceedButtons == 'function') {
		document.getElementById('pac-input').addEventListener('input', syncProceedButtons);
	}
	document.getElementById('pac-input').addEventListener('keyup', enterHandler);
	document.getElementById('decode_input').addEventListener('input', suggestWrapper);
	if(typeof syncProceedButtons == 'function') {
		document.getElementById('decode_input').addEventListener('input', syncProceedButtons);
	}
	document.getElementById('decode_input').addEventListener('keyup', enterHandler);
	document.getElementById('decode_input').addEventListener('focus', showDecodeInputAltTip);
	document.getElementById('decode_input').addEventListener('blur', hideDecodeInputAltTip);
	if(typeof syncProceedButtons == 'function') {
		syncProceedButtons();
	}
	
	clickHandler = new ClickEventHandler(map);

	if(init_map_mode == 'satellite')
		setMapLayer(MAP_LAYER_SATELLITE);
	else if(init_map_mode == 'osm')
		setMapLayer(MAP_LAYER_OSM);
	else if(init_map_mode == 'apple')
		setMapLayer(MAP_LAYER_APPLE);
	else if(init_map_mode == 'esri')
		setMapLayer(MAP_LAYER_ESRI);
	else if(init_map_mode == 'microsoft')
		setMapLayer(MAP_LAYER_MICROSOFT);
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

function showDecodeInputAltTip() {
	if(typeof showNotification == 'function') {
		showNotification(DECODE_INPUT_ALT_TIP_MESSAGE);
	}
}

function hideDecodeInputAltTip() {
	if(typeof hideNotication != 'function' || !notification_bottom) {
		return;
	}
	if(notification_bottom.innerHTML === DECODE_INPUT_ALT_TIP_MESSAGE) {
		hideNotication();
	}
}

function execDecode(code) {
	var trimmed = code.replace(/(\\|\/)/gm, '').trim();
	if(trimmed.length === 0) {
		showNotification(INCORRECT_WCODE);
		return;
	}

	if(typeof digipin != 'undefined' && digipin.looksLikeDigipin(trimmed)) {
		execDecodeDigipin(trimmed);
		return;
	}

	if(typeof looksLikePlusCode == 'function' && looksLikePlusCode(trimmed)) {
		execDecodePlusCode(trimmed);
		return;
	}

	code = trimmed.toLowerCase();
	var valid = true;
	var splitChar;
	if(code.indexOf(' ') != -1)
		splitChar = ' ';
	else
		splitChar = '.';
	var words = code.split(splitChar);
	if(words.length < 3)
		valid = false;
	else
		decode(words);

	if(!valid)
		showInvalidCodeDialog(trimmed);
}

function execDecodePlusCode(code) {
	if(typeof google != 'object' || !google.maps || !google.maps.Geocoder) {
		showInvalidCodeDialog(code);
		return;
	}
	var geocoder = new google.maps.Geocoder;
	geocoder.geocode({'address': code}, function(results, status) {
		if(status === 'OK' && results && results[0] && results[0].geometry) {
			var loc = results[0].geometry.location;
			var pos = {lat: loc.lat(), lng: loc.lng()};
			steerToDecodedCoordinate(pos);
		}
		else {
			showInvalidCodeDialog(code);
		}
	});
}

function steerToDecodedCoordinate(pos) {
	keepAddressPanelOpen = true;
	ensureMapViewForLocation();
	focus___(pos);
	encode(pos);
	clearAddress();
	latLng_p = pos;
	getAddress(pos);
	showAddress();
}

function execDecodeDigipin(code) {
	try {
		var result = digipin.decode(digipin.normalizeInput(code));
		var pos = {lat: result.lat, lng: result.lon};
		steerToDecodedCoordinate(pos);
	}
	catch(error) {
		showInvalidCodeDialog(code);
	}
}

var pendingInvalidQuery = '';
function showInvalidCodeDialog(query) {
	pendingInvalidQuery = query || '';
	var wrap = document.getElementById('invalid_code_query_wrap');
	var quoted = document.getElementById('invalid_code_query');
	if(quoted) {
		quoted.textContent = pendingInvalidQuery;
	}
	if(wrap) {
		wrap.classList.toggle('hide', !pendingInvalidQuery);
	}
	showOverlay(document.getElementById('invalid_code_message'));
}

function hideInvalidCodeDialog() {
	hideOverlay(document.getElementById('invalid_code_message'));
}

function invalidCodeCorrect() {
	hideInvalidCodeDialog();
	if(document.body.classList.contains('decode')) {
		var decodeInput = document.getElementById('decode_input');
		if(decodeInput) {
			decodeInput.focus();
			decodeInput.select();
		}
		return;
	}
	var pacInput = document.getElementById('pac-input');
	if(pacInput) {
		pacInput.focus();
		pacInput.select();
	}
}

function invalidCodeSearchMap() {
	var query = pendingInvalidQuery;
	hideInvalidCodeDialog();
	searchMapWithQuery(query);
}

function searchMapWithQuery(query) {
	if(!query) {
		return;
	}
	ensureMapViewForLocation();
	var input = document.getElementById('pac-input');
	if(input) {
		input.value = query;
		var searchIcon = document.getElementById('search_icon');
		if(searchIcon) {
			searchIcon.classList.add('hide');
		}
	}
	if(typeof syncProceedButtons == 'function') {
		syncProceedButtons();
	}
	var placesLib = typeof getGooglePlacesLibrary == 'function' ? getGooglePlacesLibrary() : null;
	if(!placesLib || !placesLib.PlacesService || !map) {
		showNotification('Map search is unavailable');
		return;
	}
	var service = new placesLib.PlacesService(map);
	var applyResult = function(place) {
		if(!place || !place.geometry || !place.geometry.location) {
			return false;
		}
		var pos = resolveLatLng(place.geometry.location);
		keepAddressPanelOpen = true;
		focus___(pos);
		encode(pos);
		clearAddress();
		latLng_p = pos;
		getAddress(pos);
		showAddress();
		return true;
	};
	service.findPlaceFromQuery({query: query, fields: ['name', 'geometry']}, function(results, status) {
		if(status === 'OK' && results && results[0] && applyResult(results[0])) {
			return;
		}
		service.textSearch({query: query}, function(textResults, textStatus) {
			if(textStatus === 'OK' && textResults && textResults[0] && applyResult(textResults[0])) {
				return;
			}
			showNotification('No map results for that search');
		});
	});
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

function getBottomStackHeight() {
	var stack = document.getElementById('map_bottom_stack');
	return stack ? stack.offsetHeight : 0;
}

function getPanByOffset() {
	var base = window.innerHeight < 1000 ? -118 : 0;
	return base - getBottomStackHeight();
}

function applyMapChromePan() {
	if(typeof map == 'undefined' || !map) {
		return;
	}
	map.panBy(0, getPanByOffset());
	lastBottomStackPanY = getBottomStackHeight();
}

function syncBottomStackMapPan() {
	if(typeof map == 'undefined' || !map) {
		return;
	}
	var next = getBottomStackHeight();
	var delta = next - lastBottomStackPanY;
	if(delta) {
		map.panBy(0, -delta);
		lastBottomStackPanY = next;
	}
}

function initBottomStackMapPan() {
	var stack = document.getElementById('map_bottom_stack');
	if(typeof lastBottomStackPanY == 'undefined') {
		lastBottomStackPanY = 0;
	}
	if(stack && typeof ResizeObserver != 'undefined' && !stack._bottomStackObserver) {
		stack._bottomStackObserver = new ResizeObserver(function() {
			syncBottomStackMapPan();
		});
		stack._bottomStackObserver.observe(stack);
	}
	window.addEventListener('resize', syncBottomStackMapPan);
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
	}
	if(typeof closeActionMenu == 'function')
		closeActionMenu();
	setMapLayer(getDefaultMapLayer());
}

function activateSatelliteMapType() {
	if(document.body.classList.contains('decode')) {
		document.body.classList.remove('decode');
	}
	if(typeof closeActionMenu == 'function')
		closeActionMenu();
	if(isMapLayerEnabled(MAP_LAYER_SATELLITE)) {
		setMapLayer(MAP_LAYER_SATELLITE);
	}
	else {
		setMapLayer(getDefaultMapLayer());
	}
}

function toggleMapType() {
	var layer = getCurrentMapLayer();
	if(document.body.classList.contains('decode')) {
		activateMapType();
	}
	else if(layer === MAP_LAYER_SATELLITE) {
		document.body.classList.remove('satellite');
		document.body.classList.add('decode');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
		syncOsmAttribution();
		syncAppModeBackground();
		if(typeof closeActionMenu == 'function') {
			closeActionMenu();
		}
		if(typeof syncMapChromeTooltips === 'function') {
			syncMapChromeTooltips();
		}
	}
	else {
		setMapLayer(getNextMapLayer(layer));
	}
}

function toggleMapViewType() {
	if(document.body.classList.contains('decode')) {
		activateSatelliteMapType();
		return;
	}

	setMapLayer(getNextMapLayer(getCurrentMapLayer()));
}

function toggleDecodeView() {
	if(document.body.classList.contains('decode')) {
		activateMapType();
	}
	else {
		clearMapViewClasses();
		document.body.classList.add('decode');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
		syncOsmAttribution();
		syncAppModeBackground();
		if(typeof closeActionMenu == 'function') {
			closeActionMenu();
		}
		if(typeof syncMapChromeTooltips === 'function') {
			syncMapChromeTooltips();
		}
	}
}
