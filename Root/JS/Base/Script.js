var pendingInitMap;
var clickHandler;
var map;

function syncInitMap() {
	if (document.readyState === 'interactive' && typeof google === 'object' && typeof google.maps === 'object' && typeof initMap == 'function' && pendingInitMap) {
		map = new google.maps.Map(document.getElementById('map'), {
			center: DEFAULT_LATLNG,
			zoom: DEFAULT_INIT_ZOOM,
			mapTypeControl: false,
			fullscreenControl: false,
			streetViewControl: false,
			zoomControl: false
		});
		initMap();
		pendingInitMap = false;
	}
}

document.addEventListener('DOMContentLoaded', function() {
	if(typeof initLoad != 'undefined')
		initLoad();
});
