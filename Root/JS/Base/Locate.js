// var location_button_begin_time;
// var location_button_PRESS_THRESHOLD = 500;
// var locating = false;
// var locate_button_pressed = false;
// var watch_location_timer;
// var watch_location_id;
// var watch_location_notice_timer;
// var pendingFocusPos;
var WATCH_LOCATION_POOR_ACCURACY = 99.5;
var WATCH_LOCATION_POOR_ACCURACY_STREAK = 5;
var WATCH_LOCATION_POOR_ACCURACY_SAMPLE_MS = 1000;
var poorAccuracyStreak = 0;
var lastWatchAccuracy = NaN;
var lastWatchPos = null;
var lastPoorAccuracySampleAt = 0;
var poorAccuracySampleTimer = 0;

function resetPoorAccuracyStreak() {
	poorAccuracyStreak = 0;
	lastWatchAccuracy = NaN;
	lastWatchPos = null;
	lastPoorAccuracySampleAt = 0;
	stopPoorAccuracySampler();
}

function stopPoorAccuracySampler() {
	if(poorAccuracySampleTimer) {
		clearInterval(poorAccuracySampleTimer);
		poorAccuracySampleTimer = 0;
	}
}

function startPoorAccuracySampler() {
	if(poorAccuracySampleTimer)
		return;
	poorAccuracySampleTimer = setInterval(tickPoorAccuracySample, WATCH_LOCATION_POOR_ACCURACY_SAMPLE_MS);
}

function countPoorAccuracySample() {
	if(!(lastWatchAccuracy >= WATCH_LOCATION_POOR_ACCURACY)) {
		poorAccuracyStreak = 0;
		return false;
	}
	poorAccuracyStreak += 1;
	lastPoorAccuracySampleAt = Date.now();
	return poorAccuracyStreak >= WATCH_LOCATION_POOR_ACCURACY_STREAK;
}

function shouldFastForwardPoorAccuracy(accuracy) {
	lastWatchAccuracy = accuracy;
	if(!(accuracy >= WATCH_LOCATION_POOR_ACCURACY)) {
		poorAccuracyStreak = 0;
		return false;
	}
	return countPoorAccuracySample();
}

function tickPoorAccuracySample() {
	if(typeof locating !== 'undefined' && !locating) {
		stopPoorAccuracySampler();
		return;
	}
	if(!(lastWatchAccuracy >= WATCH_LOCATION_POOR_ACCURACY)) {
		poorAccuracyStreak = 0;
		stopPoorAccuracySampler();
		return;
	}
	if(Date.now() - lastPoorAccuracySampleAt < WATCH_LOCATION_POOR_ACCURACY_SAMPLE_MS - 100)
		return;
	if(countPoorAccuracySample())
		processCurrentWatchPosition();
}

function processCurrentWatchPosition() {
	if(typeof locate_button_pressed !== 'undefined' && locate_button_pressed)
		return;
	if(!lastWatchPos)
		return;
	processPosition(lastWatchPos);
}

function noteWatchAccuracy(accuracy, pos) {
	lastWatchPos = pos || lastWatchPos;
	if(!(accuracy >= WATCH_LOCATION_POOR_ACCURACY)) {
		lastWatchAccuracy = accuracy;
		poorAccuracyStreak = 0;
		stopPoorAccuracySampler();
		return false;
	}
	lastWatchAccuracy = accuracy;
	startPoorAccuracySampler();
	return countPoorAccuracySample();
}

var locateDidFocus = false;
var locateLoaderHeld = false;

function showLocateWatchLoader() {
	if(typeof document === 'undefined' || !document.getElementById)
		return;
	var el = document.getElementById('wait_loader');
	if(el)
		el.classList.remove('hide');
}

function hideLocateWatchLoader() {
	if(!locateLoaderHeld)
		return;
	locateLoaderHeld = false;
	if(typeof popLoader === 'function')
		popLoader();
	else if(typeof document !== 'undefined' && document.getElementById) {
		var el = document.getElementById('wait_loader');
		if(el)
			el.classList.add('hide');
	}
}

