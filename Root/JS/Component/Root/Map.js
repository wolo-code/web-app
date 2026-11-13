var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var poiPlace;
var mapPlaces = [];
var mapSelectionVersion = 0;
var mapFitPlacesSelectionVersion = null;
var mapPinAdjustment = null;
var keepAdjustedPinCamera = false;
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

var mapDragClickGuard = false;
var mapDragClickGuardTimer = 0;

function markMapDragClickGuard() {
	mapDragClickGuard = true;
	if(mapDragClickGuardTimer) {
		clearTimeout(mapDragClickGuardTimer);
		mapDragClickGuardTimer = 0;
	}
}

function clearMapDragClickGuard() {
	if(mapDragClickGuardTimer) {
		clearTimeout(mapDragClickGuardTimer);
	}
	mapDragClickGuardTimer = setTimeout(function() {
		mapDragClickGuard = false;
		mapDragClickGuardTimer = 0;
	}, 0);
}

function mapEventPathHasSelector(event, selector) {
	var dom = event && event.domEvent;
	var path;
	var i;
	var node;
	if(!dom) {
		return false;
	}
	if(typeof dom.composedPath == 'function') {
		path = dom.composedPath();
		for(i = 0; i < path.length; i++) {
			node = path[i];
			if(node && node.matches && node.matches(selector)) {
				return true;
			}
		}
		return false;
	}
	node = dom.target || dom.srcElement;
	while(node && node !== document && node !== window) {
		if(node.matches && node.matches(selector)) {
			return true;
		}
		node = node.parentNode || node.host;
	}
	return false;
}

function isMapChromeClick(event) {
	return mapEventPathHasSelector(event, '#map_search_cluster, #map_input_suggestion_result, .control') ||
		mapEventPathHasSelector(event, 'gmp-internal-camera-control') ||
		mapEventPathHasSelector(event, '#map_type_button') ||
		mapEventPathHasSelector(event, '#location_button') ||
		mapEventPathHasSelector(event, '.action_menu_item, #saved_button, #decode_scan_area') ||
		mapEventPathHasSelector(event, '.map_attribution, #map_places_toggle, #map_places_panel');
}

function isIgnorableMapClick(event) {
	return mapPinAdjustment !== null || Date.now() < mapHoldClickUntil || mapDragClickGuard || isMapChromeClick(event);
}

// A touch hold adds a point using the same retained-card flow as Shift-click.
var mapHoldClickUntil = 0;
function setupMapTouchHold() {
	var surface = map.getDiv();
	var timer = null;
	var origin = null;
	var held = false;
	var pinDrag = null;
	var pinTouchTarget = null;
	var releasePinGesture = null;
	function cancelHold() {
		clearTimeout(timer);
		timer = null;
		origin = null;
	}
	surface.addEventListener('touchstart', function(event) {
		cancelHold();
		stopPinDrag();
		held = false;
		if(mapPinAdjustment || event.touches.length !== 1 || isMapChromeClick({domEvent: event})) return;
		var touch = event.touches[0];
		var projection = mapPinProjectionOverlay.getProjection();
		if(!projection) return;
		var rect = surface.getBoundingClientRect();
		var pixel = new google.maps.Point(touch.clientX - rect.left, touch.clientY - rect.top);
		var entry = getMapPlaceAtPixel(projection, pixel);
		if(mapEventPathHasSelector({domEvent: event}, 'input, a, .gm-style-iw') ||
			(!entry && mapEventPathHasSelector({domEvent: event}, 'button, [role="button"]'))) return;
		if(entry) releasePinGesture = reserveMapPinGesture();
		origin = {x: touch.clientX, y: touch.clientY};
		timer = setTimeout(function() {
			if(!origin || mapPinAdjustment) return;
			cancelHold();
			var latLng = entry ? null : projection.fromContainerPixelToLatLng(pixel);
			if(entry ? !startMapPinAdjustment(entry) : !latLng) {
				stopPinDrag();
				return;
			}
			held = true;
			mapHoldClickUntil = Date.now() + 1000;
			if(entry) {
				pinDrag = getMapPinDragOffset(touch.clientX, touch.clientY);
				// The map can detach the hidden marker while its original touch is still active.
				pinTouchTarget = touch.target;
				if(pinTouchTarget && pinTouchTarget !== surface) {
					pinTouchTarget.addEventListener('touchmove', moveHeldPin, {passive: false});
					pinTouchTarget.addEventListener('touchend', endHold, {passive: false});
					pinTouchTarget.addEventListener('touchcancel', stopPinDrag);
				}
				return;
			}
			cleanUp(true, true);
			infoWindow_setContent(MESSAGE_LOADING);
			var pos = resolveLatLng(latLng);
			encode(pos);
			focus___(pos);
			getAddress(pos);
		}, 500);
	}, {capture: true, passive: true});
	function moveHeldPin(event) {
		if(pinDrag && mapPinAdjustment && event.touches.length === 1) {
			var touch = event.touches[0];
			if(event.cancelable) event.preventDefault();
			event.stopImmediatePropagation();
			moveMapPinDraft(touch.clientX + pinDrag.x, touch.clientY + pinDrag.y);
			return true;
		}
		return false;
	}
	function stopPinDrag() {
		pinDrag = null;
		if(releasePinGesture) releasePinGesture();
		releasePinGesture = null;
		if(pinTouchTarget && pinTouchTarget !== surface) {
			pinTouchTarget.removeEventListener('touchmove', moveHeldPin);
			pinTouchTarget.removeEventListener('touchend', endHold);
			pinTouchTarget.removeEventListener('touchcancel', stopPinDrag);
		}
		pinTouchTarget = null;
	}
	surface.addEventListener('touchmove', function(event) {
		if(moveHeldPin(event)) return;
		if(!origin) return;
		var touch = event.touches[0];
		if(event.touches.length !== 1 || Math.hypot(touch.clientX - origin.x, touch.clientY - origin.y) > 10) {
			cancelHold();
			stopPinDrag();
		}
	}, {capture: true, passive: false});
	function endHold(event) {
		cancelHold();
		stopPinDrag();
		if(held) {
			mapHoldClickUntil = Date.now() + 1000;
			if(event.cancelable) event.preventDefault();
		}
	}
	surface.addEventListener('touchend', endHold, {capture: true, passive: false});
	function cancelTouchHold() {
		cancelHold();
		stopPinDrag();
	}
	surface.addEventListener('touchcancel', cancelTouchHold, {capture: true, passive: true});
	surface.addEventListener('contextmenu', function(event) {
		if(timer !== null || held) event.preventDefault();
	});
	function cancelPendingTouchHold() {
		if(origin) cancelTouchHold();
	}
	map.addListener('dragstart', cancelPendingTouchHold);
	map.addListener('zoom_changed', cancelPendingTouchHold);
	window.addEventListener('blur', cancelTouchHold);
}

