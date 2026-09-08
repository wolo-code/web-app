var ClickEventHandler = function(map) {
	var placesLib = typeof getGooglePlacesLibrary == 'function' ? getGooglePlacesLibrary() : null;
	this.map = map;
	this.placesService = (placesLib && placesLib.PlacesService) ? new placesLib.PlacesService(map) : null;
	this.map.addListener('click', this.handleClick.bind(this));
};

ClickEventHandler.prototype.handleClick = function(event) {
	document.getElementById('pac-input').blur();
	if (event.placeId) {
		// Calling e.stop() on the event prevents the default info window from showing.
		// If you call stop here when there is no placeId you will prevent some other map click event handlers from receiving the event.
		event.stop();
		this.getPlaceInformation(event.placeId);
	}
	else {
		getAddress(resolveLatLng(event.latLng));
	}
};

ClickEventHandler.prototype.getPlaceInformation = function(placeId) {
	var me = this;
	if(!this.placesService) {
		return;
	}
	this.placesService.getDetails({placeId: placeId}, function(place, status) {
		if (status === 'OK') {
			poiPlace = place;
			address = place.formatted_address;
			refreshAddress();
		}
	});
};
