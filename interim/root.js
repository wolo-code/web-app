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

				} else {
					console.log('No geoCoding results found');
				}
			} else {
				console.log('Geocoder failed due to: ' + status);
			}
			if(pendingCitySubmit) {
				execSubmitCity();
				pendingCitySubmit = false;
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
var DEFAULT_WCODE = ['bangalore', 'diesel', 'hall', 'planet'];
var pendingCity = false;

function noCity(position) {
	showAddress();
	showNoCityMessage();
	infoWindow.setContent("Location not in database");
}

function submitCity() {
	if(address == "")
		pendingCitySubmit = true;
	else {
		execSubmitCity();
		pendingCity = true;
	}
}

function execSubmitCity() {
	var newPostKey = firebase.database().ref().child('CityRequest').push().key;
	var updates = {};
	var data = {
			"time": firebase.database.ServerValue.TIMESTAMP,
			"lat_lng": latLng_p,
			"gp_id": gpId,
			"address": address,
			"processed": false
		};
	updates['/CityRequest/' + newPostKey] = data;
	firebase.database().ref().update(updates);
	showNotification("Request submitted");
}

function tryDefaultCity() {
	decode(DEFAULT_WCODE);
	notification_top.classList.add('hide');
	infoWindow.close();
}
var urlFunctions = 'https://location.wcodes.org/api/';
//'http://localhost:5002/waddress-5f30b/us-central1/';

function encode_(city, position) {
	var http = new XMLHttpRequest();
	http.open('POST', urlFunctions+'encode', true);

	// http.setRequestHeaders('Content-type', 'version');
	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', 1);

	wait_loader.classList.remove('hide');
	http.onreadystatechange = function() {
		if(http.readyState == 4) {
			if(http.status == 200) {
				setCodeWords(http.responseText, city, position);
				wait_loader.classList.add('hide');
			}
			else if(http.status == 204) {
				noCity(position);
				notification_top.classList.remove('hide');
				wait_loader.classList.add('hide');
			}
		}
	}

	http.send( stringifyEncodeData(city.center, position) );
	return '';
}

function setCodeWords(code, city, position) {
	var message = [];
	message.push(city.name);
	var object = JSON.parse(code).code;

	for(i of object)
		message.push(wordList.getWord(i));

	setWcode(message, position);
}

function stringifyEncodeData(city_center, position) {
	var object = {};
	object['city_center'] = city_center;
	object['position'] = position;
	return JSON.stringify(object);
}

function decode_(city, code) {

	var http = new XMLHttpRequest();
	http.open('POST', urlFunctions+'decode', true);

	// http.setRequestHeaders('Content-type', 'version');
	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', 1);
	
	wait_loader.classList.remove('hide');
	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			setCodeCoord(http.responseText, new Array(city.name).concat(code));
			notification_top.classList.add('hide');
			wait_loader.classList.add('hide');
		}
	}

	var data = [];
	data[0] = wordList.indexOf(code[0]);
	data[1] = wordList.indexOf(code[1]);
	data[2] = wordList.indexOf(code[2]);
	http.send( stringifyDecodeData(city.center, data) );

}

function stringifyDecodeData(city_center, code) {
	var object = {};
	object['city_center'] = city_center;
	object['code'] = code;
	return JSON.stringify(object);
}

function setCodeCoord(codeIndex, code) {
	var object = JSON.parse(codeIndex);
	focus__(object, code);
}
var WCODE_CODE_COPIED_MESSAGE = "WCode copied to clipboard";
var WCODE_LINK_COPIED_MESSAGE = "WCode link copied to clipboard";

function showCopyWcodeMessage() {
	copy_wcode_message_city_name.innerText = getWcodeCity();
	copy_wcode_message.classList.remove('hide');
}

function hideCopyWcodeMessage() {
	copy_wcode_message.classList.add('hide');
	copy_wcode_message_city_name.innerText = '';	
}

