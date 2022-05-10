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
		
		if(!locationAccessCheck()) {
			getCityByIp();
		}
		else {
			
			var position;
			initLocate(false, function() {
				getCoarseLocation(function(position) {
					getCityFromPositionViaGMap(position, function(city) {
						document.getElementById('decode_input_city').innerText = city.name;
						getCityCenterFromId(city, function() {
							geoIP_city = city;
						} );
					}, handleLocationError) }, handleLocationError);
				return;
			});
				
		}
		
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

window.onerror = function myErrorHandler(errorMsg, url, lineNumber) {
	alert("Oops! Something went wrong. Make sure you are connected to the Internet and are using latest Google Chrome Browser - if this issue persists");
	return false;
}
