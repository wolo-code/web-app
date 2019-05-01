var entryMarker;
// var markers;
var accuCircle;
var pendingFillForm;

function initialize() {
	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
	
	// Bias the SearchBox results towards current map's viewport.
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});

	// Listen for the event fired when the user selects a prediction and retrieve
	// more details for that place.
	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();

		if (places.length == 0) {
			return;
		}

		clearMap();

		// For each place, get the icon, name and location.
		var bounds = new google.maps.LatLngBounds();
		if(places.length == 0) {
		}
		else if(places.length == 1) {
			focus(places[0].geometry.location);
		}
		else {
			places.forEach(function(place) {
				if (!place.geometry) {
					console.log("Returned place contains no geometry");
					return;
				}
				var icon = {
					url: place.icon,
					size: new google.maps.Size(71, 71),
					origin: new google.maps.Point(0, 0),
					anchor: new google.maps.Point(17, 34),
					scaledSize: new google.maps.Size(25, 25)
				};

				// Create a marker for each place.
				var resultMarker = new google.maps.Marker({
					map: map,
					icon: icon,
					title: place.name,
					position: place.geometry.location
				});
				resultMarker.addListener('click', function() {
				 	focus(this.getPosition());
				});
				markers.push(resultMarker);

				if (place.geometry.viewport) {
					// Only geocodes have viewport.
					bounds.union(place.geometry.viewport);
				} else {
					bounds.extend(place.geometry.location);
				}
			});
			map.fitBounds(bounds);
		}
	});
		
	map.addListener('click', function(event) {
		clearAddress();
		focus(event.latLng);
		//encode(resolveLatLng(event.latLng));
	});
	var clickHandler = new ClickEventHandler(map);
}

function clearMap() {
	// Clear out the old markers.
	markers.forEach(function(marker) {
		marker.setMap(null);
	});
	markers = [];
}

function reverseGeoCode(latLng) {
	var geocoder = new google.maps.Geocoder();
	geocoder.geocode({
		//'address': address
		'location': {latLng}
		}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				var Lat = results[0].geometry.location.lat();
				var Lng = results[0].geometry.location.lng();
				city_lat.innerText = Lat;
				city_lng.innerText = Lng;
				map.setCenter(results[0].geometry.location);
			} else {
				console.log("Geocode error: "+status);
				showNotification("Oops something got wrong!");
			}
		}
	);	
}

var entryMarker;
function showEntryMarker(location) {
	if(entryMarker != null)
		entryMarker.setMap();
	var icon = {
		url: 'https://maps.gstatic.com/mapfiles/mobile/mobileimgs2.png',
		size: new google.maps.Size(22, 22),
		origin: new google.maps.Point(0, 18),
		anchor: new google.maps.Point(11, 11),
	};
	entryMarker = new google.maps.Marker({
		map: map,
		icon: icon,
		//title: place.name,
		position: location
	});
	google.maps.event.addListener(entryMarker, 'click', function() {clearForm();});
}

// const N;
// const A;
// const B;
// const E_SQ;
// const DEG_RAD;

function lat_span_half(lat) {
	var lat_r = DEG_RAD*lat;
	var x = Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r));
	return Math.abs((x*x*x)/(DEG_RAD*A*(1-E_SQ)));
}

function lng_span_half(lat) {
	var lat_r = DEG_RAD*lat;
	return Math.abs(Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r))/(DEG_RAD*A*Math.cos(lat_r)));
}

function getSpanBounds(lat, lng) {
	var lat_span = lat_span_half(lat)*N;
	var lng_span = lng_span_half(lat)*N;
	return {
		'north': lat+lat_span,
		'south': lat-lat_span,
		'east': lng+lng_span,
		'west': lng-lng_span
	};
}

function resolveLatLng(latLng) {
	return {'lat':latLng.lat(), 'lng':latLng.lng()};
}