function getMapViewportSize() {
	var el = document.getElementById('map');
	var width = (el && el.clientWidth) ? el.clientWidth : (window.innerWidth || 0);
	var height = (el && el.clientHeight) ? el.clientHeight : (window.innerHeight || 0);
	if(window.visualViewport) {
		if(window.visualViewport.width > 0) {
			width = Math.max(width, Math.round(window.visualViewport.width));
		}
		if(window.visualViewport.height > 0) {
			height = Math.max(height, Math.round(window.visualViewport.height));
		}
	}
	return {width: width, height: height};
}

function getMapFillLatitude() {
	var center;
	if(typeof map === 'object' && map && typeof map.getCenter === 'function') {
		center = map.getCenter();
		if(center && typeof center.lat === 'function') {
			return center.lat();
		}
		if(center && typeof center.lat === 'number') {
			return center.lat;
		}
	}
	if(typeof DEFAULT_LATLNG === 'object' && DEFAULT_LATLNG && typeof DEFAULT_LATLNG.lat === 'number') {
		return DEFAULT_LATLNG.lat;
	}
	return 0;
}

function mercatorNormalizedY(latDeg) {
	var lat = (typeof latDeg === 'number' ? latDeg : 0) * Math.PI / 180;
	var sin;
	if(lat > 1.4844222297453324) {
		lat = 1.4844222297453324;
	}
	else if(lat < -1.4844222297453324) {
		lat = -1.4844222297453324;
	}
	sin = Math.sin(lat);
	return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}

function getZoomToCoverPixels(pixels, tile) {
	if(!(pixels > 0) || !(tile > 0)) {
		return typeof DEFAULT_INIT_ZOOM === 'number' ? DEFAULT_INIT_ZOOM : 2;
	}
	if(pixels <= tile) {
		return 0;
	}
	return Math.ceil(Math.log((pixels + 1) / tile) / Math.LN2);
}

function getMinZoomToFillMapHeight() {
	var size = getMapViewportSize();
	var tile = typeof WORLD_MAP_TILE_SIZE === 'number' ? WORLD_MAP_TILE_SIZE : 256;
	var y = mercatorNormalizedY(getMapFillLatitude());
	var half = (size.height + 1) / 2;
	var frac = Math.min(Math.max(y, 0.0001), 0.9999);
	var coverHeight = Math.max(half / frac, half / (1 - frac), size.height);
	return Math.max(getZoomToCoverPixels(coverHeight, tile), getZoomToCoverPixels(size.width, tile), 0);
}

function applyMapFillMinZoom() {
	var minZoom;
	var current;
	if(typeof map !== 'object' || !map || typeof map.setOptions !== 'function') {
		return;
	}
	minZoom = getMinZoomToFillMapHeight();
	map.setOptions({minZoom: minZoom});
	current = map.getZoom();
	if(typeof current === 'number' && current < minZoom) {
		map.setZoom(minZoom);
	}
}

function scheduleMapFillMinZoom() {
	applyMapFillMinZoom();
	if(typeof requestAnimationFrame === 'function') {
		requestAnimationFrame(function() {
			applyMapFillMinZoom();
		});
	}
}

