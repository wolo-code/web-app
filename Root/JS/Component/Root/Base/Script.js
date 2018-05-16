function syncInitMap() {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof initMap == 'function' && pendingInitMap) {
		initMap();
		pendingInitMap = false;
		if(pendingLocate)
			syncLocate();
	}
}

var pendingLocate = true;
function syncLocate(override_dnd) {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof map == 'object') {
		initLocate(override_dnd);
		pendingLocate = false;
	}
	else
		pendingLocate = true;
}

function syncCheckIncompatibleBrowserMessage() {
	if(typeof UMB === 'object' && UMB.getStatus() == 'unsupported')
		showIncompatibleBrowserMessage();
}