function copyWcodeFull() {
	showAndCopy(getWcodeFull_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyWcodeMessage();
}

function copyWcodeCode() {
	showAndCopy(getWcodeCode_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyWcodeMessage();
}

function copyWcodeLink() {
	var wcode_url = location.hostname + '/' + getWcodeFull().join('.');
	showAndCopy(wcode_url.toLowerCase());
	showNotification(WCODE_LINK_COPIED_MESSAGE);
}
var CityList = [];
var city_styled_wordlist = [];
var city_plus_wordList = [];
var pendingPosition;
var pendingWords;

const PURE_WCODE_CITY_PICKED = "Since your city is not set - city was chosen from the last location";
const PURE_WCODE_CITY_FAILED = "Since your city is not set - you must first choose the city or preceed the WCode with city name";

function getCityFromPosition(latLng) {
	var nearCityList = [];
	CityList.forEach (function(city) {
		var dLat = Math.abs(city.center.lat - latLng.lat);
		var dLng = Math.abs(city.center.lng - latLng.lng);
		if(dLat < 0.25) {
			if(dLng < 0.25) {
				var dSquare = dLat * dLat + dLng * dLng;
				if(nearCityList.length == 0) {
					nearCityList.push({'city':city, 'dLng':dLng});
				}
				else {
					for(i = 0; i < nearCityList.length; i++) {
						if(nearCityList[i].dLng > dLng) {
							nearCityList.splice(i, 0, {'city':city, 'dLng':dLng});
							break;
						}
					}
				}
			}
		}
	} );
	
	if(nearCityList.length == 0)
		return null;
	else
		return nearCityList[0].city;//address_string.replace(/(,| )/gm, '_');
}

function getCityFromName(cityName) {
	var city;
	for(var i = 0; i < CityList.length; i++) {
		if(CityList[i].name.toLowerCase().localeCompare(cityName) == 0)
			return CityList[i];
	}
	return null;
}

function encode(position) {
	clearWcode();
	if(CityList.length > 0) {
		var city = getCityFromPosition(position);
		if(city == null) {
			if(!pendingCity) {
				pendingPosition = position;
				noCity(position);
			}
		}
		else {
			if(pendingCity) {
				hideNoCityMessage();
				infoWindow_setContent(MESSAGE_LOADING);
				pendingCity = false;
			}
			encode_(city, position);
		}
	}
	else
		pendingPosition = position;
}

function decode(words) {
	if(CityList.length > 0) {
		var city;
		var valid = false;
		
		var city_words_length = words.length-3;
		if(words.length > 3) {
			var ipCityName = words.slice(0, city_words_length).join(' ');
			city = getCityFromName(ipCityName);
			valid = true;
		}
		else if (words.length == 3) {
			var position;
			if(myLocDot == null) {
				if(marker != null && marker.position != null) {
					position = marker.position;
					focus(position);
					showNotification(PURE_WCODE_CITY_PICKED);
				}
				else
					showNotification(PURE_WCODE_CITY_FAILED);
				return;
			}
			else {
				position = myLocDot.position;
			}
			
			if(position != null)
				city = getCityFromPosition(resolveLatLng(position));
			if(city != null)
				valid = true;
		}

		if(valid) {
			for (var i = 0; i < 3; i++) {
				if (wordList.includes(words[city_words_length+i]) != true) {
					valid = false;
					break;
				}
			}
		}
		
		if(valid) {
			decode_(city, words.slice(city_words_length, words.length));
		}
		else {
			showNotification(INCORRECT_WCODE);
		}			
	}
	else
		pendingWords = words;
}
firebase.database().ref('CityList').on('value', function(snapshot) {
	
	CityList = snapshot.val();
	
	CityList.forEach (function(city){
		city_styled_wordlist.push(city.name);
		city_plus_wordList.push(city.name.toLowerCase());
	});
	city_plus_wordList = city_plus_wordList.concat(wordList.wordList);
	
	if(pendingPosition != null) {
		encode(pendingPosition);
	}
	else if(pendingWords != null) {
		decode(pendingWords);
	}
	
});
function logCode(code, values) {
	console.log("Code:")
	console.log(code);
	console.log(values);
	console.log("--")
}

function logDifference(lat, long, values) {
	var lat_diff_pc = Math.round((lat - curPos.lat) * 1000000) / 1000000;
	var long_diff_pc = Math.round((long - curPos.lng) * 1000000) / 1000000;
	console.log("Difference:")
	console.log(lat_diff_pc + " " + long_diff_pc);
	console.log(curPos.lat + " " + curPos.lng);
	console.log(lat + " " + long);
	console.log(values)
	console.log("--")
}
/*
	Map code from Google Maps Javascript library documentaion under Apache 2.0 license
*/

var map;
var marker;
var infoWindow;
var accuCircle;
var myLocDot;
var poiPlace;
var pendingLocate = false;
var pendingCitySubmit = false;
var infoWindow_open = false;
var DEFAULT_LATLNG = {lat: -34.397, lng: 150.644};

var INCORRECT_WCODE = 'INCORRECT INPUT! Should be at least 3 WCode words, optionally preceded by a city. E.g: "Bangalore cat apple tomato"';
var MESSAGE_LOADING = 'Loading ..';
var LOCATION_PERMISSION_DENIED = "Location permission was denied. Click to point or retry with the locate button";

function initMap() {

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

		clearMap();
		// Clear out the old markers.
		markers.forEach(function(marker) {
			marker.setMap(null);
		});
		markers = [];

		// For each place, get the icon, name and location.
		var bounds = new google.maps.LatLngBounds();
		if(places.length == 1) {
			clearAddress();
			var pos = resolveLatLng(places[0].geometry.location);
			focus_(pos);
			encode(pos);
			getAddress(pos);
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
					load(this);
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
		pendingPosition = null;
		notification_top.classList.add('hide');
		clearAddress();
		clearURL();
		var pos = resolveLatLng(event.latLng);
		focus_(pos);
		encode(pos);
	});

	location_button.addEventListener('click', function() {
		locate(true);
	});

	decode_button.addEventListener('click', function() {
		clearMap();
		suggestion_result.setInnerText = '';
		var code = document.getElementById('pac-input').value;
		execDecode(code);
	});

	document.getElementById('pac-input').addEventListener('input', suggestComplete);
	var clickHandler = new ClickEventHandler(map);
}

function resolveLatLng(latLng) {
	return {'lat':latLng.lat(), 'lng':latLng.lng()};
}

function execDecode(code) {

	code = code.replace(/(\\|\/)/gm, '').trim().toLowerCase();
	var valid = true;
	if(code.length > 0) {
		var splitChar;
		if(code.indexOf(' ') != -1)
			splitChar = ' ';
		else {
			splitChar = '.';
		}
		var words = code.split(splitChar);
		if(words.length < 3)
			valid = false;
		else
			decode(words);
	}

	if(!valid)
		showNotification(INCORRECT_WCODE);

}

function suggestComplete(event) {
	var input_array = document.getElementById('pac-input').value.toLowerCase().split(' ');
	var curList;
	if(input_array.length > 0) {
		curList = getPossibleList(input_array.slice(0, -1));
	}
	if(curList !=  null) {
		var curWord = input_array[input_array.length-1];
		if(curList != city_styled_wordlist && curList != wordList.curList) {
			var compareWord = input_array.slice(0, -1).join(' ')+' ';
			var newList = [];
			var regEx = new RegExp(compareWord, 'ig');
			curList.forEach(function(city_name) {
				if(city_name.toLowerCase().startsWith(compareWord))
					newList.push(city_name.replace(regEx, ''));
			});
			curList = newList;
		}
		changeInput(curList, curWord);
	}
	else
		suggestion_result.innerText = '';
};

function getPossibleList(code) {
	var list;
	
	if(code.length == 0)
		list = city_styled_wordlist;
	else {
		var i;
		for(i = code.length; i > 0; i--) {
			var cityName = code.slice(0, i).join(' ');
			if(getCityFromName(cityName)) {
				list = wordList.curList;
				break;
			}
			else {
				list = matchWord(city_styled_wordlist, cityName);
				if(list && list.length > 0)
					break;
			}
		}
		for(; i < code.length; i++) {
			if(!wordList.indexOf(code[i]))
				return null;
			else
				list = wordList.curList;
		}
	}
	return list;
}

function matchWord(list, input) {
	var regEx = new RegExp(input.split('').join('\\w*').replace(/\W/, ''), 'i');
	return list.filter(function(word) {
		if (word.match(regEx)) {
			if(word.toLowerCase().startsWith(input))
				return word;
		}
	});
}

function changeInput(list, val) {
	var autoCompleteResult = matchWord(list, val);
	suggestion_result.innerText = '';
	if(autoCompleteResult.length == 1 && val == autoCompleteResult[0].toLowerCase())
		return;
	if(autoCompleteResult.length < 5 || val.length > 2)
		for(var i = 0; i < autoCompleteResult.length && i < 10; i++) {
			var option = document.createElement('div');
			option.innerText = autoCompleteResult[i];
			option.addEventListener('click', chooseWord);
			suggestion_result.appendChild(option);
		}
}

function chooseWord(event) {
	var cur_word = document.getElementById('pac-input').value.split(' ');
	cur_word[cur_word.length-1] = this.innerText;
	document.getElementById('pac-input').value = cur_word.join(' ') + ' ';
	document.getElementById('pac-input').focus();
	suggestion_result.innerText = '';
}

var lastMarker;
function load(marker) {
	focus_(marker.position);
	window.marker.title = marker.title;
	infoWindow.open(map, window.marker);
	infoWindow_open = true;
	marker.setVisible(false);
	lastMarker = marker;
	infoWindow_setContent(MESSAGE_LOADING);
	encode(marker.position);
}

function focus__(pos, code) {
	focus_(pos);
	setWcode(code, pos);
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

function focus_(pos, bounds) {
	
	hideNoCityMessage();

	if(typeof marker === 'undefined') {
		marker = new google.maps.Marker({
			position: pos,
			map: map,
			title: 'Hello World!'
		});
		marker.addListener('click', function() {
			if(infoWindow_open == false) {
				infoWindow.open(map, marker);
				infoWindow_open = true;
			}
			else {
				infoWindow.close();
				infoWindow_open = false;
			}
		})
	}
	else {
		marker.setPosition(pos);
	}

	if(marker.getMap() == null)
		marker.setMap(map);

	if(typeof bounds !== 'undefined') {
		map.fitBounds(bounds, 26);
	}
	else if (typeof accuCircle !== 'undefined') {
		accuCircle.setOptions({'fillOpacity': 0.10});
	}
	
	map.panTo(pos);
	map.panBy(0, getPanByOffset());
	infoWindow_setContent(MESSAGE_LOADING);
	infoWindow.open(map, marker);
	infoWindow_open = true;

}

function getPanByOffset() {
	if(window.innerHeight < 1000)
		return -118;
	else
		return 0;
}

function locate(override_dnd) {
	// Try HTML5 geolocation.
	if(!locationAccessCheck()) {
		var hide_dnd = override_dnd || !locationAccessDNDstatus();
		if(override_dnd || !locationAccessDNDcheck()) {
			pendingLocate = true;
			showLocateRightMessage(hide_dnd);
		}
		else
			wait_loader.classList.add('hide');
	}
	else {
		pendingLocate = false;
		locateExec();
	}
}

function locateExec() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			setLocationAccess(true);
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
				accuCircle.setOptions({'fillOpacity': 0.35});
				accuCircle.setCenter(pos);
				accuCircle.setRadius(position.coords.accuracy);
			}

			if(typeof myLocDot === 'undefined') {
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
			if(initWCode == false) {
				focus_(pos, accuCircle.getBounds());
				encode(pos);
				getAddress(pos);
			}
			else {
				initWCode = false;
				map.setZoom(12);
			}
		}, function(error) {
			if(error.code = error.PERMISSION_DENIED) {
				showNotification(LOCATION_PERMISSION_DENIED);
				setLocationAccess(false);
				wait_loader.classList.add('hide');
			}
			else
				handleLocationError(true, infoWindow, map.getCenter());
		});
	} else {
		// Browser doesn't support Geolocation
		handleLocationError(false, infoWindow, map.getCenter());
	}
}

