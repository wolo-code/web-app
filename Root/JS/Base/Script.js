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
			zoomControl: false,
			backgroundColor: 'none'
		});
		initMap();
		pendingInitMap = false;
	}
}

document.addEventListener('DOMContentLoaded', function() {
	if(typeof initLoad != 'undefined')
		initLoad();
	if( typeof CSS == 'undefined' || !CSS.supports("backdrop-filter: blur()") ) {
		document.getElementById('logo').classList.add('plain_background');
		document.getElementById('footer-content').classList.add('plain_background');
	}
});
