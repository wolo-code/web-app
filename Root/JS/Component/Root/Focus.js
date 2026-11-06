function focus__(city, pos, code) {
	if(typeof ensureMapViewForLocation == 'function') {
		ensureMapViewForLocation();
	}
	focus___(pos);
	setCode(city, code, pos);
}

function focus___(pos, bounds, skipFinalBoundsFit) {
	showMarker(pos);
	focus_(pos, bounds, skipFinalBoundsFit);
}

const ZOOM_ANIMATION_SPEED = 250;
var firstFocus = true;
function beginProgrammaticMapFocus() {
	stopZoom();
	programmaticMapFocus = true;
	selfBoundsChangedCount = 1;
}

function endProgrammaticMapFocus() {
	programmaticMapFocus = false;
	if(typeof getBottomStackHeight == 'function')
		lastBottomStackPanY = getBottomStackHeight();
}

var pendingTryCityZoomOut = false;
var holdInfoWindowForTryCityZoomOut = false;

function requestTryCityZoomOut() {
	pendingTryCityZoomOut = true;
	holdInfoWindowForTryCityZoomOut = true;
}

function revealHeldTryCityInfoWindow() {
	holdInfoWindowForTryCityZoomOut = false;
	if(typeof showInfoWindow === 'function' && marker)
		showInfoWindow();
}

function getOverviewZoom() {
	if(typeof getMinZoomToFillMapHeight === 'function')
		return getMinZoomToFillMapHeight();
	return typeof DEFAULT_INIT_ZOOM === 'number' ? DEFAULT_INIT_ZOOM : 2;
}

function getCityScopeBounds(pos) {
	if(!pos || typeof google !== 'object' || !google.maps || typeof google.maps.Circle !== 'function')
		return undefined;
	var radiusKm = typeof CITY_RANGE_RADIUS === 'number' ? CITY_RANGE_RADIUS : 32.767;
	return new google.maps.Circle({
		center: pos,
		radius: radiusKm * 1000
	}).getBounds();
}

function getCityScopeZoom(pos) {
	var bounds = getCityScopeBounds(pos);
	if(bounds && typeof getZoomByBounds === 'function' && typeof map === 'object' && map)
		return getZoomByBounds(map, bounds);
	return 11;
}

function animateMapToCityScope(pos) {
	if(typeof map === 'undefined' || !map || !pos)
		return;

	beginProgrammaticMapFocus();

	function zoomIn() {
		panMapForFocus(pos, function() {
			smoothZoomToBounds(undefined, map, getCityScopeZoom(pos), map.getZoom());
		});
	}

	var currentZoom = map.getZoom();
	var overviewZoom = getOverviewZoom();
	if(typeof currentZoom === 'number' && currentZoom > overviewZoom)
		smoothZoomOut(map, currentZoom, overviewZoom, zoomIn);
	else
		zoomIn();
}

function getFocusTargetZoom(bounds) {
	var newZoom;
	if(typeof bounds !== 'undefined')
		newZoom = getZoomByBounds(map, bounds);
	else {
		newZoom = DEFAULT_LOCATE_ZOOM;
		if (typeof accuCircle !== 'undefined') {
			accuCircle.setOptions({'fillOpacity': 0.10});
		}
		if (typeof getCurrentMapLayer === 'function' && getCurrentMapLayer() === MAP_LAYER_OSM && typeof OSM_NATIVE_MAX_ZOOM === 'number' && newZoom > OSM_NATIVE_MAX_ZOOM) {
			newZoom = OSM_NATIVE_MAX_ZOOM;
		}
		else if (typeof getActiveMapTypeMaxZoom === 'function') {
			var typeMax = getActiveMapTypeMaxZoom();
			if (typeof typeMax === 'number' && newZoom > typeMax) {
				newZoom = typeMax;
			}
		}
	}
	return newZoom;
}

