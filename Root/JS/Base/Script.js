var pendingLocate = false;

function syncInitMap() {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof initMap == 'function') {
		initMap();
		if(pendingLocate)
			syncLocate();
	}
}

function syncLocate(override_dnd) {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof map == 'object') {
		initLocate(override_dnd);
		pendingLocate = false;
	}
	else
		pendingLocate = true;
}

function syncCheckIncompatibleBrowserMessage() {
	if(UMB.getStatus() == 'unsupported')
		showIncompatibleBrowserMessage();
}
