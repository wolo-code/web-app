var latLng_p = "";
var address = "";
var gpId = "";

function getAddress(latLng) {
	var geocoder = new google.maps.Geocoder;
	geocoder.geocode({'location': latLng}, function(results, status) {
			latLng_p = latLng;
			if (status === 'OK') {
				if (results[0]) {
					address = results[0].formatted_address;
					gpId = results[0].place_id;
					refreshAddress();
					if(pendingFillForm) {
						fillForm(latLng.lat, latLng.lng, address.split(' ').pop());
						pendingFillForm = null;
					}
				} else {
					console.log('No geoCoding results found');
				}
			} else {
				console.log('Geocoder failed due to: ' + status);
			}
		});
}

function toggleAddress() {
	if(address_text.classList.value == 'hide')
		showAddress();
	else
		hideAddress();
}

function showAddress() {
	address_text_content.innerText = address;
	address_text.classList.remove('hide');
}

function hideAddress() {
	address_text_content.innerText = '';
	address_text.classList.add('hide');
}

function clearAddress() {
	address = '';
	gpId = '';
	address_text_content.innerText = '';
}

function refreshAddress() {
	if(!address_text.classList.contains('hide')) {
		address_text_content.innerText = address;
	}
}

function copyAddress() {
	copyNodeText(address_text_content);
}

function setAddress(a, g) {
	address = a;
	gpId = g;
	refreshAddress();
}
var data
var data_index = 0;
var idLoader;
var prev_entry;

function queryPendingList() {
	beginLoader();
	var ref = firebase.database().ref('CityRequest');
	var list = ref.orderByChild("processed").equalTo(false).on("value", function(snapshot) {
		if(data != null)
			prev_entry = data[data_index];
		data = [];
		var target_index;
		snapshot.forEach(function(child) {
			var entry = child.val();
			entry['id'] = child.key;
			data.push(entry);
			if(target_index == null && target_id != null)
				if(child.key == target_id)
					target_index = data.length-1;
		});
		data_count.innerText = data.length;
		if(idLoader != null)
			endLoader('authenticated');
		if(prev_entry == null || data_index >= data.length || JSON.stringify(prev_entry) != JSON.stringify(data[data_index])) {
			if(target_id == null)
				data_index = 0;
			else {
				data_index = target_index;
				target_id = null;
			}
			updateList();
		}
	})
}

function process_entry(key) {
	var ref = firebase.database().ref('CityRequest/'+key);
	var updates = {};
	updates['processed'] = 'true';
	ref.update(updates);
}

function submit_city(lat, lng, country, group, name) {
	var cityList;
	var ref = firebase.database().ref('CityList');
	ref.once('value', function(snapshot) {
		cityList = snapshot.val();
		var data = {
			"center": {'lat':lat, 'lng':lng},
			"country": country,
			"group": group,
			"name": name
		};
		cityList[Object.keys(cityList).length] = data;
		ref.set(cityList);
	});
	showNotification("Request submitted");
	clearForm();
}
function hideDetails() {
	address_details.classList.add('hide');
}

function showDetails() {
	address_details.classList.remove('hide');
}
var map;
var entryMarker;
var markers = [];
var accuCircle;
var pendingFillForm;

function initialize() {
	var input = document.getElementById('pac-input');
	var searchBox = new google.maps.places.SearchBox(input);
	var myOptions = {
		zoom: 3,
		center: new google.maps.LatLng({lat: -34.397, lng: 150.644}),
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.BOTTOM_CENTER
		},
		fullscreenControl: false,
		streetViewControl: false,
		zoomControl: false
	};
	map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
	map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
	//map.controls[google.maps.ControlPosition.TOP_LEFT].push(input);
	
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
		focus_(event.latLng);
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

var ClickEventHandler = function(map) {
	this.map = map;
	this.placesService = new google.maps.places.PlacesService(map);

	this.map.addListener('click', this.handleClick.bind(this));
};

ClickEventHandler.prototype.handleClick = function(event) {
	if (event.placeId) {
		// Calling e.stop() on the event prevents the default info window from
		// showing.
		// If you call stop here when there is no placeId you will prevent some
		// other map click event handlers from receiving the event.
		event.stop();
		this.getPlaceInformation(event.placeId);
	}
	else {
		getAddress(resolveLatLng(event.latLng));
	}
};

ClickEventHandler.prototype.getPlaceInformation = function(placeId) {
	var me = this;
	this.placesService.getDetails({placeId: placeId}, function(place, status) {
		if (status === 'OK') {
			poiPlace = place;
			address = place.formatted_address;
			refreshAddress();
		}
	});
};

// LatLng limit
var SPAN = 0.5;

function ang_span_d(ang) {
	return Math.abs(Math.cos(ang * Math.PI / 180)/SPAN);
}

function getSpanBounds(lat, lng) {
	var lat_span = SPAN;
	var lng_span = ang_span_d(lng);
	return {
		'north': lat+lat_span,
		'south': lat-lat_span,
		'east': lng+lng_span,
		'west': lng-lng_span
	};
}

function focus_(pos, bounds) {

	map.panTo(pos);
	city_lat.value = pos.lat();
	city_lng.value = pos.lng();
	if(typeof accuCircle === 'undefined') {
		accuCircle = new google.maps.Rectangle({
			strokeColor: '#69B7CF',
			strokeOpacity: 10,
			strokeWeight: 1,
			fillColor: '#69B7CF',
			fillOpacity: 0.5,
			map: map,
			//center: pos,
			bounds: getSpanBounds(pos.lat(), pos.lng()),
			clickable: false
		});
	}
	else {
		accuCircle.setBounds(getSpanBounds(pos.lat(), pos.lng()));
	}

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

	if(marker.getMap() == null)
		marker.setMap(map);

	if(typeof bounds !== 'undefined') {
		map.fitBounds(bounds, 26);
		var offsetY = 0.06;
		if(map.getBounds() != null) {
			var span = map.getBounds().toSpan(); // a latLng - # of deg map span
			var newCenter = {
				lat: pos.lat + span.lat()*offsetY,
				lng: pos.lng
			};

			map.panTo(newCenter);
		}
	}
	else if (typeof accuCircle !== 'undefined')
		//map.setZoom(15);
		accuCircle.setOptions({'fillOpacity': 0.10});

}

