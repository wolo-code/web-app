// var pendingLocate;
function syncLocate(override_dnd) {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof map == 'object') {
		initLocate(override_dnd, locateExec);
		pendingLocate = false;
	}
	else
		pendingLocate = true;
}

function syncCheckIncompatibleBrowserMessage() {
	if(typeof UMB === 'object' && UMB.getStatus() == 'unsupported')
		showIncompatibleBrowserMessage();
}