function panThenSmoothZoomIn(pos, bounds, skipFinalBoundsFit) {
	panMapForFocus(pos, function() {
		smoothZoomToBounds(bounds, map, getFocusTargetZoom(bounds), map.getZoom(), skipFinalBoundsFit);
	});
}

function focus_(pos, bounds, skipFinalBoundsFit) {

	hideNoCityMessage();
	beginProgrammaticMapFocus();

	var zoomOutFirst = pendingTryCityZoomOut;
	pendingTryCityZoomOut = false;
	var currentZoom = map.getZoom();
	var overviewZoom = getOverviewZoom();
	if(zoomOutFirst && typeof currentZoom === 'number' && currentZoom > overviewZoom) {
		if(typeof infoWindow !== 'undefined' && infoWindow)
			infoWindow.close();
		smoothZoomOut(map, currentZoom, overviewZoom, function() {
			revealHeldTryCityInfoWindow();
			panThenSmoothZoomIn(pos, bounds, skipFinalBoundsFit);
		});
		return;
	}

	if(holdInfoWindowForTryCityZoomOut)
		revealHeldTryCityInfoWindow();
	panThenSmoothZoomIn(pos, bounds, skipFinalBoundsFit);

}

function showMarker(pos) {
	var coordinate = typeof pos.lat === 'function' ? resolveLatLng(pos) : pos;
	if(!marker) {
		var placeMarker = new google.maps.Marker({
			position: pos,
			map: map,
			title: coordinate.lat + " / " + coordinate.lng
		});
		marker = placeMarker;
		placeMarker.addListener('click', function() {
			var entry = getMapPlace(placeMarker);
			if(entry)
				loadMapPlace(entry, false);
		});
	}
	else {
		if(marker.getMap() == null)
			marker.setMap(map);
		marker.setPosition(pos);
		var entry = getMapPlace(marker);
		if(!entry || !entry.result)
			marker.setTitle(coordinate.lat + " / " + coordinate.lng);
	}

	showInfoWindow();
}

function stopZoom() {
	mapFocusGeneration++;
	if(zoomChangedListener != null)
		google.maps.event.removeListener(zoomChangedListener);
	zoomChangedListener = null;
	if(nextZoomTimer != null)
		clearTimeout(nextZoomTimer);
	nextZoomTimer = null;
	if(mapFocusIdleListener != null)
		google.maps.event.removeListener(mapFocusIdleListener);
	mapFocusIdleListener = null;
	pendingFocusPos = null;
	endProgrammaticMapFocus();
}

function cancelMapFocus() {
	selfBoundsChangedCount = 0;
	stopZoom();
	pendingTryCityZoomOut = false;
	if(holdInfoWindowForTryCityZoomOut)
		revealHeldTryCityInfoWindow();
}