function focusLocateWatchPosition(pos) {
	if(!pos)
		return;
	var bounds = (typeof accuCircle !== 'undefined' && accuCircle && typeof accuCircle.getBounds === 'function')
		? accuCircle.getBounds()
		: undefined;
	if(locateDidFocus) {
		pendingFocusPos = pos;
		return;
	}
	hideLocateWatchLoader();
	if(typeof focus_ === 'function')
		focus_(pos, bounds);
	locateDidFocus = true;
}

function initLocate(override_dnd, callback) {
	if(!locationAccessInitCheck()) {
		locateRight_callback = callback;
		showLocateRightMessage(true);
	}
	else if(typeof callback === 'function') {
		callback(function() {
			if(!locationAccessCheck()) {
				var hide_dnd = typeof override_dnd == 'undefined' || override_dnd || !locationAccessDNDstatus();
				if(override_dnd || !locationAccessDNDcheck()) {
					locateRight_callback = callback;
					showLocateRightMessage(hide_dnd);
				}
				else
					popLoader();
			}
		});
	}
}

function locateExec(failure) {
	if(!locating) {
		if(typeof hideAddress == 'function') {
			hideAddress();
		}
		var WATCH_LOCATION_MAX_TIMEOUT = 60000;
		var WATCH_LOCATION_TIMEOUT = 45000;
		var WATCH_LOCATION_NOTICE_TIMEOUT = 5000;

		pushLoader();
		locateLoaderHeld = true;
		showLocateWatchLoader();
		if (navigator.geolocation) {
			locating = true;
			locateDidFocus = false;
			resetPoorAccuracyStreak();
			if(myLocDot)
				myLocDot.setMap(null);
			if(accuCircle)
				accuCircle.setMap(null);
			var watch_location_time_begin = new Date().getTime();
			watch_location_timer = setTimeout(endWatchLocation, WATCH_LOCATION_MAX_TIMEOUT);
			document.getElementById('proceed_container').classList.remove('hide');
			document.getElementById('accuracy_container').classList.remove('hide');
			document.getElementById('proceed_progress').style.transition = 'none';
			document.getElementById('proceed_progress').style.width = "0%";
			document.getElementById('proceed_progress').offsetWidth;
			document.getElementById('proceed_progress').style.transition = 'width' + ' ' + WATCH_LOCATION_MAX_TIMEOUT/1000 + 's' + ' ' + 'linear';
			document.getElementById('proceed_progress').style.width = "100%";
			
			addClassIfPresent(typeof accuracy_indicator == 'undefined' ? null : accuracy_indicator, 'blinking');
			location_button.removeEventListener('mouseup', processPositionButtonUp);
			location_button.removeEventListener('touchend', processPositionButtonTouchEnd);
			location_button.addEventListener('mouseup', processPositionButtonUp);
			location_button.addEventListener('touchend', processPositionButtonTouchEnd);

			watch_location_notice_timer = setTimeout(watch_location_notice, WATCH_LOCATION_NOTICE_TIMEOUT);
			
			watch_location_id = navigator.geolocation.watchPosition(
				
				function(position) {

					var WATCH_LOCATION_MIN_ACCURACY = 10;
					setLocationAccess(true);
					var pos = {
						lat: position.coords.latitude,
						lng: position.coords.longitude
					};
					if(typeof accuCircle === 'undefined' || !accuCircle.getMap()) {
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
						accuCircle.setMap(map);
						accuCircle.setOptions({'fillOpacity': 0.35});
						accuCircle.setCenter(pos);
						accuCircle.setRadius(position.coords.accuracy);
					}
					if(position.coords.accuracy >= WATCH_LOCATION_POOR_ACCURACY) {
						document.getElementById('accuracy_meter').innerText = "99+";
						document.getElementById('accuracy_indicator').setAttribute('style', 'background-color: #FF0000');
					}
					else {
						document.getElementById('accuracy_meter').innerText = Math.round(position.coords.accuracy);
						document.getElementById('accuracy_indicator').setAttribute('style', 'background-color: '+percantageToColor(100-position.coords.accuracy));
					}
					document.getElementById('proceed_container').classList.remove('hide');
					document.getElementById('accuracy_container').classList.remove('highlight');
					document.getElementById('accuracy_container').classList.remove('hide');
					if(!myLocDot) {
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
						if(!myLocDot.getMap())
							myLocDot.setMap(map);
						myLocDot.setPosition(pos);
					}

					focusLocateWatchPosition(pos);
					var fastForwardPoor = noteWatchAccuracy(position.coords.accuracy, pos);
					if(!locate_button_pressed &&
							(position.coords.accuracy <= WATCH_LOCATION_MIN_ACCURACY || fastForwardPoor))
						processPosition(pos);

				},
				function(error) {
					if(error.code = error.PERMISSION_DENIED) {
						clearLocating(true);
						showNotification(LOCATION_PERMISSION_DENIED);
						setLocationAccess(false);
						popLoader();
						failure();
					}
					else
						handleLocationError(true);
				},
				{ maximumAge:100, timeout:WATCH_LOCATION_TIMEOUT, enableHighAccuracy:true }
				
			);
		} else {
			// Browser does not support Geolocation
			handleLocationError(false);
		}
	}
}