function handleLocationError(browserHasGeolocation, infoWindow, pos) {
	infoWindow_setContent(browserHasGeolocation ?
												'Error: The Geolocation service failed' :
												'Error: Your browser doesn\'t support geolocation');
	infoWindow.setPosition(pos);
	notification_top.classList.remove('hide');
}

function setInfoWindowText(code, latLng) {
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + code[0] + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code.slice(1, code.length).join(' ') + "</span> <span class='slash'>/</span></div></div><div id='infowindow_actions' class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src='/resource/address.svg' ><img id='copy_code_button' class='control' onclick='showCopyWcodeMessage();' src='/resource/copy.svg' ><img id='copy_link_button' class='control' onclick='copyWcodeLink();' src='/resource/link.svg' ><a href='"+ getIntentURL(latLng, code) + "'><img id='external_map_button' class='control' onclick='' src='/resource/map.svg' ></a></div>")
}

function getIntentURL(latLng, code) {
	if((navigator.userAgent.match(/android/i)))
		return 'geo:0,0?q='+latLng.lat+','+latLng.lng+'(\\ '+code.join(' ')+' /)';
	else
		return 'https://maps.google.com/maps?q=loc:'+latLng.lat+','+latLng.lng+'&t=h';
}

function clearMap() {
	if(marker != null)
		marker.setMap(null);
}