function isMapSearchTypingTarget(el) {
	var tag;
	if(!el || el === document.body || el === document.documentElement)
		return false;
	tag = el.tagName;
	if(tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT')
		return true;
	return !!el.isContentEditable;
}

function shouldKeepMapSearchFocused() {
	if(document.body.classList.contains('map_pin_adjusting'))
		return false;
	if(typeof isMapViewActive == 'function' && !isMapViewActive())
		return false;
	if(document.body.classList.contains('decode'))
		return false;
	if(document.body.classList.contains('decode-icon-guide'))
		return false;
	if(typeof getVisibleOverlayDialog == 'function' && getVisibleOverlayDialog())
		return false;
	if(isMapSearchTypingTarget(document.activeElement) && document.activeElement.id !== 'pac-input')
		return false;
	return true;
}

function focusMapSearchInput() {
	var input = document.getElementById('pac-input');
	if(!input || !shouldKeepMapSearchFocused())
		return false;
	if(document.activeElement === input)
		return true;
	try {
		input.focus({preventScroll: true});
	}
	catch(err) {
		input.focus();
	}
	return document.activeElement === input;
}

function scheduleFocusMapSearchInput() {
	if(typeof requestAnimationFrame == 'function') {
		requestAnimationFrame(function() {
			focusMapSearchInput();
		});
		return;
	}
	setTimeout(focusMapSearchInput, 0);
}

function blurMapSearchInput() {
	var input = document.getElementById('pac-input');
	if(input && document.activeElement === input)
		input.blur();
}

function onMapSearchGlobalKeydown(event) {
	var input;
	if(!event || event.defaultPrevented)
		return;
	if(event.ctrlKey || event.metaKey || event.altKey)
		return;
	if(event.key === 'Backspace' || event.key === 'Delete') {
		var target = document.activeElement;
		var search = document.getElementById('pac-input');
		if(shouldKeepMapSearchFocused() && (!isMapSearchTypingTarget(target) || (target === search && !search.value))) {
			var row = target && target.closest ? target.closest('#map_places_list li') : null;
			var entry = row ? row.mapPlace : getMapPlace(marker);
			if(entry) { event.preventDefault(); removeMapPlace(entry); return; }
		}
	}
	if(event.key && event.key.length !== 1 && event.key !== 'Backspace')
		return;
	if(!shouldKeepMapSearchFocused())
		return;
	input = document.getElementById('pac-input');
	if(!input || document.activeElement === input)
		return;
	focusMapSearchInput();
}

function initMap() {
	initOsmMapType();
	initMapFocusCancellation();
	initMapPinAdjustment();

	var input = document.getElementById('pac-input');
	var searchCluster = document.getElementById('map_search_cluster');
	var searchBar = document.getElementById('map_search_bar');
	var placesLib = typeof getGooglePlacesLibrary == 'function' ? getGooglePlacesLibrary() : null;
	if(searchCluster)
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchCluster);
	else if(searchBar)
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(searchBar);
	else if(input)
		map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
	var searchBox = (placesLib && placesLib.SearchBox && input) ? new placesLib.SearchBox(input) : null;

	if(searchBox) {
		map.addListener('bounds_changed', function() {
			searchBox.setBounds(map.getBounds());
		});
	}
	
	if(input) {
		input.addEventListener("focus", function() {
			addClassIfPresent(document.getElementById('search_icon'), 'hide');
		});

		input.addEventListener("change", function() {
			if(input.value == '')
				removeClassIfPresent(document.getElementById('search_icon'), 'hide');
			syncProceedButtons();
		});
	}
	
	var shareRoute = document.getElementById('map_places_share');
	if(shareRoute) addLongpressListener(shareRoute, function() { shareMapRoute(false); }, function() { shareMapRoute(true); });
	var placesToggle = document.getElementById('map_places_toggle');
	var placesPanel = document.getElementById('map_places_panel');
	if(placesToggle && placesPanel) {
		placesToggle.addEventListener('click', function() {
			placesPanel.hidden = !placesPanel.hidden;
			placesToggle.setAttribute('aria-expanded', String(!placesPanel.hidden));
			positionMapPlacesPanel();
		});
		window.addEventListener('resize', positionMapPlacesPanel);
		placesPanel.addEventListener('keydown', function(event) {
			if(event.key === 'Escape') {
				placesToggle.click();
				placesToggle.focus();
			}
		});
	}
	if(searchBox) {
		searchBox.addListener('places_changed', function() {
		var places = typeof getSearchBoxPlaceList == 'function' ? getSearchBoxPlaceList(searchBox) : searchBox.getPlaces();

		if (!places || !places.length) {
			return;
		}
		places = places.filter(function(place) {
			return place.geometry && place.geometry.location;
		});
		if(!places.length)
			return;

		cleanUp();
		mapPlaces = mapPlaces.filter(function(entry) {
			if(entry.card) {
				entry.result = false;
				return true;
			}
			if(!entry.result)
				return true;
			entry.marker.setMap(null);
			return false;
		});

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
				var entry = {marker: resultMarker, name: place.name, result: true};
				bindMapPlaceMarker(resultMarker, function(event) {
					loadMapPlace(entry, !!(event && event.domEvent && event.domEvent.shiftKey));
				});
				mapPlaces.push(entry);

				if (place.geometry.viewport) {
					bounds.union(place.geometry.viewport);
				} else {
					bounds.extend(place.geometry.location);
				}
			});
			map.fitBounds(bounds);
		}
		renderMapPlaces();
	});
	}

	setupMapTouchHold();
	map.addListener('dragstart', markMapDragClickGuard);
	map.addListener('drag', markMapDragClickGuard);
	map.addListener('idle', clearMapDragClickGuard);
	map.addListener('click', function(event) {
		if(isIgnorableMapClick(event)) {
			if(mapPinAdjustment && event.stop) event.stop();
			return;
		}
		cleanUp(true, !!(event.domEvent && event.domEvent.shiftKey));
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

	addLongpressListener(document.getElementById('decode_button'), decode_input_from_map, decode_input_from_map_add);
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
	var shiftEnterDown = false;
	input.addEventListener('keydown', function(event) {
		if(event.key !== 'Enter' || event.isComposing)
			return;
		if(!event.repeat)
			shiftEnterDown = event.shiftKey;
		if(!shiftEnterDown)
			return;
		event.preventDefault();
		event.stopImmediatePropagation();
		if(!event.repeat)
			decode_input_from_map(event);
	}, true);
	input.addEventListener('keyup', function(event) {
		if(event.key === 'Enter' && shiftEnterDown) {
			shiftEnterDown = false;
			return;
		}
		if(!event.shiftKey && !event.isComposing)
			enterHandler(event);
	});
	document.getElementById('decode_button').addEventListener('keydown', function(event) {
		if(event.key === 'Enter' && event.shiftKey && !event.repeat) {
			event.preventDefault();
			decode_input_from_map(event);
		}
	});
	document.addEventListener('keydown', onMapSearchGlobalKeydown);
	document.getElementById('decode_input').addEventListener('input', suggestWrapper);
	if(typeof syncProceedButtons == 'function') {
		document.getElementById('decode_input').addEventListener('input', syncProceedButtons);
	}
	document.getElementById('decode_input').addEventListener('keydown', function(event) {
		if(event.key !== 'Enter' || event.shiftKey || event.isComposing)
			return;
		event.preventDefault();
		if(!event.repeat)
			decode_input_from_form_external();
	});
	document.getElementById('decode_input').addEventListener('focus', showDecodeInputAltTip);
	document.getElementById('decode_input').addEventListener('blur', hideDecodeInputAltTip);
	if(typeof syncProceedButtons == 'function') {
		syncProceedButtons();
	}
	
	clickHandler = new ClickEventHandler(map);

	if(init_map_mode == 'satellite')
		setMapLayer(MAP_LAYER_SATELLITE);
	else if(initWCode)
		setMapLayer(getDefaultMapLayer());
	else if(typeof isMapViewActive == 'function' && isMapViewActive())
		setMapLayer(getCurrentMapLayer() || getDefaultMapLayer());
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
	scheduleMapFillMinZoom();
	window.addEventListener('resize', applyMapFillMinZoom);
	if(window.visualViewport && !window.visualViewport._woloFillZoom) {
		window.visualViewport._woloFillZoom = true;
		window.visualViewport.addEventListener('resize', applyMapFillMinZoom);
	}
	scheduleFocusMapSearchInput();

}

function decode_input_from_map(event) {
	var keepMapCard = !!(event && event.shiftKey);
	if(keepMapCard) {
		initWCode_jumpToMap = false;
		initWCode_jump_ask = false;
	}
	document.activeElement.blur();
	beginDecode(document.getElementById('pac-input').value, null, {keepMapCard: keepMapCard});
}

function decode_input_from_map_add() {
	decode_input_from_map({shiftKey: true});
}

function decode_input_from_form() {
	document.activeElement.blur();
	beginDecode(document.getElementById('decode_input').value);
}

function decode_input_from_form_external() {
	initWCode_jump_ask = true;
	decode_input_from_form();
}

function beginDecode(code, scannedMetadata, options) {
	var decodeMarker = marker;
	cleanUp(false, options && options.keepMapCard);
	if(options && options.keepMapCard) mapFitPlacesSelectionVersion = mapSelectionVersion;
	if(scannedMetadata) {
		current_title = scannedMetadata.title || '';
		current_segment = scannedMetadata.segment || '';
		current_address_lines = scannedMetadata.address_line_1 || scannedMetadata.address_line_2 ? {
			address_line_1: scannedMetadata.address_line_1 || '', address_line_2: scannedMetadata.address_line_2 || ''
		} : null;
		current_address = current_address_lines ? formatSavedAddress(current_address_lines) : '';
	}
	keepAddressPanelOpen = !!(options && options.showAddress);
	if(keepAddressPanelOpen) address = current_address || '';
	addClassIfPresent(document.getElementById('accuracy_container'), 'hide');
	execDecode(code, decodeMarker);
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

function execDecode(code, decodeMarker) {
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
		decode(words, decodeMarker, mapSelectionVersion);

	if(!valid)
		showInvalidCodeDialog(trimmed);
}

function execDecodePlusCode(code) {
	if(typeof google != 'object' || !google.maps || !google.maps.Geocoder) {
		showInvalidCodeDialog(code);
		return;
	}
	var geocoder = new google.maps.Geocoder;
	var session = encode_session_id;
	geocoder.geocode({'address': code}, function(results, status) {
		if(session !== encode_session_id)
			return;
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
function showInvalidCodeDialog(query, title, detail) {
	if(typeof redirect_isActive === 'function' && redirect_isActive())
		redirect_reset();
	else if(typeof external_hide === 'function' && getVisibleOverlayDialog() === document.getElementById('external_message'))
		external_hide();
	pendingInvalidQuery = query || '';
	var heading = document.getElementById('invalid_code_title');
	var description = document.getElementById('invalid_code_detail');
	var wrap = document.getElementById('invalid_code_query_wrap');
	var quoted = document.getElementById('invalid_code_query');
	if(heading)
		heading.textContent = title || 'Unrecognized code';
	if(description)
		description.textContent = detail || 'Invalid Wolo Code, DIGIPIN, or Plus Code';
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
	var session = encode_session_id;
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
		if(session !== encode_session_id)
			return;
		if(status === 'OK' && results && results[0] && applyResult(results[0])) {
			return;
		}
		service.textSearch({query: query}, function(textResults, textStatus) {
			if(session !== encode_session_id)
				return;
			if(textStatus === 'OK' && textResults && textResults[0] && applyResult(textResults[0])) {
				return;
			}
			showNotification('No map results for that search');
		});
	});
}

function getMapPlace(placeMarker) {
	return mapPlaces.find(function(entry) { return entry.marker === placeMarker; });
}

function trackActiveMapPlace() {
	if(!getMapPlace(marker)) {
		mapPlaces.push({marker: marker});
		renderMapPlaces();
	}
}

function toggleActiveMapCard() {
	if(isInfoWindowOpen())
		infoWindow.close();
	else
		showInfoWindow();
}

function loadMapPlace(entry, keepMapCard) {
	if(mapPinAdjustment) finishMapPinAdjustment();
	if(entry.card) {
		activateMapCard(entry.card);
		focus_(entry.marker.getPosition());
		return;
	}
	if(entry.marker === marker) {
		toggleActiveMapCard();
		return;
	}
	cleanUp(false, keepMapCard);
	marker = entry.marker;
	infoWindow_setContent(MESSAGE_LOADING);
	var position = resolveLatLng(marker.getPosition());
	focus___(position);
	encode(position);
}

function renderMapPlaces() {
	var toggle = document.getElementById('map_places_toggle');
	if(!toggle)
		return;
	var panel = document.getElementById('map_places_panel');
	var list = document.getElementById('map_places_list');
	var directions = document.getElementById('map_places_directions');
	document.getElementById('map').classList.toggle('map_has_retained_cards', mapPlaces.some(function(entry) {
		return !!entry.card;
	}));
	toggle.hidden = mapPlaces.length < 2;
	if(toggle.hidden) {
		panel.hidden = true;
		toggle.setAttribute('aria-expanded', 'false');
	}
	mapPlaces.forEach(function(entry, index) {
		if(entry.marker.setLabel) entry.marker.setLabel(mapPlaces.length > 1 ? {
			text: getMapPlaceLabel(index), className: 'map_place_marker_letter',
			color: '#222', fontWeight: '600', fontSize: '13px'
		} : null);
	});
	syncMapPlaceIndices();
	list.replaceChildren();
	directions.replaceChildren();
	if(toggle.hidden)
		return;

	mapPlaces.forEach(function(entry, index) {
		var row = document.createElement('li');
		var name = String(entry.name || entry.marker.getTitle() || '');
		name = name.charAt(0).toLocaleUpperCase() + name.slice(1);
		var placeButton = document.createElement('button');
		placeButton.type = 'button';
		placeButton.className = 'map_place_name';
		placeButton.title = name;
		var badge = document.createElement('span');
		badge.className = 'map_place_letter';
		badge.textContent = getMapPlaceLabel(index);
		var label = document.createElement('span');
		label.className = 'map_place_text';
		label.textContent = name;
		placeButton.append(badge);
		placeButton.append(label);
		placeButton.addEventListener('click', function() {
			if(entry.card)
				activateMapCard(entry.card);
			if(entry.marker !== marker)
				loadMapPlace(entry, true);
			else
				showInfoWindow();
			focus_(entry.marker.getPosition());
		});
		row.append(placeButton);
		row.mapPlace = entry;
		var drag = document.createElement('button');
		drag.type = 'button';
		drag.className = 'map_place_drag';
		drag.textContent = '=';
		drag.title = 'Drag to rearrange; use arrow keys to move';
		drag.setAttribute('aria-label', 'Rearrange ' + name);
		drag.addEventListener('keydown', function(event) {
			if(event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
			event.preventDefault();
			event.stopPropagation();
			moveMapPlace(entry, index + (event.key === 'ArrowUp' ? -1 : 1));
		});
		drag.addEventListener('pointerdown', function(event) {
			if(event.button !== 0) return;
			event.preventDefault();
			drag.setPointerCapture(event.pointerId);
			row.classList.add('map_place_dragging');
			var target = index;
			var dropRow;
			function move(e) {
				var hit = document.elementFromPoint(e.clientX, e.clientY);
				var next = hit && hit.closest('#map_places_list li');
				if(!next) return;
				if(dropRow) dropRow.classList.remove('map_place_drop_before', 'map_place_drop_after');
				dropRow = next;
				var rect = next.getBoundingClientRect();
				var after = e.clientY >= rect.top + rect.height / 2;
				var insertion = mapPlaces.indexOf(next.mapPlace) + (after ? 1 : 0);
				target = insertion - (mapPlaces.indexOf(entry) < insertion ? 1 : 0);
				if(target !== mapPlaces.indexOf(entry))
					next.classList.add(after ? 'map_place_drop_after' : 'map_place_drop_before');
			}
			function finish(e) {
				drag.removeEventListener('pointermove', move);
				drag.removeEventListener('pointerup', finish);
				drag.removeEventListener('pointercancel', finish);
				row.classList.remove('map_place_dragging');
				if(dropRow) dropRow.classList.remove('map_place_drop_before', 'map_place_drop_after');
				if(drag.hasPointerCapture(e.pointerId)) drag.releasePointerCapture(e.pointerId);
				if(e.type !== 'pointercancel') moveMapPlace(entry, target);
			}
			drag.addEventListener('pointermove', move);
			drag.addEventListener('pointerup', finish);
			drag.addEventListener('pointercancel', finish);
		});
		var remove = document.createElement('button');
		remove.type = 'button';
		remove.className = 'map_place_remove';
		remove.textContent = '\u00d7';
		remove.title = 'Remove place';
		remove.setAttribute('aria-label', 'Remove ' + name);
		remove.addEventListener('click', function() {
			removeMapPlace(entry);
			var next = list.children[Math.min(index, mapPlaces.length - 1)];
			if(!panel.hidden && next) next.firstElementChild.focus();
			else toggle.focus();
		});
		row.append(remove);
		row.append(drag);
		list.append(row);
	});

	var coordinates = mapPlaces.map(function(entry) {
		var pos = entry.marker.getPosition();
		return pos.lat() + ',' + pos.lng();
	});
	// Mobile browsers support three intermediate stops per Google Maps URL.
	for(var start = 0; start < coordinates.length - 1; start += 4) {
		var stops = coordinates.slice(start, start + 5);
		var params = new URLSearchParams({
			api: '1',
			origin: stops[0],
			destination: stops[stops.length - 1]
		});
		if(stops.length > 2)
			params.set('waypoints', stops.slice(1, -1).join('|'));
		var link = document.createElement('a');
		link.href = 'https://www.google.com/maps/dir/?' + params.toString();
		link.target = '_blank';
		link.rel = 'noopener noreferrer';
		var title = coordinates.length > 5 ? 'Directions ' + getMapPlaceLabel(start) + '–' + getMapPlaceLabel(start + stops.length - 1) : 'Directions';
		link.title = title;
		link.setAttribute('aria-label', title);
		var icon = document.createElement('img');
		icon.src = svg_launch;
		icon.alt = '';
		link.append(icon);
		directions.append(link);
	}
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
	if(typeof isAppOverlayOpen == 'function' && isAppOverlayOpen()) {
		if(typeof layoutBottomNotification == 'function')
			layoutBottomNotification();
		return;
	}
	var next = getBottomStackHeight();
	var delta = next - lastBottomStackPanY;
	if(delta) {
		if(!programmaticMapFocus && !mapPinAdjustment && !keepAdjustedPinCamera)
			map.panBy(0, -delta);
		lastBottomStackPanY = next;
	}
	if(typeof layoutBottomNotification == 'function')
		layoutBottomNotification();
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

var EXTERNAL_MAP_STORAGE_KEY = 'wolo.externalMap';
var externalMapPreference = 'auto';

function initExternalMapPreference() {
	try {
		var saved = localStorage.getItem(EXTERNAL_MAP_STORAGE_KEY);
		if(saved === 'google' || saved === 'apple')
			externalMapPreference = saved;
	}
	catch(error) {
		// Keep the default when storage is unavailable.
	}
	var selects = document.querySelectorAll('.external-map-select');
	selects.forEach(function(select) {
		select.value = externalMapPreference;
		select.addEventListener('change', function() {
			externalMapPreference = select.value;
			selects.forEach(function(other) { other.value = externalMapPreference; });
			try {
				localStorage.setItem(EXTERNAL_MAP_STORAGE_KEY, externalMapPreference);
			}
			catch(error) {
				// Keep the selection for the current page.
			}
		});
	});
}

function getExternalMapProvider() {
	if(externalMapPreference !== 'auto')
		return externalMapPreference;
	if(/android/i.test(navigator.userAgent))
		return 'device';
	if(/(iPad|iPhone|iPod)/i.test(navigator.userAgent))
		return 'apple';
	return 'google';
}

function getExternalMapLabel() {
	var provider = getExternalMapProvider();
	if(provider === 'apple')
		return 'Apple Maps';
	if(provider === 'google')
		return 'Google Maps';
	return 'your maps app';
}

function getIntentURL(latLng, code_string) {
	var provider = getExternalMapProvider();
	var coordinates = latLng.lat + ',' + latLng.lng;
	var label = encodeURIComponent('\\ ' + code_string + ' /');
	if(provider === 'device')
		return 'geo:0,0?q=' + coordinates + '(' + label + ')';
	if(provider === 'apple')
		return 'https://maps.apple.com/?ll=' + coordinates + '&q=' + label;
	return 'https://maps.google.com/maps?q=loc:' + coordinates + '&t=h';
}

function clearMap() {
	if(!marker)
		return;
	var entry = getMapPlace(marker);
	if(!entry || !entry.result) {
		marker.setMap(null);
		mapPlaces = mapPlaces.filter(function(place) { return place !== entry; });
	}
	else
		marker = null;
	renderMapPlaces();
}

function cleanUp(full = false, keepMapCard = false) {
	if(mapPinAdjustment) finishMapPinAdjustment();
	keepAdjustedPinCamera = false;
	pendingWoloLinkZoom = undefined;
	if(keepMapCard)
		retainActiveMapCard();
	mapSelectionVersion++;
	mapFitPlacesSelectionVersion = null;
	encode_session_id = Symbol();
	stopZoom();
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
	addClassIfPresent(document.getElementById('notification_top'), 'hide');
	if(infoWindow) {
		infoWindow.close();
		infoWindow.setContent('');
	}
	clearAddress();
	hideAddress();
	clearURL();
	addClassIfPresent(document.getElementById('proceed_container'), 'hide');
	firstFocus = true;
	selfBoundsChangedCount = 1;
	current_title = null;
	current_segment = null;
	current_address = null;
	current_address_lines = null;
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
		if(typeof setGoogleMapTypeId === 'function' && typeof google === 'object' && google.maps && google.maps.MapTypeId)
			setGoogleMapTypeId(google.maps.MapTypeId.ROADMAP);
		syncOsmAttribution();
		syncAppModeBackground();
		if(typeof closeActionMenu == 'function') {
			closeActionMenu();
		}
		if(typeof syncMapChromeTooltips === 'function') {
			syncMapChromeTooltips();
		}
		blurMapSearchInput();
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
		cancelMapFocus();
		document.body.classList.add('decode');
		if(typeof setGoogleMapTypeId === 'function' && typeof google === 'object' && google.maps && google.maps.MapTypeId)
			setGoogleMapTypeId(google.maps.MapTypeId.ROADMAP);
		syncOsmAttribution();
		syncAppModeBackground();
		if(typeof closeActionMenu == 'function') {
			closeActionMenu();
		}
		if(typeof syncMapChromeTooltips === 'function') {
			syncMapChromeTooltips();
		}
		blurMapSearchInput();
	}
}

function removeMapPlace(entry) {
	if(mapPinAdjustment) finishMapPinAdjustment();
	mapPlaces = mapPlaces.filter(function(place) { return place !== entry; });
	if(entry.marker === marker) {
		mapSelectionVersion++;
	mapFitPlacesSelectionVersion = null;
		encode_session_id = Symbol();
		stopZoom();
		if(infoWindow) infoWindow.close();
		infoWindow = null;
		marker = null;
		clearAddress();
		hideAddress();
		clearURL();
	}
	else if(entry.card) entry.card.close();
	entry.marker.setMap(null);
	renderMapPlaces();
}

function moveMapPlace(entry, target) {
	var index = mapPlaces.indexOf(entry);
	if(index < 0 || target < 0 || target >= mapPlaces.length) return;
	mapPlaces.splice(index, 1);
	mapPlaces.splice(target, 0, entry);
	renderMapPlaces();
	document.getElementById('map_places_list').children[target].children[2].focus();
}

function getMapPlaceLabel(index) {
	var label = '';
	for(var value = index + 1; value > 0; value = Math.floor((value - 1) / 26))
		label = String.fromCharCode(65 + (value - 1) % 26) + label;
	return label;
}

function getMapPlaceWoloCode(entry) {
	if(entry.routeCode) return entry.routeCode;
	// Search results without an opened card still have a globally resolvable regional code.
	var position = resolveLatLng(entry.marker.getPosition());
	var choices = regionAnchorsForPosition(position);
	if(!choices.length || typeof wordList === 'undefined') return null;
	var city = choices[0].anchor;
	var data = encode__(getWoloAnchorBegin(city), regionGridPosition(city, position));
	if(!isValidWoloIndexCode(data)) return null;
	var parts = [city.name_id].concat(data.map(function(index) { return wordList.getWord(index); }));
	if(typeof getCanonicalWoloPathFromWords === 'function')
		return getCanonicalWoloPathFromWords(parts).slice(1);
	return parts.map(function(part) {
		return String(part || '').toLowerCase().replace(/_/g, ' ').replace(/\s+/g, '-');
	}).join('.');
}

function getMapRouteURL(coordinateBased) {
	if(mapPlaces.length < 2) return null;
	var coordinates = mapPlaces.map(function(entry) {
		if(!coordinateBased) return getMapPlaceWoloCode(entry);
		var pos = entry.marker.getPosition();
		return pos.lat() + ',' + pos.lng();
	});
	if(coordinates.some(function(value) { return !value; })) return null;
	var params = new URLSearchParams();
	params.set('from', coordinates[0]);
	coordinates.slice(1, -1).forEach(function(position) { params.append('via', position); });
	params.set('to', coordinates[coordinates.length - 1]);
	return window.location.origin + '/?' + params.toString();
}

function shareMapRoute(coordinateBased) {
	var url = getMapRouteURL(coordinateBased);
	if(!url) { showNotification('Route codes are still loading. Please try again.'); return; }
	function copy() { copyPlainText(url); showNotification('Route link copied'); }
	if(navigator.share)
		navigator.share({title: 'Wolo route', url: url}).catch(function(error) {
			if(error.name !== 'AbortError') copy();
		});
	else copy();
}

function mapRouteCoordinate(value) {
	if(!/^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(value)) return null;
	var parts = value.split(',').map(Number);
	return Math.abs(parts[0]) <= 90 && Math.abs(parts[1]) <= 180 ? {lat: parts[0], lng: parts[1]} : null;
}

function resolveMapRouteCode(value) {
	return new Promise(function(resolve, reject) {
		var words = typeof parseWoloPathWords === 'function'
			? parseWoloPathWords(value)
			: String(value || '').toLowerCase().replace(/\+/g, ' ').replace(/_/g, ' ').split('.');
		if(!words || words.length < 4 || typeof wordList === 'undefined') { reject(new Error('Invalid route code')); return; }
		var code = words.slice(-3);
		var data = code.map(function(word) { return wordList.indexOf(word); });
		if(!isValidWoloIndexCode(data)) { reject(new Error('Invalid route code')); return; }
		var reference = words.slice(0, -3);
		getCityFromName(reference.slice(0, -1), reference[reference.length - 1], function(city) {
			getCityCenterFromId(city, function(city) {
				var begin = city && getWoloAnchorBegin(city);
				if(!begin) { reject(new Error('Unknown route reference')); return; }
				var position = decode__(begin, data);
				if(isRegionAnchor(city)) position = positionFromRegionGrid(city, position);
				if(!position || !Number.isFinite(position.lat) || !Number.isFinite(position.lng) || Math.abs(position.lat) > 90 || Math.abs(position.lng) > 180) {
					reject(new Error('Invalid route position')); return;
				}
				resolve({position: position, routeCode: value, name: reference.join(' ') + ' ' + code.join(' ')});
			});
		}, function() { reject(new Error('Unknown route reference')); });
	});
}

function restoreMapRoute() {
	var params = new URLSearchParams(window.location.search);
	if(!params.has('from') || !params.has('to')) return false;
	var values = [params.get('from')].concat(params.getAll('via'), [params.get('to')]);
	var version = mapSelectionVersion;
	function restore(stops) {
		if(version !== mapSelectionVersion) return;
		activateMapType();
		var bounds = new google.maps.LatLngBounds();
		stops.forEach(function(stop, index) {
			var name = stop.name || (index === 0 ? 'From' : index === stops.length - 1 ? 'To' : 'Via ' + getMapPlaceLabel(index));
			var routeMarker = new google.maps.Marker({map: map, position: stop.position, title: name});
			var entry = {marker: routeMarker, name: name, result: true, routeCode: stop.routeCode};
			bindMapPlaceMarker(routeMarker, function() { loadMapPlace(entry, true); });
			mapPlaces.push(entry);
			bounds.extend(stop.position);
		});
		map.fitBounds(bounds);
		renderMapPlaces();
	}
	var positions = values.map(mapRouteCoordinate);
	if(positions.every(Boolean)) {
		restore(positions.map(function(position) { return {position: position}; }));
		return true;
	}
	// A comma denotes a coordinate; reject invalid coordinates before resolving any codes.
	if(values.some(function(value, index) { return value.includes(',') && !positions[index]; })) {
		showNotification('Invalid route link');
		return false;
	}
	Promise.resolve(typeof offlineWordListReady !== 'undefined' ? offlineWordListReady : null).then(function() {
		return Promise.all(values.map(function(value, index) {
			return positions[index] ? Promise.resolve({position: positions[index]}) : resolveMapRouteCode(value);
		}));
	}).then(restore).catch(function() {
		if(version === mapSelectionVersion) showNotification('Could not open this route. Check the Wolo Codes and try again.');
	});
	return true;
}

function positionMapPlacesPanel() {
	var panel = document.getElementById('map_places_panel');
	var toggle = document.getElementById('map_places_toggle');
	if(!panel || panel.hidden || !toggle) return;
	var above = toggle.getBoundingClientRect().top > window.innerHeight / 2;
	panel.style.top = above ? 'auto' : 'calc(100% + 6px)';
	panel.style.bottom = above ? 'calc(100% + 6px)' : 'auto';
}
