function syncInitMap() {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof initMap == 'function' && pendingInitMap) {
		initMap();
		pendingInitMap = false;
	}
}
