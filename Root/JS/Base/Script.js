var pendingLocate = false;

function syncInitMap() {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof initMap == 'function') {
		initMap();
		if(pendingLocate)
			syncLocate();
	}
}

function syncCheckIncompatibleBrowserMessage() {
	if(UMB.getStatus() == 'unsupported')
		showIncompatibleBrowserMessage();
}
