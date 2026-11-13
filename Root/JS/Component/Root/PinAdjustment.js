var mapPinProjectionOverlay;
var mapPinCrosshair;
var MAP_PIN_NUDGES = {
	ArrowLeft: [-1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowRight: [1, 0]
};

function initMapPinAdjustment() {
	var panel = document.getElementById('map_pin_adjustment');
	mapPinCrosshair = document.createElement('div');
	mapPinCrosshair.className = 'map_pin_crosshair';
	mapPinCrosshair.setAttribute('aria-hidden', 'true');
	mapPinCrosshair.hidden = true;
	map.getDiv().parentElement.append(mapPinCrosshair);

	mapPinProjectionOverlay = new google.maps.OverlayView();
	mapPinProjectionOverlay.onAdd = function() {};
	mapPinProjectionOverlay.draw = drawMapPinCrosshair;
	mapPinProjectionOverlay.onRemove = function() {};
	mapPinProjectionOverlay.setMap(map);

	mapPinCrosshair.addEventListener('pointerdown', function(event) {
		if(!mapPinAdjustment || !event.isPrimary || event.button !== 0) return;
		var pixel = getMapPinDraftPixel();
		if(!pixel) return;
		event.preventDefault();
		mapPinCrosshair.setPointerCapture(event.pointerId);
		mapPinAdjustment.drag = {
			id: event.pointerId,
			x: pixel.x - event.clientX,
			y: pixel.y - event.clientY
		};
	});
	mapPinCrosshair.addEventListener('pointermove', function(event) {
		var drag = mapPinAdjustment && mapPinAdjustment.drag;
		if(drag && drag.id === event.pointerId)
			moveMapPinDraft(event.clientX + drag.x, event.clientY + drag.y);
	});
	mapPinCrosshair.addEventListener('lostpointercapture', function(event) {
		var drag = mapPinAdjustment && mapPinAdjustment.drag;
		if(drag && drag.id === event.pointerId) mapPinAdjustment.drag = null;
	});
	panel.querySelectorAll('[data-nudge]').forEach(function(button) {
		button.addEventListener('click', function() { nudgeMapPin(button.dataset.nudge); });
	});
	document.getElementById('map_pin_cancel').addEventListener('click', function() { finishMapPinAdjustment(); });
	document.getElementById('map_pin_apply').addEventListener('click', applyMapPinAdjustment);
	document.addEventListener('keydown', function(event) {
		if(!mapPinAdjustment || event.altKey || event.ctrlKey || event.metaKey || getVisibleOverlayDialog()) return;
		if(event.key === 'Escape' || (Object.hasOwn(MAP_PIN_NUDGES, event.key) && !isMapSearchTypingTarget(event.target))) {
			event.preventDefault();
			event.stopImmediatePropagation();
			if(event.key === 'Escape') finishMapPinAdjustment();
			else nudgeMapPin(event.key);
		}
	}, true);
}

function getMapPlaceAtPixel(projection, pixel) {
	var nearest;
	var closest = Infinity;
	mapPlaces.forEach(function(entry) {
		if(!entry.marker.getVisible()) return;
		var point = projection.fromLatLngToContainerPixel(entry.marker.getPosition());
		if(!point) return;
		var dx = pixel.x - point.x;
		var dy = pixel.y - point.y;
		// The clickable marker sits above its geographic anchor.
		var height = entry.marker.getIcon()?.scaledSize?.height || 34;
		if(Math.abs(dx) > 15 || dy > 5 || dy < -height) return;
		var distance = Math.hypot(dx, dy + height / 2);
		if(distance < closest) {
			closest = distance;
			nearest = entry;
		}
	});
	return nearest;
}

function bindMapPlaceMarker(placeMarker, onClick) {
	var timer;
	function cancelHold() { clearTimeout(timer); }
	placeMarker.addListener('mousedown', function(event) {
		var domEvent = event && event.domEvent;
		if(!domEvent || domEvent.button !== 0 || domEvent.pointerType === 'touch' ||
			domEvent.sourceCapabilities?.firesTouchEvents || mapPinAdjustment) return;
		cancelHold();
		timer = setTimeout(function() {
			if(!mapDragClickGuard && startMapPinAdjustment(getMapPlace(placeMarker))) mapHoldClickUntil = Date.now() + 1000;
		}, 500);
	});
	placeMarker.addListener('mouseup', cancelHold);
	placeMarker.addListener('mouseout', cancelHold);
	placeMarker.addListener('click', function(event) {
		cancelHold();
		if(!mapPinAdjustment && Date.now() >= mapHoldClickUntil) onClick(event);
	});
}

function startMapPinAdjustment(entry) {
	if(!entry || !mapPlaces.includes(entry) || mapPinAdjustment || !mapPinProjectionOverlay?.getProjection() ||
		document.body.classList.contains('decode')) return false;

	var pin = entry.marker;
	var position = pin.getPosition();
	mapPinAdjustment = {
		entry: entry,
		original: position,
		position: position,
		visible: pin.getVisible(),
		previousFocus: document.activeElement
	};
	// Suppress automatic movement before hiding any of the map chrome.
	if(typeof locating !== 'undefined' && locating) clearLocating(true);
	stopZoom();
	pendingTryCityZoomOut = false;
	holdInfoWindowForTryCityZoomOut = false;
	pin.setVisible(false);
	document.body.classList.add('map_pin_adjusting');
	document.getElementById('map_pin_adjustment').hidden = false;
	document.getElementById('map_pin_apply').focus({preventScroll: true});
	drawMapPinCrosshair();
	return true;
}

function getMapPinDraftPixel() {
	return mapPinProjectionOverlay.getProjection()?.fromLatLngToContainerPixel(mapPinAdjustment.position);
}

function drawMapPinCrosshair() {
	if(!mapPinAdjustment) return;
	var pixel = getMapPinDraftPixel();
	var surface = map.getDiv();
	mapPinCrosshair.hidden = !pixel || pixel.x < 0 || pixel.x >= surface.clientWidth || pixel.y < 0 || pixel.y >= surface.clientHeight;
	if(!mapPinCrosshair.hidden) {
		mapPinCrosshair.style.left = pixel.x + 'px';
		mapPinCrosshair.style.top = pixel.y + 'px';
	}
}

function moveMapPinDraft(x, y) {
	var surface = map.getDiv();
	var pixel = new google.maps.Point(
		Math.max(0, Math.min(x, surface.clientWidth - 1)),
		Math.max(0, Math.min(y, surface.clientHeight - 1))
	);
	var position = mapPinProjectionOverlay.getProjection()?.fromContainerPixelToLatLng(pixel);
	if(!position) return;
	mapPinAdjustment.position = position;
	drawMapPinCrosshair();
}

function nudgeMapPin(key) {
	if(!mapPinAdjustment || mapPinCrosshair.hidden) return;
	var pixel = getMapPinDraftPixel();
	var offset = MAP_PIN_NUDGES[key];
	if(pixel) moveMapPinDraft(pixel.x + offset[0], pixel.y + offset[1]);
}

function finishMapPinAdjustment(restoreFocus = true) {
	var adjustment = mapPinAdjustment;
	mapPinAdjustment = null;
	if(adjustment.drag && mapPinCrosshair.hasPointerCapture(adjustment.drag.id))
		mapPinCrosshair.releasePointerCapture(adjustment.drag.id);
	adjustment.entry.marker.setVisible(adjustment.visible);
	mapPinCrosshair.hidden = true;
	document.body.classList.remove('map_pin_adjusting');
	document.getElementById('map_pin_adjustment').hidden = true;
	if(restoreFocus) {
		var target = adjustment.previousFocus;
		if(!target?.isConnected || target === document.body) target = map.getDiv();
		target.focus({preventScroll: true});
	}
}

function applyMapPinAdjustment() {
	if(!mapPinAdjustment) return;
	var adjustment = mapPinAdjustment;
	var changed = adjustment.original.lat() !== adjustment.position.lat() || adjustment.original.lng() !== adjustment.position.lng();
	finishMapPinAdjustment(!changed);
	if(!changed) return;

	var entry = adjustment.entry;
	// A closed card still has a place in the route. Preserve its marker on selection change.
	if(entry.marker !== marker && !isInfoWindowOpen()) marker = null;
	if(entry.card) activateMapCard(entry.card);
	else if(entry.marker !== marker) {
		cleanUp(false, true);
		marker = entry.marker;
	}
	keepAdjustedPinCamera = true;
	mapSelectionVersion++;
	mapFitPlacesSelectionVersion = null;
	current_address = null;
	current_address_lines = null;
	chooseCity_by_periphery_List = null;
	chooseCity_by_periphery_gpid = null;
	chooseCity_by_periphery_Callback = null;
	clearAddress();
	var position = resolveLatLng(adjustment.position);
	latLng_p = position;
	refreshAddress();
	delete entry.routeCode;
	// An adjusted search result has its own coordinates and description.
	entry.name = null;
	if(marker.getIcon()) marker.setIcon(null);
	marker.setTitle(position.lat + ' / ' + position.lng);
	if(infoWindow) infoWindow.setOptions({disableAutoPan: true});
	marker.setPosition(position);
	infoWindow_setContent(MESSAGE_LOADING);
	showInfoWindow();
	renderMapPlaces();
	map.getDiv().focus({preventScroll: true});
	encode(position);
}
