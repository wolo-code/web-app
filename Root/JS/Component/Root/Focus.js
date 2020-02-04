function focus__(city, pos, code) {
	focus___(pos);
	setCode(city, code, pos);
}

function focus___(pos, bounds) {
	showMarker(pos);
	focus_(pos, bounds);
}

const ZOOM_ANIMATION_SPEED = 250;
var firstFocus = true;
var userInteractionMapBoundsListener;
var userInteractionMapDragListener;
function focus_(pos, bounds) {

	hideNoCityMessage();

	map.panTo(pos);

	var idleListenerPan = map.addListener('idle', function() {
		idleListenerPan.remove();
		var newZoom;
		if(typeof bounds !== 'undefined')
			newZoom = getZoomByBounds(map, bounds);
		else {
			newZoom = DEFAULT_LOCATE_ZOOM;
			if (typeof accuCircle !== 'undefined') {
				accuCircle.setOptions({'fillOpacity': 0.10});
			}
		}
		smoothZoomToBounds(bounds, map, newZoom, map.getZoom());
	});

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
		marker.setPosition(pos);
	}

	if(marker.getMap() == null)
		marker.setMap(map);
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
	if(userInteractionMapBoundsListener != null)
		userInteractionMapBoundsListener.remove();
	if(userInteractionMapDragListener != null)
		userInteractionMapDragListener.remove();
	if(zoomChangedListener != null)
		google.maps.event.removeListener(zoomChangedListener);
	if(nextZoomTimer != null)
		clearTimeout(nextZoomTimer);
}

const ZOOM_ANIMATION_INCREMENT = 1;
const ZOOM_BOUND_PADDING = 36;
var smoothZoomToBounds_callCount = 0;
var zoomChangedListener;
var nextZoomTimer;
function smoothZoomToBounds(bounds, map, max, current) {
	if (current >= max) {
		if(smoothZoomToBounds_callCount-- == 0) {
			if(typeof bounds !== 'undefined')
				setTimeout(function() {
					if(pendingFocusPos) {
						var temPos = new Object.create(pendingFocusPos);
						pendingFocusPos = null;
						focus___(temPos);
					}
					else {
						if(decMapInteractionCounter) {
							map.fitBounds(bounds, ZOOM_BOUND_PADDING);
							map.panBy(0, getPanByOffset());
						}
					}
				}, ZOOM_ANIMATION_SPEED);
		}
		return;
	}
	else {
		smoothZoomToBounds_callCount++;
		zoomChangedListener = google.maps.event.addListener(map, 'zoom_changed', function(event) {
			google.maps.event.removeListener(zoomChangedListener);
			incMapInteractionCounter();
			smoothZoomToBounds(bounds, map, max, current + ZOOM_ANIMATION_INCREMENT);
		});
		nextZoomTimer = setTimeout(function() {
			if(decMapInteractionCounter()) {
				map.setZoom(current);
			}
		}, ZOOM_ANIMATION_SPEED);
	}
}

function getZoomByBounds(map, bounds) {
	var MAX_ZOOM = map.mapTypes.get(map.getMapTypeId()).maxZoom || DEFAULT_LOCATE_ZOOM;
	var MIN_ZOOM = map.mapTypes.get(map.getMapTypeId()).minZoom || 0;

	var ne = map.getProjection().fromLatLngToPoint( bounds.getNorthEast() );
	var sw = map.getProjection().fromLatLngToPoint( bounds.getSouthWest() );

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