function focus(position) {
	focus_(position);
	pendingFillForm = true;
	getAddress(resolveLatLng(position));
}

function resolveLatLng(latLng) {
	return {'lat':latLng.lat(), 'lng':latLng.lng()};
}
var auth_processed = false;
var map_ready = false;
var target_id;

window.onload = function() {
	initApp();
	setupControls();
	setTargetIndex();
};

function setTargetIndex() {
	var param = window.location.hash.substr(1);
	if(param.length > 0)
		target_id = param;
}

function initApp() {
	firebase.auth().getRedirectResult().then(function(result) {
		if (result.credential) {
			// This gives you a Google Access Token. You can use it to access the Google API.
			//var token = result.credential.accessToken;
			queryPendingList();
		}
		else if (firebase.auth().currentUser) {
			queryPendingList();
			// User already signed in.
			// Update your UI, hide the sign in button.
		} else {
			showRestrictedBlock();
			// No user signed in, update your UI, show the sign in button.
			var provider = new firebase.auth.GoogleAuthProvider();
			firebase.auth().signInWithRedirect(provider);
		}
		var user = result.user;
	}).catch(function(error) {
		var errorCode = error.code;
		var errorMessage = error.message;
		// The email of the user's account used.
		var email = error.email;
		// The firebase.auth.AuthCredential type that was used.
		var credential = error.credential;
		// ...
	});
}

function beginLoader() {
	idLoader = setTimeout(function(){endLoader('unauthenticated')}, 2500);
}

function endLoader(status) {
	clearTimeout(idLoader);
	idLoader = null;
	if(status == 'authenticated')
		showConsloeBlock();
	else if('unauthenticated')
		showRestrictedBlock();
}

function initMap() {
	if(auth_processed)
		initialize();
	else
		map_processed = true;
}

function showRestrictedBlock() {
	console_block.classList.add('hide');
	restrict_block.classList.remove('hide');
}

function showConsloeBlock() {
	restrict_block.classList.add('hide');	
	console_block.classList.remove('hide');
	if(map_processed)
		initialize();
	else
		auth_processed = true;
}

function nextRow() {
	if(data_index+1 < data.length) {
		data_index++;
		updateList();
	}
}

function deleteRow() {
}

function previousRow() {
	if(data_index == 0) {
		if(data.length > 0) {
			data_index = data.length-1;
			updateList();
		}
	}
	else {
		data_index--;
		updateList();
	}
}

function updateList() {
	if(data.length > 0) {
		view_data_index.innerText = data_index+1;
		var entry = data[data_index];
		data_gp_id.innerText = entry.gp_id;
		data_lat.innerText = entry.lat_lng.lat
		data_lng.innerText = entry.lat_lng.lng;
		setAddress(entry.address, entry.gp_id);
		data_time.innerText = formatDate(new Date(entry.time));
		location_request_list.classList.remove('invisible');
		map.panTo(entry.lat_lng);
		showEntryMarker(entry.lat_lng);
	}
	else {
		location_request_list.classList.add('invisible');
		clearAddress();
	}
	clearForm();
}

function setupControls() {
	
	view_data_index.addEventListener('click', function(e) {
		showDetails();
	});
	
	details_close.addEventListener('click', function(e) {
		hideDetails();
	});
	
	data_previous.addEventListener('click', function(e) {
		previousRow();
	});
	
	data_reject.addEventListener('click', function(e) {
		process_entry(data[data_index].id);
		deleteRow();
//		updateRow();
	});
	
	data_next.addEventListener('click', function(e) {
		nextRow();
	});
	
	data_process_checkbox.addEventListener('change', function() {
		if(this.checked) {
			var entry = data[data_index];
			map.panTo(entry.lat_lng);
			showEntryMarker(entry.lat_lng);			
		}
		else {
			
		}
	});
	
	submit_city_button.addEventListener('click', function() {
		if(city_submit_panel.checkValidity()) {
			submit_city(city_lat.value, city_lng.value, city_country.value.trim(), city_group.value.trim(), city_name.value.trim());
			if(data_process_checkbox.checked) {
				process_entry(data[data_index].id);
			}
		}
	});
	
}

function formatDate(date) {
	var monthNames = [
		"Jan", "Feb", "Mar",
		"Apr", "May", "Jun", "Jul",
		"Aug", "Sep", "Oct",
		"Nov", "Dec"
	];

	var day = date.getDate();
	var monthIndex = date.getMonth();
	var hour = date.getHours();
	var minute = date.getMinutes();
	return monthNames[monthIndex] + ' ' + formatNumber(day) + ' ' + formatNumber(hour) + ':' + formatNumber(minute);
}

function formatNumber(number) {
	WIDTH = 2;
	if (String(number).length < WIDTH)
		return ' '+number;
	else
		return number;
}

//google.maps.event.addDomListener(window, "load", initialize);

function fillForm(lat, lng, country) {
	city_lat.value = lat;
	city_lng.value = lng;	
	city_country.value = country;
}

function clearForm() {
	city_lat.value = '';
	city_lng.value = '';
	city_country.value = '';
	city_group.value = '';
	city_name.value = '';	
}