function infoWindow_setContent(string) {
	if(typeof infoWindow == 'undefined')
		infoWindow = new google.maps.InfoWindow({'map': map});
	infoWindow.setContent(string);
}

function arrayContainsArray(superset, subset) {
	return subset.every(function (value) {
		return (superset.indexOf(value.toLowerCase()) >= 0);
	});
}

function clearURL() {
	if(window.location.pathname.substr(1) != '')
		window.history.pushState({"html":'',"pageTitle":''}, '', '/');
}
var wcode_city;
var wcode_code;
var wcode_postition;

function setWcode(wcode, latLng) {
	wcode_city = wcode[0];
	wcode_code = wcode.slice(1, wcode.length);
	wcode_postition = latLng;
	
	setInfoWindowText(wcode, latLng);
}

function clearWcode() {
	wcode_array = null;
	wcode_postition = null;
}

function getWcodeFull() {
	return [wcode_city].concat(wcode_code);
}

function formatWcode(wcode) {
	return ["\\"].concat(wcode).concat(["/"]); 
}

function getWcodeFull_formatted() {
	return formatWcode(getWcodeFull());
}

function getWcodeCode() {
	return wcode_code;
}

function getWcodeCode_formatted() {
	return formatWcode(getWcodeCode());
}

function getWcodeCity() {
	return wcode_city;	
}
window.onload = init;

function init() {
	overlay.addEventListener('click', hideOverlay);
	overlay_message_close.addEventListener('click', hideOverlay);
	info.addEventListener('click', showOverlay);
	no_city_message_close.addEventListener('click', hideNoCityMessage);
	locate_right_message_close.addEventListener('click', hideLocateRightMessage);
	locate_right_message_yes.addEventListener('click', locateRight_grant);
	locate_right_message_no.addEventListener('click', locateRight_deny);
	no_city_submit_yes.addEventListener('click', noCity_add);
	no_city_submit_no.addEventListener('click', noCity_cancel);
	no_city_submit_wait_continue.addEventListener('click', noCityWait_continue);
	no_city_submit_wait_stop.addEventListener('click', noCityWait_stop);
	notification_top.addEventListener('click', tryDefaultCity);
	copy_wcode_message_close.addEventListener('click', hideCopyWcodeMessage);
	copy_wcode_submit_yes.addEventListener('click', copyWcodeFull);
	copy_wcode_submit_no.addEventListener('click', copyWcodeCode);
}