function endWatchLocation() {
	if(!locate_button_pressed) {
		var pos;
		if(myLocDot)
			pos = resolveLatLng(myLocDot.getPosition());
		if(pos != null)
			processPosition(pos);
		else
			showNotification("Could not get your location.<br> Please move to a more open area and try again by pressing the location icon", NOTIFICATION_DURATION_LONG);
	}
}

function proceedPosition() {
	var pos;
	if(myLocDot)
		pos = resolveLatLng(myLocDot.getPosition());
	if(pos != null) {
		if(!selfBoundsChangedCount) {
			map.panTo(pos);
			var idleListenerPanBy = map.addListener('idle', function() {
					idleListenerPanBy.remove();
					applyMapChromePan();
				});
		}
		processPosition(pos);
	}
	else
		handleLocationError(true);
}

function processPosition(pos) {
	clearLocating(false);
	if(typeof navigator.geolocation !== 'undefined')
		navigator.geolocation.clearWatch(watch_location_id);
	clearTimeout(watch_location_timer);
	document.getElementById('proceed_container').classList.add('hide');
	document.getElementById('accuracy_container').classList.add('highlight');
	infoWindow_setContent(MESSAGE_LOADING);
	showMarker(pos);
	infoWindow.open(map, marker);
	if(initWCode == false) {
		encode(pos, true);
		clearAddress();
		getAddress(pos);
	}
	else {
		initWCode = false;
	}
	
}

function processPositionButtonDown() {
	armPositionButtonReleaseHandlers();
	firstFocus = true;
	if(typeof hideAddress == 'function') {
		hideAddress();
	}
	clearMap();
	if(typeof ensureMapViewForLocation == 'function')
		ensureMapViewForLocation();
	if(typeof closeActionMenu == 'function')
		closeActionMenu();
	selfBoundsChangedCount = 1;
	locate_button_pressed = true;
	location_button_begin_time = (new Date).getTime();
	syncLocate(true);
}

function processPositionButtonUp() {
	var press_duration = locating && (new Date).getTime() - location_button_begin_time;
	var location_dot = typeof location_icon_dot == 'undefined' ? null : location_icon_dot;
	if(!(press_duration > location_button_PRESS_THRESHOLD && addClassIfPresent(location_dot, 'blinking')))
		locate_button_pressed = false;
	disarmPositionButtonReleaseHandlers();
}

function processPositionButtonCancel() {
	locate_button_pressed = false;
	disarmPositionButtonReleaseHandlers();
}

function armPositionButtonReleaseHandlers() {
	disarmPositionButtonReleaseHandlers();
	document.addEventListener('mouseup', processPositionButtonUp);
	document.addEventListener('touchend', processPositionButtonUp);
	document.addEventListener('touchcancel', processPositionButtonCancel);
}

