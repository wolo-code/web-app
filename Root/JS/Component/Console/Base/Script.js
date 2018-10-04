function syncMarkEntry(lat_lng) {
	if (typeof google === 'object' && typeof google.maps === 'object' && typeof map == 'object') {
		map.panTo(lat_lng);
		showEntryMarker(lat_lng);
	}
	else
		pendingEntry_lat_lng = lat_lng;
}
