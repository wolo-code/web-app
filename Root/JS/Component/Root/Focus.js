function focus__(city, pos, code) {
	if(typeof ensureMapViewForLocation == 'function') {
		ensureMapViewForLocation();
	}
	focus___(pos);
	setCode(city, code, pos);
}

function focus___(pos, bounds) {
	showMarker(pos);
	focus_(pos, bounds);
}

const ZOOM_ANIMATION_SPEED = 250;
var firstFocus = true;
function beginProgrammaticMapFocus() {
	programmaticMapFocus = true;
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
	stopZoom();

	function zoomIn() {
		map.panTo(pos);
		var idleListenerPan = map.addListener('idle', function() {
			idleListenerPan.remove();
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

function panThenSmoothZoomIn(pos, bounds) {
	map.panTo(pos);
	var idleListenerPan = map.addListener('idle', function() {
		idleListenerPan.remove();
		smoothZoomToBounds(bounds, map, getFocusTargetZoom(bounds), map.getZoom());
	});
}

function focus_(pos, bounds) {

	hideNoCityMessage();
	beginProgrammaticMapFocus();
	stopZoom();

	var zoomOutFirst = pendingTryCityZoomOut;
	pendingTryCityZoomOut = false;
	var currentZoom = map.getZoom();
	var overviewZoom = getOverviewZoom();
	if(zoomOutFirst && typeof currentZoom === 'number' && currentZoom > overviewZoom) {
		if(typeof infoWindow !== 'undefined' && infoWindow)
			infoWindow.close();
		smoothZoomOut(map, currentZoom, overviewZoom, function() {
			revealHeldTryCityInfoWindow();
			panThenSmoothZoomIn(pos, bounds);
		});
		return;
	}

	if(holdInfoWindowForTryCityZoomOut)
		revealHeldTryCityInfoWindow();
	panThenSmoothZoomIn(pos, bounds);

}

function showMarker(pos) {
	if(!marker) {
		marker = new google.maps.Marker({
			position: pos,
			map: map,
			title: pos.lat + " / " + pos.lng
		});
		marker.addListener('click', function() {
			if(!isInfoWindowOpen())
				infoWindow.open(map, marker);
			else
				infoWindow.close();
		});
	}
	else {
		if(marker.getMap() == null)
			marker.setMap(map);
		marker.setPosition(pos);
	}

	showInfoWindow();
}

function incMapInteractionCounter() {
	if (selfBoundsChangedCount == 0)
		stopZoom();
	else
		selfBoundsChangedCount--;
}

function decMapInteractionCounter() {
	if(selfBoundsChangedCount == 0) {
		stopZoom();
		return false;
	}
	else {
		selfBoundsChangedCount++;
		return true;
	}
}

function stopZoom() {
	if(zoomChangedListener != null)
		google.maps.event.removeListener(zoomChangedListener);
	zoomChangedListener = null;
	if(nextZoomTimer != null)
		clearTimeout(nextZoomTimer);
	nextZoomTimer = null;
}

const ZOOM_ANIMATION_INCREMENT = 1;
const ZOOM_BOUND_PADDING = 36;
var zoomChangedListener;
var nextZoomTimer;
function finishSmoothZoomToBounds(bounds, map) {
	if(typeof bounds !== 'undefined')
		setTimeout(function() {
			if(pendingFocusPos) {
				var temPos = Object.assign({}, pendingFocusPos);
				pendingFocusPos = null;
				focus___(temPos);
			}
			else {
				map.fitBounds(bounds, ZOOM_BOUND_PADDING);
				var idleListenerPanBy = map.addListener('idle', function() {
						idleListenerPanBy.remove();
						applyMapChromePan();
						endProgrammaticMapFocus();
					});
			}
		}, ZOOM_ANIMATION_SPEED);
	else
		endProgrammaticMapFocus();
}

function smoothZoomOut(map, current, min, onDone) {
	if (current <= min) {
		if(typeof onDone === 'function')
			onDone();
		return;
	}
	var nextZoom = current - ZOOM_ANIMATION_INCREMENT;
	if(nextZoom < min)
		nextZoom = min;
	zoomChangedListener = google.maps.event.addListener(map, 'zoom_changed', function(event) {
		google.maps.event.removeListener(zoomChangedListener);
		zoomChangedListener = null;
		incMapInteractionCounter();
		smoothZoomOut(map, nextZoom, min, onDone);
	});
	nextZoomTimer = setTimeout(function() {
		if(decMapInteractionCounter()) {
			map.setZoom(nextZoom);
		}
	}, ZOOM_ANIMATION_SPEED);
}

function smoothZoomToBounds(bounds, map, max, current) {
	if (typeof getActiveMapTypeMaxZoom === 'function') {
		var typeMax = getActiveMapTypeMaxZoom();
		if (typeof typeMax === 'number' && max > typeMax)
			max = typeMax;
	}
	if (current >= max) {
		if(current > max)
			map.setZoom(max);
		finishSmoothZoomToBounds(bounds, map);
		return;
	}
	var nextZoom = current + ZOOM_ANIMATION_INCREMENT;
	if(nextZoom > max)
		nextZoom = max;
	zoomChangedListener = google.maps.event.addListener(map, 'zoom_changed', function(event) {
		google.maps.event.removeListener(zoomChangedListener);
		zoomChangedListener = null;
		incMapInteractionCounter();
		smoothZoomToBounds(bounds, map, max, nextZoom);
	});
	nextZoomTimer = setTimeout(function() {
		if(decMapInteractionCounter()) {
			map.setZoom(nextZoom);
		}
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

	var worldCoordWidth = Math.abs(ne.x-sw.x)/2;
	var worldCoordHeight = Math.abs(ne.y-sw.y)/2;

	var FIT_PAD = 10;

	for(var zoom = MAX_ZOOM; zoom >= MIN_ZOOM; --zoom) {
		if( worldCoordWidth*(1<<zoom)+2*FIT_PAD < document.body.scrollWidth &&
				worldCoordHeight*(1<<zoom)+2*FIT_PAD < document.body.scrollHeight )
			return zoom;
	}
	return 0;
}