function disarmPositionButtonReleaseHandlers() {
	document.removeEventListener('mouseup', processPositionButtonUp);
	document.removeEventListener('touchend', processPositionButtonUp);
	document.removeEventListener('touchcancel', processPositionButtonCancel);
}

function processPositionButtonTouchStart(e) {
	processPositionButtonDown();
	e.stopPropagation(); 
	e.preventDefault();
}

function processPositionButtonTouchEnd(e) {
	processPositionButtonUp();
	e.stopPropagation(); 
	e.preventDefault();
}

function handleLocationError(browserHasGeolocation) {
	cleanUp();
	showNotification(browserHasGeolocation ?
												'Error: The Geolocation service failed' :
												'Error: Your browser doesn\'t support geolocation');
	notification_top.classList.remove('hide');
	syncCheckIncompatibleBrowserMessage();
}

function clearLocating(hideAccuracyContainer) {
	if(hideAccuracyContainer)
		document.getElementById('accuracy_container').classList.add('hide');
	locating = false;
	resetPoorAccuracyStreak();
	hideLocateWatchLoader();
	removeClassIfPresent(typeof location_icon_dot == 'undefined' ? null : location_icon_dot, 'blinking');
	removeClassIfPresent(typeof accuracy_indicator == 'undefined' ? null : accuracy_indicator, 'blinking');
	hideNotication();
	clearTimeout(watch_location_notice_timer);
	disarmPositionButtonReleaseHandlers();
}

function addClassIfPresent(element, className) {
	if(typeof element == 'undefined' || !element || !element.classList)
		return false;
	element.classList.add(className);
	return true;
}

function removeClassIfPresent(element, className) {
	if(typeof element == 'undefined' || !element || !element.classList)
		return false;
	element.classList.remove(className);
	return true;
}

function watch_location_notice() {
	var wait_duration;
	if(firstFocus == true) {
		notification_duration = NOTIFICATION_DURATION_LONG;
		firstFocus = false;
	}
	else
		notification_duration = NOTIFICATION_DURATION_DEFAULT;
	showNotification('Getting more accurate location <br> wait for a minute or choose "Proceed"', notification_duration);
}

function getCityFromPositionViaGMap(position, callback_success, callback_failure) {
	encode_session_id = Date.now();
	var session_id = encode_session_id;
	getAddress( {'lat':position.coords.latitude, 'lng':position.coords.longitude}, session_id, function(address_components) {
			var city_gp_id = getCityGpId(address_components);
			if(city_gp_id != null) {
				getCityFromCityGp_id( city_gp_id, session_id, function(city) {
						current_city_gp_id = city_gp_id;
						setCurrentCity_status(true);
						callback_success(city);
				}, callback_failure );
			}
			else if(typeof callback_failure == 'function')
				callback_failure();
	} );
}

function isBadGeoPosition(pos) {
	if(!pos || !pos.coords)
		return true;

	var c = pos.coords;

	return (
		!isFiniteGeoCoordinate(c.latitude) ||
		!isFiniteGeoCoordinate(c.longitude) ||
		(c.latitude === 0 && c.longitude === 0) ||
		c.accuracy === 0
	);
}

function isFiniteGeoCoordinate(value) {
	return typeof value == 'number' && isFinite(value);
}

function getCoarseLocation(success, failure) {
	if(!navigator.geolocation)
		return failCoarseLocation(failure, "unsupported");
	if(navigator.userActivation && !navigator.userActivation.isActive) {
		return failCoarseLocation(failure, {
			code: "USER_GESTURE_REQUIRED",
			message: "Geolocation must be requested from a user gesture"
		});
	}

	navigator.geolocation.getCurrentPosition(
		function(pos) {
			if(isBadGeoPosition(pos)) {
				return failCoarseLocation(failure, {
					code: "INVALID_POSITION",
					message: "Browser returned 0,0 with zero accuracy"
				});
			}

			success(pos);
		},
		failure,
		{
			enableHighAccuracy: false,
			timeout: 10000,
			maximumAge: 0
		}
	);
}

function failCoarseLocation(failure, reason) {
	if(typeof failure == 'function')
		return failure(reason);
}
