var DEFAULT_LATLNG = {lat: -34.397, lng: 150.644};
var pendingInitMap = true;
var clickHandler;
var map;

function createMap() {
	map = new google.maps.Map(document.getElementById('map'), {
		center: DEFAULT_LATLNG,
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.BOTTOM_CENTER
		},
		zoom: 8,
		fullscreenControl: false,
		streetViewControl: false,
		zoomControl: false
	});
	syncInitMap();
}