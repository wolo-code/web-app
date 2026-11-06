var ClickEventHandler = function(map) {
	var placesLib = typeof getGooglePlacesLibrary == 'function' ? getGooglePlacesLibrary() : null;
	this.map = map;
	this.placesService = (placesLib && placesLib.PlacesService) ? new placesLib.PlacesService(map) : null;
	this.map.addListener('click', this.handleClick.bind(this));
};

ClickEventHandler.prototype.handleClick = function(event) {
	if(typeof isIgnorableMapClick == 'function' && isIgnorableMapClick(event)) {
		return;
	}
	if(typeof scheduleFocusMapSearchInput == 'function')
		scheduleFocusMapSearchInput();
	else {
		var pacInput = document.getElementById('pac-input');
		if(pacInput)
			pacInput.focus();
	}
	// Raster/Apple layers share Google's event surface, but its POIs belong
	// only to the Google basemap. Other sources resolve the clicked coordinate.
	var layer = typeof getCurrentMapLayer === 'function' ? getCurrentMapLayer() : 'roadmap';
	if(event.placeId) {
		// Suppress Google's default place popup on every source.
		event.stop();
	}
	if (event.placeId && (layer === 'roadmap' || layer === 'satellite')) {
		this.getPlaceInformation(event.placeId);
	}
	else {
		getAddress(resolveLatLng(event.latLng));
	}
};

ClickEventHandler.prototype.getPlaceInformation = function(placeId) {
	if(!this.placesService) {
		return;
	}
	var selectionVersion = typeof mapSelectionVersion === 'number' ? mapSelectionVersion : null;
	this.placesService.getDetails({placeId: placeId}, function(place, status) {
		if(status === 'OK' && (selectionVersion === null || selectionVersion === mapSelectionVersion)) {
			poiPlace = place;
			address = place.formatted_address;
			refreshAddress();
		}
	});
};
