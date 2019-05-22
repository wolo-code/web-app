function initLocate(override_dnd) {
	if(!locationAccessCheck()) {
		var hide_dnd = override_dnd || !locationAccessDNDstatus();
		if(override_dnd || !locationAccessDNDcheck()) {
			showLocateRightMessage(hide_dnd);
		}
		else
			wait_loader.classList.add('hide');
	}
	else
		locateExec();
}

function locateExec() {
	wait_loader.classList.remove('hide');
	if (navigator.geolocation) {
		wait_loader.classList.add('hide');
		navigator.geolocation.getCurrentPosition(
			function(position) {

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

				if(typeof myLocDot === 'undefined') {
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
				if(initWCode == false) {
					focus_(pos, accuCircle.getBounds());
					encode(pos);
					clearAddress();
					getAddress(pos);
				}
				else {
					initWCode = false;
				}

			},
			function(error) {
				if(error.code = error.PERMISSION_DENIED) {
					showNotification(LOCATION_PERMISSION_DENIED);
					setLocationAccess(false);
					wait_loader.classList.add('hide');
				}
				else
					handleLocationError(true, infoWindow, map.getCenter());
			},
			{ maximumAge:10000, timeout:5000, enableHighAccuracy:true }
		);
	} else {
		// Browser doesn't support Geolocation
		handleLocationError(false, infoWindow, map.getCenter());
	}
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	showNotification(browserHasGeolocation ?
												'Error: The Geolocation service failed' :
												'Error: Your browser doesn\'t support geolocation');
	notification_top.classList.remove('hide');
	syncCheckIncompatibleBrowserMessage();
}