// Capture user intent before the SDK changes the camera, including its controls.
function initMapFocusCancellation() {
	var canvas = document.getElementById('map');
	if(!canvas || canvas._woloFocusCancellation)
		return;
	canvas._woloFocusCancellation = true;
	['pointerdown', 'touchstart', 'click', 'dblclick'].forEach(function(name) {
		canvas.addEventListener(name, cancelMapFocus, {capture: true, passive: true});
	});
	initMapPinchWheel(canvas);
	canvas.addEventListener('keydown', function(event) {
		if(typeof isMapSearchTypingTarget === 'function' && isMapSearchTypingTarget(event.target))
			return;
		if(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', '+', '-', '=', 'PageUp', 'PageDown'].indexOf(event.key) >= 0)
			cancelMapFocus();
	}, true);
	map.addListener('dragstart', cancelMapFocus);
}

const MAP_PINCH_WHEEL_GAP_MS = 180;
const MAP_PINCH_REVERSE_THRESHOLD_PX = 12;

function initMapPinchWheel(canvas) {
	var lastPinchTime = -Infinity;
	var direction = 0;
	var reverseDistance = 0;
	canvas.addEventListener('wheel', function(event) {
		cancelMapFocus();
		if(!event.ctrlKey || event.deltaMode !== 0) {
			lastPinchTime = -Infinity;
			return;
		}
		if(!event.deltaY)
			return;

		var nextDirection = Math.sign(event.deltaY);
		var newPinch = event.timeStamp - lastPinchTime >= MAP_PINCH_WHEEL_GAP_MS;
		lastPinchTime = event.timeStamp;
		if(newPinch || nextDirection === direction) {
			direction = nextDirection;
			reverseDistance = 0;
			return;
		}

		// Suppress small reversals before Maps can turn them into a full zoom step.
		reverseDistance += Math.abs(event.deltaY);
		if(reverseDistance < MAP_PINCH_REVERSE_THRESHOLD_PX) {
			event.preventDefault();
			event.stopPropagation();
			return;
		}
		direction = nextDirection;
		reverseDistance = 0;
	}, {capture: true, passive: false});
}

function onMapFocusIdle(action, callback) {
	var generation = mapFocusGeneration;
	var listener = map.addListener('idle', function() {
		google.maps.event.removeListener(listener);
		if(mapFocusIdleListener === listener)
			mapFocusIdleListener = null;
		if(generation === mapFocusGeneration)
			callback();
	});
	mapFocusIdleListener = listener;
	action();
}

function panMapForFocus(pos, callback) {
	var center = map.getCenter();
	var lat = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
	var lng = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
	// A pan to the current center need not emit idle.
	if(center && center.lat() === lat && center.lng() === lng) {
		callback();
		return;
	}
	onMapFocusIdle(function() { map.panTo(pos); }, callback);
}

const ZOOM_ANIMATION_INCREMENT = 1;
const ZOOM_BOUND_PADDING = 36;
var zoomChangedListener;
var nextZoomTimer;
var mapFocusIdleListener;
var mapFocusGeneration = 0;
function finishSmoothZoomToBounds(bounds, map, skipFinalBoundsFit) {
	var generation = mapFocusGeneration;
	zoomChangedListener = google.maps.event.addListener(map, 'zoom_changed', cancelMapFocus);
	nextZoomTimer = setTimeout(function() {
		nextZoomTimer = null;
		if(generation !== mapFocusGeneration)
			return;
		google.maps.event.removeListener(zoomChangedListener);
		zoomChangedListener = null;
		if(skipFinalBoundsFit) {
			if(pendingFocusPos && map) {
				map.panTo(pendingFocusPos);
				pendingFocusPos = null;
			}
			if(typeof applyMapChromePan === 'function')
				applyMapChromePan();
			endProgrammaticMapFocus();
		}
		else if(pendingFocusPos) {
			var temPos = Object.assign({}, pendingFocusPos);
			pendingFocusPos = null;
			focus___(temPos);
		}
		else if(typeof bounds !== 'undefined') {
			onMapFocusIdle(function() { map.fitBounds(bounds, ZOOM_BOUND_PADDING); }, function() {
				applyMapChromePan();
				endProgrammaticMapFocus();
			});
		}
		else {
			endProgrammaticMapFocus();
		}
	}, ZOOM_ANIMATION_SPEED);
}

function smoothZoomOut(map, current, min, onDone) {
	if(typeof getMinZoomToFillMapHeight === 'function')
		min = Math.max(min, getMinZoomToFillMapHeight());
	if (current <= min) {
		if(typeof onDone === 'function')
			onDone();
		return;
	}
	var nextZoom = current - ZOOM_ANIMATION_INCREMENT;
	if(nextZoom < min)
		nextZoom = min;
	scheduleSmoothZoomStep(map, current, nextZoom, function(actual) {
		smoothZoomOut(map, actual, min, onDone);
	});
}

function smoothZoomToBounds(bounds, map, max, current, skipFinalBoundsFit) {
	if (typeof getActiveMapTypeMaxZoom === 'function') {
		var typeMax = getActiveMapTypeMaxZoom();
		if (typeof typeMax === 'number' && max > typeMax)
			max = typeMax;
	}
	if(typeof getMinZoomToFillMapHeight === 'function')
		max = Math.max(max, getMinZoomToFillMapHeight());
	if (current >= max) {
		if(current > max)
			map.setZoom(max);
		finishSmoothZoomToBounds(bounds, map, skipFinalBoundsFit);
		return;
	}
	var nextZoom = current + ZOOM_ANIMATION_INCREMENT;
	if(nextZoom > max)
		nextZoom = max;
	scheduleSmoothZoomStep(map, current, nextZoom, function(actual) {
		smoothZoomToBounds(bounds, map, max, actual, skipFinalBoundsFit);
	});
}

function scheduleSmoothZoomStep(map, current, nextZoom, callback) {
	var generation = mapFocusGeneration;
	var applying = false;
	zoomChangedListener = google.maps.event.addListener(map, 'zoom_changed', function() {
		if(!applying)
			cancelMapFocus();
	});
	nextZoomTimer = setTimeout(function() {
		nextZoomTimer = null;
		if(generation !== mapFocusGeneration)
			return;
		if(map.getZoom() !== current) {
			cancelMapFocus();
			return;
		}
		applying = true;
		map.setZoom(nextZoom);
		var actual = map.getZoom();
		google.maps.event.removeListener(zoomChangedListener);
		zoomChangedListener = null;
		if(generation !== mapFocusGeneration)
			return;
		// Stop on an SDK/provider clamp; never recurse using an assumed zoom.
		if(actual !== nextZoom) {
			stopZoom();
			return;
		}
		callback(actual);
	}, ZOOM_ANIMATION_SPEED);
}

function getZoomByBounds(map, bounds) {
	if(!map || !bounds)
		return typeof DEFAULT_LOCATE_ZOOM === 'number' ? DEFAULT_LOCATE_ZOOM : 18;
	var mapType = (map.mapTypes && typeof map.getMapTypeId === 'function') ? map.mapTypes.get(map.getMapTypeId()) : null;
	var MAX_ZOOM = (mapType && mapType.maxZoom) || DEFAULT_LOCATE_ZOOM;
	var MIN_ZOOM = (mapType && mapType.minZoom) || 0;
	if(typeof getMinZoomToFillMapHeight === 'function') {
		MIN_ZOOM = Math.max(MIN_ZOOM, getMinZoomToFillMapHeight());
	}
	if (typeof getCurrentMapLayer === 'function' && getCurrentMapLayer() === MAP_LAYER_OSM && typeof OSM_NATIVE_MAX_ZOOM === 'number') {
		MAX_ZOOM = Math.min(MAX_ZOOM, OSM_NATIVE_MAX_ZOOM);
	}

	var projection = typeof map.getProjection === 'function' ? map.getProjection() : null;
	if(!projection || typeof projection.fromLatLngToPoint !== 'function')
		return typeof map.getZoom === 'function' && typeof map.getZoom() === 'number' ? map.getZoom() : MAX_ZOOM;

	var ne = projection.fromLatLngToPoint( bounds.getNorthEast() );
	var sw = projection.fromLatLngToPoint( bounds.getSouthWest() );

	var worldCoordWidth = ne.x - sw.x;
	if(worldCoordWidth < 0)
		worldCoordWidth += 256;
	var worldCoordHeight = Math.abs(ne.y-sw.y);
	var canvas = typeof map.getDiv === 'function' ? map.getDiv() : document.body;
	var width = Math.max(1, canvas.clientWidth - 2 * ZOOM_BOUND_PADDING);
	var height = Math.max(1, canvas.clientHeight - 2 * ZOOM_BOUND_PADDING);

	for(var zoom = MAX_ZOOM; zoom >= MIN_ZOOM; --zoom) {
		if( worldCoordWidth*Math.pow(2, zoom) <= width &&
				worldCoordHeight*Math.pow(2, zoom) <= height )
			return zoom;
	}
	return MIN_ZOOM;
}