function showAndCopy(message) {
	showNotification(message);
	copyNodeText(notification_bottom);
}

function copyNodeText(node) {
	var range = document.createRange();
	range.selectNode(node);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand('copy');
	window.getSelection().removeAllRanges();
}
function WordList(list) {
	this.wordList = list;
	this.curList = [];
	
	for(x of this.wordList)
		this.curList.push(x[0]);
	
	this.indexOf = function(word) {
		for(var index = 0; index < 1024; index++) {
			var i = this.wordList[index].indexOf(word);
			if(i != -1)
				return index;
		}
		return -1;
	};
	
	this.getWord = function(index) {
		return this.curList[index];
	};
	
	this.includes = function(word) {
		for(group of this.wordList) {
			for(entry of group) {
				if(entry == word)
					return true;
			}
		}
		return false;
	};
	
}
var wordList_data = [
	['act'],
	['actor'],
	['air'],
	['alarm'],
	['almond'],
	['ambulance'],
	['anchor'],
	['angle'],
	['ant'],
	['antenna'],
	['ape'],
	['apple'],
	['apricot'],
	['arch'],
	['area'],
	['arm'],
	['army'],
	['art'],
	['asteroid'],
	['atom'],
	['aurora'],
	['autumn'],
	['avocado'],
	['award'],
	['axle'],
	['baby'],
	['back'],
	['badge'],
	['bag'],
	['ball'],
	['balloon'],
	['bamboo'],
	['banana'],
	['bangle'],
	['bank'],
	['base'],
	['basin'],
	['basis'],
	['basket'],
	['bat'],
	['bath'],
	['battery'],
	['bay'],
	['beach'],
	['bead'],
	['beam'],
	['bean'],
	['beast'],
	['bed'],
	['bee'],
	['beetle'],
	['bell'],
	['belt'],
	['bench'],
	['bicycle'],
	['bike'],
	['bill'],
	['bird'],
	['biscuit'],
	['black'],
	['blade'],
	['blanket'],
	['blizzard'],
	['blood'],
	['blue'],
	['board'],
	['boat'],
	['body'],
	['bone'],
	['bonus'],
	['book'],
	['boot'],
	['border'],
	['boss'],
	['bottle'],
	['bottom'],
	['boundary'],
	['bow'],
	['box'],
	['boy'],
	['brain'],
	['brake'],
	['branch'],
	['brass'],
	['brave'],
	['bread'],
	['breath'],
	['brick'],
	['bridge'],
	['brinjal'],
	['broccoli'],
	['broom'],
	['brother'],
	['brown'],
	['brush'],
	['bubble'],
	['bucket'],
	['buffalo'],
	['building'],
	['bulb'],
	['bull'],
	['bun'],
	['bus'],
	['bush'],
	['butter'],
	['button'],
	['buyer'],
	['cabbage'],
	['cabin'],
	['cable'],
	['cactus'],
	['cage'],
	['cake'],
	['calcium'],
	['calculator'],
	['calendar'],
	['camel'],
	['camera'],
	['camp'],
	['canal'],
	['cancer'],
	['candle'],
	['candy'],
	['cannon'],
	['canvas'],
	['cap'],
	['car'],
	['carbon'],
	['card'],
	['care'],
	['carriage'],
	['carrot'],
	['cart'],
	['case'],
	['cash'],
	['cashew'],
	['cast'],
	['castle'],
	['cat'],
	['catch'],
	['cave'],
	['ceiling'],
	['cell'],
	['cellar'],
	['cement'],
	['cent'],
	['century'],
	['chain'],
	['chair'],
	['chalk'],
	['channel'],
	['charm'],
	['cheek'],
	['cheese'],
	['cheetah'],
	['cherry'],
	['chess'],
	['chest'],
	['chicken'],
	['child'],
	['children'],
	['chili'],
	['chimpanzee'],
	['chin'],
	['chocolate'],
	['circle'],
	['city'],
	['clam'],
	['class'],
	['claw'],
	['clay'],
	['cliff'],
	['climate'],
	['clock'],
	['cloth'],
	['cloud'],
	['clover'],
	['clown'],
	['club'],
	['coach'],
	['coal'],
	['coast'],
	['coat'],
	['cobra'],
	['cockroach'],
	['cocoa'],
	['coffee'],
	['coil'],
	['coin'],
	['collar'],
	['color'],
	['comb'],
	['company'],
	['compass'],
	['computer'],
	['concrete'],
	['continent'],
	['cook'],
	['cookie'],
	['copper'],
	['cord'],
	['cork'],
	['corn'],
	['cotton'],
	['cough'],
	['country'],
	['cover'],
	['cow'],
	['crab'],
	['crack'],
	['crane'],
	['crate'],
	['crayon'],
	['cream'],
	['creature'],
	['credit'],
	['cricket'],
	['crocodile'],
	['crow'],
	['crowd'],
	['crown'],
	['cube'],
	['cucumber'],
	['cup'],
	['current'],
	['curtain'],
	['curve'],
	['dad'],
	['daffodil'],
	['dahlia'],
	['dance'],
	['dark'],
	['date'],
	['daughter'],
	['dawn'],
	['death'],
	['decade'],
	['deck'],
	['degree'],
	['depth'],
	['desert'],
	['desk'],
	['device'],
	['diamond'],
	['diary'],
	['dice'],
	['diesel'],
	['dime'],
	['dinosaur'],
	['dish'],
	['disk'],
	['distance'],
	['doctor'],
	['dodo'],
	['doll'],
	['dolphin'],
	['dome'],
	['donkey'],
	['door'],
	['dove'],
	['dragon'],
	['drain'],
	['drama'],
	['drawer'],
	['dream'],
	['dress'],
	['drill'],
	['drink'],
	['drop'],
	['drum'],
	['duck'],
	['dusk'],
	['dust'],
	['eagle'],
	['ear'],
	['earth'],
	['east'],
	['eat'],
	['eclipse'],
	['edge'],
	['egg'],
	['elbow'],
	['electron'],
	['elephant'],
	['ellipse'],
	['energy'],
	['engine'],
	['entry'],
	['equation'],
	['equator'],
	['eraser'],
	['event'],
	['exam'],
	['exit'],
	['eye'],
	['face'],
	['fact'],
	['factory'],
	['fair'],
	['falcon'],
	['fall'],
	['fan'],
	['fang'],
	['farm'],
	['farmer'],
	['fat'],
	['father'],
	['faucet'],
	['fax'],
	['feast'],
	['feather'],
	['feel'],
	['feet'],
	['fence'],
	['fever'],
	['field'],
	['file'],
	['film'],
	['find'],
	['finger'],
	['fire'],
	['fish'],
	['flag'],
	['flame'],
	['flat'],
	['flesh'],
	['floor'],
	['flow'],
	['flower'],
	['flute'],
	['fly'],
	['fog'],
	['food'],
	['foot'],
	['force'],
	['forest'],
	['fork'],
	['form'],
	['formula'],
	['fountain'],
	['fox'],
	['frame'],
	['free'],
	['frock'],
	['frog'],
	['front'],
	['fruit'],
	['fuel'],
	['furniture'],
	['galaxy'],
	['game'],
	['garden'],
	['garlic'],
	['gas'],
	['gate'],
	['gear'],
	['gecko'],
	['gem'],
	['giant'],
	['gift'],
	['ginger'],
	['giraffe'],
	['girl'],
	['glacier'],
	['glass'],
	['glove'],
	['glue'],
	['goal'],
	['goat'],
	['gold'],
	['goose'],
	['gorilla'],
	['governor'],
	['grade'],
	['grain'],
	['grape'],
	['graph'],
	['grass'],
	['gravity'],
	['green'],
	['grid'],
	['grip'],
	['ground'],
	['group'],
	['guava'],
	['guest'],
	['guide'],
	['guitar'],
	['hair'],
	['half'],
	['hall'],
	['hammer'],
	['hand'],
	['harmonica'],
	['hat'],
	['hawk'],
	['head'],
	['heart'],
	['heat'],
	['helicopter'],
	['helium'],
	['helmet'],
	['herb'],
	['hero'],
	['hill'],
	['hip'],
	['hippo'],
	['hockey'],
	['hole'],
	['home'],
	['honey'],
	['hook'],
	['hope'],
	['horn'],
	['horse'],
	['hour'],
	['house'],
	['hurricane'],
	['hydrogen'],
	['ice'],
	['idea'],
	['impulse'],
	['income'],
	['ink'],
	['insect'],
	['interest'],
	['iridium'],
	['iron'],
	['island'],
	['item'],
	['jackal'],
	['jacket'],
	['jam'],
	['jar'],
	['jaw'],
	['jeans'],
	['jeep'],
	['jelly'],
	['jet'],
	['jewel'],
	['join'],
	['journey'],
	['judge'],
	['juice'],
	['kangaroo'],
	['kettle'],
	['key'],
	['kick'],
	['kid'],
	['kidney'],
	['kind'],
	['king'],
	['kite'],
	['kiwi'],
	['knee'],
	['koala'],
	['lab'],
	['lace'],
	['lack'],
	['ladder'],
	['lady'],
	['lake'],
	['lamp'],
	['land'],
	['lap'],
	['law'],
	['lawn'],
	['lawyer'],
	['lead'],
	['leaf'],
	['left'],
	['leg'],
	['lemon'],
	['lens'],
	['leopard'],
	['letter'],
	['lettuce'],
	['level'],
	['library'],
	['life'],
	['lift'],
	['light'],
	['lily'],
	['line'],
	['linen'],
	['link'],
	['lion'],
	['lip'],
	['liquid'],
	['list'],
	['live'],
	['liver'],
	['lizard'],
	['load'],
	['lock'],
	['locket'],
	['log'],
	['logo'],
	['look'],
	['lotus'],
	['love'],
	['low'],
	['lumber'],
	['lunch'],
	['lung'],
	['machine'],
	['magic'],
	['magnet'],
	['mail'],
	['mall'],
	['mammoth'],
	['man'],
	['manager'],
	['mango'],
	['map'],
	['marble'],
	['market'],
	['mars'],
	['mask'],
	['mass'],
	['mat'],
	['math'],
	['matrix'],
	['matter'],
	['meal'],
	['media'],
	['memory'],
	['menu'],
	['mercury'],
	['metal'],
	['meteor'],
	['milk'],
	['mind'],
	['mine'],
	['minister'],
	['mint'],
	['minute'],
	['mirror'],
	['mist'],
	['mode'],
	['mom'],
	['money'],
	['monk'],
	['monkey'],
	['month'],
	['mood'],
	['mop'],
	['morning'],
	['mosquito'],
	['mother'],
	['motion'],
	['motor'],
	['mountain'],
	['mouse'],
	['mouth'],
	['movie'],
	['mud'],
	['muffin'],
	['mug'],
	['muscle'],
	['mushroom'],
	['music'],
	['nail'],
	['name'],
	['nation'],
	['nature'],
	['nebula'],
	['neck'],
	['needle'],
	['neon'],
	['nerve'],
	['nest'],
	['net'],
	['neutron'],
	['news'],
	['night'],
	['nitrogen'],
	['noise'],
	['north'],
	['nose'],
	['note'],
	['number'],
	['nurse'],
	['nut'],
	['oak'],
	['oat'],
	['ocean'],
	['octopus'],
	['office'],
	['oil'],
	['olive'],
	['onion'],
	['orange'],
	['orbit'],
	['orchid'],
	['ornament'],
	['ostrich'],
	['oval'],
	['oven'],
	['owl'],
	['owner'],
	['oxygen'],
	['oyster'],
	['pack'],
	['page'],
	['paint'],
	['pair'],
	['palm'],
	['pan'],
	['panda'],
	['pant'],
	['panther'],
	['papaya'],
	['paper'],
	['parcel'],
	['parent'],
	['park'],
	['parrot'],
	['part'],
	['pasta'],
	['patch'],
	['peace'],
	['peak'],
	['pear'],
	['pearl'],
	['pen'],
	['pencil'],
	['penguin'],
	['pepper'],
	['perfume'],
	['person'],
	['pest'],
	['pet'],
	['petrol'],
	['phone'],
	['photon'],
	['piano'],
	['pickle'],
	['picture'],
	['pie'],
	['pigeon'],
	['pill'],
	['pillar'],
	['pillow'],
	['pilot'],
	['pin'],
	['pine'],
	['pipe'],
	['pizza'],
	['place'],
	['plan'],
	['plane'],
	['planet'],
	['plant'],
	['plasma'],
	['plastic'],
	['plate'],
	['platinum'],
	['play'],
	['pleasure'],
	['plot'],
	['plough'],
	['plug'],
	['plutonium'],
	['pocket'],
	['poem'],
	['poet'],
	['point'],
	['pole'],
	['police'],
	['polite'],
	['polo'],
	['pond'],
	['pool'],
	['port'],
	['porter'],
	['position'],
	['post'],
	['pot'],
	['potato'],
	['powder'],
	['power'],
	['price'],
	['print'],
	['printer'],
	['prison'],
	['profit'],
	['proton'],
	['pulsar'],
	['puma'],
	['pump'],
	['punch'],
	['pure'],
	['purse'],
	['pyramid'],
	['quartz'],
	['queen'],
	['question'],
	['quick'],
	['quiet'],
	['quilt'],
	['quince'],
	['quiver'],
	['rabbit'],
	['race'],
	['rack'],
	['radio'],
	['radish'],
	['rain'],
	['rake'],
	['range'],
	['rate'],
	['ratio'],
	['ray'],
	['receipt'],
	['rectangle'],
	['red'],
	['rent'],
	['rhino'],
	['rice'],
	['rifle'],
	['right'],
	['rim'],
	['ring'],
	['risk'],
	['river'],
	['road'],
	['robin'],
	['rock'],
	['rocket'],
	['rod'],
	['role'],
	['roof'],
	['room'],
	['root'],
	['rope'],
	['rose'],
	['route'],
	['rub'],
	['rule'],
	['run'],
	['rust'],
	['sack'],
	['saddle'],
	['sail'],
	['salad'],
	['salt'],
	['sample'],
	['sand'],
	['satellite'],
	['sauce'],
	['scale'],
	['scarf'],
	['scene'],
	['scent'],
	['school'],
	['science'],
	['scissor'],
	['screw'],
	['sea'],
	['second'],
	['seed'],
	['self'],
	['shade'],
	['shake'],
	['shark'],
	['sheep'],
	['sheet'],
	['shelf'],
	['shell'],
	['ship'],
	['shirt'],
	['shoe'],
	['shop'],
	['shot'],
	['shoulder'],
	['shout'],
	['shovel'],
	['shower'],
	['side'],
	['sign'],
	['silicon'],
	['silk'],
	['silver'],
	['sing'],
	['sink'],
	['sister'],
	['site'],
	['size'],
	['skate'],
	['skeleton'],
	['skill'],
	['skin'],
	['skirt'],
	['sky'],
	['sleep'],
	['sleet'],
	['slip'],
	['slope'],
	['sloth'],
	['smell'],
	['smile'],
	['smoke'],
	['snail'],
	['snake'],
	['snow'],
	['soap'],
	['soccer'],
	['society'],
	['sock'],
	['socket'],
	['soda'],
	['sodium'],
	['sofa'],
	['soil'],
	['soldier'],
	['solid'],
	['son'],
	['song'],
	['sort'],
	['sound'],
	['soup'],
	['south'],
	['soy'],
	['space'],
	['spade'],
	['spark'],
	['speaker'],
	['spear'],
	['sphere'],
	['spider'],
	['spin'],
	['sponge'],
	['spoon'],
	['spot'],
	['spring'],
	['spy'],
	['square'],
	['squid'],
	['squirrel'],
	['stage'],
	['stamp'],
	['stand'],
	['star'],
	['state'],
	['station'],
	['steak'],
	['steam'],
	['steel'],
	['stem'],
	['step'],
	['stew'],
	['stick'],
	['stitch'],
	['stomach'],
	['stone'],
	['storm'],
	['story'],
	['stove'],
	['straw'],
	['street'],
	['string'],
	['student'],
	['study'],
	['sugar'],
	['suit'],
	['summer'],
	['sushi'],
	['swan'],
	['sweater'],
	['swing'],
	['switch'],
	['sword'],
	['syringe'],
	['system'],
	['table'],
	['tail'],
	['tale'],
	['tank'],
	['tap'],
	['tape'],
	['task'],
	['tattoo'],
	['tea'],
	['teacher'],
	['telephone'],
	['telescope'],
	['tennis'],
	['tent'],
	['term'],
	['test'],
	['text'],
	['theory'],
	['thief'],
	['thigh'],
	['thing'],
	['thorn'],
	['thought'],
	['thread'],
	['throat'],
	['thumb'],
	['thunder'],
	['ticket'],
	['tide'],
	['tie'],
	['tiger'],
	['tile'],
	['tilt'],
	['tin'],
	['tip'],
	['titanium'],
	['toast'],
	['toe'],
	['tomato'],
	['tongue'],
	['tool'],
	['tooth'],
	['top'],
	['topic'],
	['tornado'],
	['tortoise'],
	['toss'],
	['touch'],
	['towel'],
	['tower'],
	['town'],
	['toy'],
	['trade'],
	['train'],
	['tree'],
	['tremor'],
	['triangle'],
	['trip'],
	['trophy'],
	['trouser'],
	['truck'],
	['trunk'],
	['truth'],
	['tsunami'],
	['tub'],
	['tube'],
	['tulip'],
	['tuna'],
	['tunnel'],
	['turnip'],
	['twig'],
	['twist'],
	['type'],
	['umbrella'],
	['uncle'],
	['union'],
	['unit'],
	['universe'],
	['uranium'],
	['user'],
	['valley'],
	['value'],
	['van'],
	['vanilla'],
	['vase'],
	['vegetable'],
	['veil'],
	['vein'],
	['venom'],
	['verse'],
	['vessel'],
	['vest'],
	['video'],
	['view'],
	['village'],
	['violin'],
	['virus'],
	['vitamin'],
	['voice'],
	['volcano'],
	['vote'],
	['vulture'],
	['waffle'],
	['wall'],
	['wallet'],
	['walrus'],
	['war'],
	['watch'],
	['water'],
	['wave'],
	['wax'],
	['weapon'],
	['weather'],
	['web'],
	['week'],
	['weight'],
	['west'],
	['whale'],
	['wheat'],
	['wheel'],
	['while'],
	['whip'],
	['whistle'],
	['white'],
	['wife'],
	['wind'],
	['window'],
	['wing'],
	['winter'],
	['wire'],
	['wise'],
	['wolf'],
	['woman'],
	['wonder'],
	['wood'],
	['wool'],
	['word'],
	['work'],
	['world'],
	['wound'],
	['wrench'],
	['wrist'],
	['yak'],
	['yard'],
	['yarn'],
	['yellow'],
	['youth'],
	['zebra'],
	['zinc']
];
