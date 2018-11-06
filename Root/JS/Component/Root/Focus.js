function focus__(pos, code) {
	focus_(pos);
	setWcode(code, pos);
}

const ZOOM_ANIMATION_SPEED = 250;
var firstFocus = true;
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

	map.panTo(pos);
	map.panBy(0, getPanByOffset());
	
	var idleListenerPan = map.addListener('idle', function() {
		idleListenerPan.remove();
		var newZoom;
		if(typeof bounds !== 'undefined') {
			newZoom = getZoomByBounds(map, bounds);
		}
		else {
			newZoom = DEFAULT_LOCATE_ZOOM;
			if (typeof accuCircle !== 'undefined') {
				accuCircle.setOptions({'fillOpacity': 0.10});
			}
		}
		if(firstFocus == true) {
			smoothZoomToBounds(bounds, map, newZoom, map.getZoom());
			firstFocus = false;
		}
	});
	
	infoWindow_setContent(MESSAGE_LOADING);
	infoWindow.open(map, marker);
	infoWindow_open = true;

}

const ZOOM_ANIMATION_INCREMENT = 1;
const ZOOM_BOUND_PADDING = 36;
function smoothZoomToBounds(bounds, map, max, current) {
	if (current >= max) {
		return;
	}
	else {
		var z = google.maps.event.addListener(map, 'zoom_changed', function(event) {
			google.maps.event.removeListener(z);
			smoothZoomToBounds(bounds, map, max, current + ZOOM_ANIMATION_INCREMENT);
		});
		setTimeout(function() {
			map.setZoom(current);
			if (current+ZOOM_ANIMATION_INCREMENT >= max) {
				if(typeof bounds !== 'undefined')
					setTimeout(function() {
							map.fitBounds(bounds, ZOOM_BOUND_PADDING);
					}, ZOOM_ANIMATION_SPEED);			
			}
		}, ZOOM_ANIMATION_SPEED);
	}
}

function getZoomByBounds( map, bounds ) {
	var MAX_ZOOM = map.mapTypes.get(map.getMapTypeId()).maxZoom || DEFAULT_LOCATE_ZOOM;
	var MIN_ZOOM = map.mapTypes.get(map.getMapTypeId()).minZoom || 0;

	var ne = map.getProjection().fromLatLngToPoint( bounds.getNorthEast() );
	var sw = map.getProjection().fromLatLngToPoint( bounds.getSouthWest() ); 

	var worldCoordWidth = Math.abs(ne.x-sw.x);
	var worldCoordHeight = Math.abs(ne.y-sw.y);

	var FIT_PAD = 10;

	for(var zoom = MAX_ZOOM; zoom >= MIN_ZOOM; --zoom) { 
		if( worldCoordWidth*(1<<zoom)+2*FIT_PAD < document.getElementById('map').scrollWidth && 
				worldCoordHeight*(1<<zoom)+2*FIT_PAD < document.getElementById('map').scrollHeight )
			return zoom;
	}
	return 0;
}
