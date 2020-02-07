// var location_button_begin_time;
// var location_button_PRESS_THRESHOLD = 500;
// var locating = false;
// var locate_button_pressed = false;
// var watch_location_timer;
// var watch_location_id;
// var watch_location_notice_timer;
// var pendingFocusPos;

function initLocate(override_dnd) {
	if(!locationAccessInitCheck())
		showLocateRightMessage(true);
	else
		locateExec(function() {
			if(!locationAccessCheck()) {
				var hide_dnd = typeof override_dnd == 'undefined' || override_dnd || !locationAccessDNDstatus();
				if(override_dnd || !locationAccessDNDcheck()) {
					showLocateRightMessage(hide_dnd);
				}
				else
					wait_loader.classList.add('hide');
			}
		});
}

function locateExec(failure) {
	if(!locating) {
		var WATCH_LOCATION_MAX_TIMEOUT = 60000;
		var WATCH_LOCATION_TIMEOUT = 45000;
		var WATCH_LOCATION_NOTICE_TIMEOUT = 5000;

		wait_loader.classList.remove('hide');
		if (navigator.geolocation) {
			locating = true;
			var watch_location_time_begin = new Date().getTime();
			watch_location_timer = setTimeout(endWatchLocation, WATCH_LOCATION_MAX_TIMEOUT);
			
			accuracy_indicator.classList.add('blinking');
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
					if(typeof accuCircle === 'undefined') {
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
						accuCircle.setOptions({'fillOpacity': 0.35});
						accuCircle.setCenter(pos);
						accuCircle.setRadius(position.coords.accuracy);
					}
					if(position.coords.accuracy >= 99.5) {
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
					if(!firstFocus || !myLocDot)
						focus_(pos, accuCircle.getBounds());
					else
						pendingFocusPos = pos;
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
						myLocDot.setPosition(pos);
					}

					if(position.coords.accuracy <= WATCH_LOCATION_MIN_ACCURACY && !locate_button_pressed)
						processPosition(pos);

				},
				function(error) {
					if(error.code = error.PERMISSION_DENIED) {
						clearTimeout(watch_location_timer);
						showNotification(LOCATION_PERMISSION_DENIED);
						setLocationAccess(false);
						wait_loader.classList.add('hide');
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
					map.panBy(0, getPanByOffset());
				});
		}
		processPosition(pos);
	}
	else
		handleLocationError(true);
}

function processPosition(pos) {
	clearLocating(false);
	navigator.geolocation.clearWatch(watch_location_id);
	clearTimeout(watch_location_timer);
	document.getElementById('proceed_container').classList.add('hide');
	document.getElementById('accuracy_container').classList.add('highlight');
	showMarker(pos);
	infoWindow_setContent(MESSAGE_LOADING);
	infoWindow.open(map, marker);
	if(initWCode == false) {
		encode(pos);
		clearAddress();
		getAddress(pos);
	}
	else {
		initWCode = false;
	}
	
}

function processPositionButtonDown() {
	firstFocus = true;
	clearMap();
	selfBoundsChangedCount = 1;
	locate_button_pressed = true;
	location_button_begin_time = (new Date).getTime();
	syncLocate(true);
}

function processPositionButtonUp() {
	var press_duration = locating && (new Date).getTime() - location_button_begin_time;
	if(press_duration > location_button_PRESS_THRESHOLD) {
		location_icon_dot.classList.add('blinking');
	}
	else
		locate_button_pressed = false;
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
	clearLocating(true);
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
	wait_loader.classList.add('hide');
	location_icon_dot.classList.remove('blinking');
	accuracy_indicator.classList.remove('blinking');
	hideNotication();
	clearTimeout(watch_location_notice_timer);
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
