/*
	Map code from Google Maps Javascript library documentaion under Apache 2.0 license
*/

var map;
var marker;
var infoWindow;
var accuCircle;
var myLocDot;

function initMap() {
	
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: -34.397, lng: 150.644},
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.BOTTOM_CENTER
		},
		zoom: 8
	});

	infoWindow = new google.maps.InfoWindow({map: map});
	locate();
	
	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);

	// Bias the SearchBox results towards current map's viewport.
	map.addListener('bounds_changed', function() {
		searchBox.setBounds(map.getBounds());
	});

	var markers = [];
	// Listen for the event fired when the user selects a prediction and retrieve
	// more details for that place.
	searchBox.addListener('places_changed', function() {
		var places = searchBox.getPlaces();

		if (places.length == 0) {
			return;
		}

		// Clear out the old markers.
		markers.forEach(function(marker) {
			marker.setMap(null);
		});
		markers = [];

		// For each place, get the icon, name and location.
		var bounds = new google.maps.LatLngBounds();
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
			markers.push(new google.maps.Marker({
				map: map,
				icon: icon,
				title: place.name,
				position: place.geometry.location
			}));

			if (place.geometry.viewport) {
				// Only geocodes have viewport.
				bounds.union(place.geometry.viewport);
			} else {
				bounds.extend(place.geometry.location);
			}
		});
		map.fitBounds(bounds);
	});

	map.addListener('click', function(event) {
		encode(event.latLng);
		focus_(event.latLng);
  });
	
	location_button.addEventListener("click", function(){
		locate();
	});
		
	decode_button.addEventListener("click", function(){
		var code = document.getElementById("pac-input").value.trim().toLowerCase();
		var valid = false;
		var words = code.split(" ");
//		if(code != "") {
			if(words.length == 4) {
				if(words[0] == "bangalore") {
					for (i = 1; i < words.length; i++) {
						if (wordList.includes(words[i]) == true) {
							valid = true;
						}
						else {
							valid = false;
							break;
						}
					}
				}
			}
		// }
		if(valid) {
			decode(words);
		}
		else {
			alert('Incorrect input. Should be 4 words beginning with Bangalore which is followed by 3 WCodes. E.g: "Bangalore cat apple tomato"');
		}
	});
	
}

function focus__(pos, code) {
	focus_(pos);
	setInfoWindowText(code);
}

function focus_(pos, bounds) {
	map.setCenter(pos);
	if(typeof marker === 'undefined') {
		marker = new google.maps.Marker({
			position: pos,
			map: map,
			title: 'Hello World!'
		});
	}
	else {
		marker.setPosition(pos);
	}
	
	if(typeof bounds !== 'undefined')
		map.fitBounds(bounds);
	else
		//map.setZoom(15);
		accuCircle.setOptions({"fillOpacity": 0.10});
		
	infoWindow.setContent('(loading..)');
	infoWindow.open(map, marker);

}

function locate() {
	// Try HTML5 geolocation.
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			var pos = {
				lat: position.coords.latitude,
				lng: position.coords.longitude
			};
			if(typeof accuCircle === 'undefined') {
				accuCircle = new google.maps.Circle({
					strokeColor: '#69B7CF',
					strokeOpacity: 0,
					strokeWeight: 0,
					fillColor: '#69B7CF',
					fillOpacity: 0.35,
					map: map,
					center: pos,
					radius: position.coords.accuracy,
					clickable: false
				});
			}
			else {
				accuCircle.setFillOpacity(0.35);
				accuCircle.setCenter(pos);
				accuCircle.setRadius(position.coords.accuracy);
			}

			focus_(pos, accuCircle.getBounds());
			if(typeof myLocDot === "undefined") {
				myLocDot = new google.maps.Marker({
					clickable: false,
					icon: new google.maps.MarkerImage('https://maps.gstatic.com/mapfiles/mobile/mobileimgs2.png',
							new google.maps.Size(22,22),
							new google.maps.Point(0,18),
							new google.maps.Point(11,11)),
					shadow: null,
					zIndex: 999,
					map: map,
					position: pos
				});
			}
			else {
				myLocDot.setPosition(pos);
			}
			encode(pos);
		}, function() {
			handleLocationError(true, infoWindow, map.getCenter());
		});
	} else {
		// Browser doesn't support Geolocation
		handleLocationError(false, infoWindow, map.getCenter());
	}	
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	infoWindow.setPosition(pos);
	infoWindow.setContent(browserHasGeolocation ?
												'Error: The Geolocation service failed.' :
												'Error: Your browser doesn\'t support geolocation.');
}

function setInfoWindowText(code) {
	infoWindow.setContent("\\ " + code + " /")
}
