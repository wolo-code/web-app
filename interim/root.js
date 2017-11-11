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
function noCity(position) {
	showAddress();
	showNoCityMessage();
	infoWindow.setContent("Location not in database");
}

function submitCity() {
	if(address == "")
		pendingCitySubmit = true;
	else
		execSubmitCity();
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
	showNotification("Request submitted. Check back later");
}
var urlFunctions = 'https://location.wcodes.org/api/';
//'http://localhost:5002/waddress-5f30b/us-central1/';

function encode_(city, position) {
	var http = new XMLHttpRequest();
	http.open('POST', urlFunctions+'encode', true);

	// http.setRequestHeaders('Content-type', 'version');
	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', 1);

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			setCodeWords(http.responseText, city, position);
		}
	}

	http.send( stringifyEncodeData(getCityBegin(city.center), position) );
	return '';
}

function setCodeWords(code, city, position) {
	var message = [];
	message.push(city.name);
	var object = JSON.parse(code).code;

	for(i of object) {
		if(i < 0 || i > 1023) {
			focusDefault();
			return;
		}
		else
			message.push(wordList[i]);
	}
	setInfoWindowText(message, position);
}

function stringifyEncodeData(city_begin, position) {
	var object = {};
	object['city_begin'] = city_begin;
	object['position'] = position;
	return JSON.stringify(object);
}

function decode_(city, code) {

	var http = new XMLHttpRequest();
	http.open('POST', urlFunctions+'decode', true);

	// http.setRequestHeaders('Content-type', 'version');
	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', 1);

	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			code.splice(0, 0, city.name);
			setCodeCoord(http.responseText, code);
		}
	}

	var data = [];
	data[0] = wordList.indexOf(code[0]);
	data[1] = wordList.indexOf(code[1]);
	data[2] = wordList.indexOf(code[2]);
	http.send( stringifyDecodeData(getCityBegin(city.center), data) );

	// lat = city_begin.lat;
	// lng = city_begin.lng;
	// return {
	// 	lat: (function() {
	// 		return lat
	// 	})(),
	// 	lng: (function() {
	// 		return lng
	// 	})()
	// };
}

function stringifyDecodeData(city_begin, code) {
	var object = {};
	object['city_begin'] = city_begin;
	object['code'] = code;
	return JSON.stringify(object);
}

function setCodeCoord(codeIndex, code) {
	var object = JSON.parse(codeIndex);
	focus__(object, code);
}
var CityList = [];
var pendingPosition;
var pendingWords;

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
}

function getCityBegin(cityCenter) {
	var CITY_SPAN_PERIMETER = 0.5/2;
	var lat = cityCenter.lat - CITY_SPAN_PERIMETER;
	var lng = cityCenter.lng - CITY_SPAN_PERIMETER;
	return {'lat': lat, 'lng': lng};
}

function encode(position) {
	if(CityList.length > 0) {
		var city = getCityFromPosition(position);
		if(city == null)
			noCity(position);
		else
			encode_(city, position);
	}
	else
		pendingPosition = position;
}

function decode(words) {
	if(CityList.length > 0) {
		var city = getCityFromName(words[0]);
		decode_(city, words.splice(1, words.length-1))
	}
	else
		pendingWords = wrods;
}
firebase.database().ref('CityList').on('value', function(snapshot) {
	CityList = snapshot.val();
	if(pendingPosition != null) {
		encode(pendingPosition);
		pendingPosition = null;
	}
	else if(pendingWords != null) {
		decode(pendingWords);
		pendingWords = null;
	}
});
function copyWCode() {
	showAndCopy(getWCodeFullFromInfoWindow().join(' '));
	showNotification("WCode copied");
}

function copyLink() {
	var wcode_url = location.hostname + '/' + getWCodeFromInfoWindow().join('.');
	showAndCopy(wcode_url.toLowerCase());
	showNotification("WCode link copied");
}

function getWCodeFullFromInfoWindow() {
	var wcode_full = infowindow_code.innerText.replace(/(\r?\n|\r)/gm, ' ').split(' ');
	wcode_full.pop();
	return wcode_full;
}

function getWCodeFromInfoWindow() {
	var wcode = getWCodeFullFromInfoWindow();
	return wcode.slice(1, wcode.length-1);
}
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
var city_plus_wordList = [];
var poiPlace;
var pendingLocate = false;
var pendingCitySubmit = false;

function initMap() {
	for(var i = 0; i < CityList.length; i++) {
		city_plus_wordList.push(CityList[i].name);
	}
	city_plus_wordList = city_plus_wordList.concat(wordList);

	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: -34.397, lng: 150.644},
		mapTypeControl: true,
		mapTypeControlOptions: {
			style: google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
			position: google.maps.ControlPosition.BOTTOM_CENTER
		},
		zoom: 8,
		fullscreenControl: false
	});

//	infoWindow = new google.maps.InfoWindow({map: map});
//	infoWindow.setContent("Waiting for location access right");
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

		clearMap();
		// Clear out the old markers.
		markers.forEach(function(marker) {
			marker.setMap(null);
		});
		markers = [];

		// For each place, get the icon, name and location.
		var bounds = new google.maps.LatLngBounds();
		if(places.length == 1) {
			focus_(places[0].geometry.location);
			encode(resolveLatLng(places[0].geometry.location));
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
		clearAddress();
		focus_(event.latLng);
		encode(resolveLatLng(event.latLng));
	});

	location_button.addEventListener('click', function() {
		locate();
	});

	decode_button.addEventListener('click', function() {
		clearMap();
		result.setInnerText = '';
		var code = document.getElementById('pac-input').value.replace(/(\\|\/)/gm, '').trim().toLowerCase();
		execDecode(code);
	});

	document.getElementById('pac-input').addEventListener('input', suggestComplete);
	var clickHandler = new ClickEventHandler(map);
}

function resolveLatLng(latLng) {
	return {'lat':latLng.lat(), 'lng':latLng.lng()};
}

function execDecode(code) {

	var valid = true;
	if(code.length > 0) {
		var splitChar;
		if(code.indexOf(' ') != -1)
			splitChar = ' ';
		else {
			splitChar = '.';
		}
		var words = code.split(splitChar);
		var city;
		if(words.length < 3)
			valid = false;
		else {

			if(words.length > 3) {
				var ipCityName = words.splice(0, words.length-3).join(' ');
				city = getCityFromName(ipCityName);
			}
			else {
				city = getCityFromPosition(resolveLatLng(myLocDot.position));
			}

			if(city == null) {
				valid = false;
			}
			else {
				for (var i = 0; i < 3; i++) {
					if (wordList.includes(words[i]) != true) {
						valid = false;
						break;
					}
				}
			}

		}
	}

	if(valid) {
		decode_(city, words);
	}
	else {
		alert('Incorrect input! Should be at least 3 WCode words, optionally preceded by a city. E.g: "Bangalore cat apple tomato"');
	}

}

function suggestComplete(event) {
	var input = document.getElementById('pac-input').value;
	if(!input.includes(' ')) {
		changeInput(city_plus_wordList, input);
	}
	else {
		var cur_word = input.split(' ');
		if(cur_word.length > 0 && cur_word[cur_word.length-1] != '')
			changeInput(wordList, cur_word[cur_word.length-1]);
		else {
			result.innerText = '';
		}
	}
};

function matchWord(list, input) {
	var reg = new RegExp(input.split('').join('\\w*').replace(/\W/, ''), 'i');
	return list.filter(function(word) {
		if (word.match(reg)) {
			if(word.toLowerCase().startsWith(input.toLowerCase()))
				return word;
		}
	});
}

function changeInput(list, val) {
	var autoCompleteResult = matchWord(list, val);
	result.innerText = '';
	if(autoCompleteResult.length == 1 && val == autoCompleteResult[0])
		return;
	if(autoCompleteResult.length < 5 || val.length > 2)
		for(var i = 0; i < autoCompleteResult.length && i < 10; i++) {
			var option = document.createElement('div');
			option.innerText = autoCompleteResult[i];
			option.addEventListener('click', chooseWord);
			result.appendChild(option);
		}
}

function chooseWord(event) {
	var cur_word = document.getElementById('pac-input').value.split(' ');
	cur_word[cur_word.length-1] = this.innerText;
	document.getElementById('pac-input').value = cur_word.join(' ') + ' ';
	document.getElementById('pac-input').focus();
	result.innerText = '';
}

var lastMarker;
function load(marker) {
	focus_(marker.position);
	window.marker.title = marker.title;
	infoWindow.open(map, window.marker);
	marker.setVisible(false);
	lastMarker = marker;
	infoWindow_setContent('Loading ..');
	encode(marker.position);
}

function focus__(pos, code) {
	focus_(pos);
	setInfoWindowText(code, pos);
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
	map.setCenter(pos);
	if(typeof marker === 'undefined') {
		marker = new google.maps.Marker({
			position: pos,
			map: map,
			title: 'Hello World!'
		});
		marker.addListener('click', function() {
			infoWindow.open(map, marker);
		})
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

	infoWindow_setContent('Loading ..');
	infoWindow.open(map, marker);
}

function locate() {
	// Try HTML5 geolocation.
	if(!locationAccess) {
		pendingLocate = true;
		showLocateRightMessage();
	}
	else {
		pendingLocate = false;
		locateExec();
	}
}

function locateExec() {
	if (navigator.geolocation) {
		navigator.geolocation.getCurrentPosition(function(position) {
			locationAccess = true;
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
			if(error.code = error.PERMISSION_DENIED)
				showNotification("Location permission was denied. Click to point");
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
	//focusDefault();
}

function setInfoWindowText(code, latLng) {
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + code[0] + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code.slice(1, code.length).join(' ') + "</span> <span class='slash'>/</span></div></div><div class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src='/resource/address.svg' ><img id='copy_code_button' class='control' onclick='copyWCode();' src='/resource/copy.svg' ><img id='copy_link_button' class='control' onclick='copyLink();' src='/resource/link.svg' ><a href='"+ getIntentURL(latLng, code) + "'><img id='external_map_button' class='control' onclick='' src='/resource/map.svg' ></a></div>")
}

function getIntentURL(latLng, code) {
	if((navigator.userAgent.match(/android/i)))
		return "geo:0,0?q="+latLng.lat+','+latLng.lng+"(\\ "+code.join(' ')+" /)";
	else
		return "https://maps.google.com/maps?q=loc:"+latLng.lat+','+latLng.lng;
}

function focusDefault() {
	setTimeout(function() { alert("This location appears to not be in the database. Please submit a request to add at support@wcodes.org") }, 100);
	setTimeout(function() { focusDefault_(); }, 1000);
}

function focusDefault_() {
	var position = {'lat':12.978328666666666,'lng':77.59628655555555};
	focus_(position);
	setInfoWindowText(['Bangalore', 'hand', 'cat', 'bone'], position);
	map.setZoom(12);
}

function clearMap() {
	marker.setMap(null);
}

function infoWindow_setContent(string) {
	if(typeof infoWindow == "undefined")
		infoWindow = new google.maps.InfoWindow({map: map});
	infoWindow.setContent(string);
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
}

function showAndCopy(message) {
	showNotification(message);
	copyNodeText(notification);
}

function copyNodeText(node) {
	var range = document.createRange();
	range.selectNode(node);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand('copy');
	window.getSelection().removeAllRanges();
}
var wordList = [
	'abacus',
	'actor',
	'air',
	'alarm',
	'almond',
	'ambulance',
	'anchor',
	'angle',
	'ant',
	'antenna',
	'apple',
	'apricot',
	'arch',
	'area',
	'arm',
	'army',
	'art',
	'asteroid',
	'atom',
	'aurora',
	'autumn',
	'avocado',
	'axle',
	'baby',
	'back',
	'bacteria',
	'badge',
	'bag',
	'bag',
	'ball',
	'balloon',
	'bamboo',
	'banana',
	'bangle',
	'bank',
	'base',
	'basin',
	'basis',
	'basket',
	'bat',
	'bath',
	'battery',
	'bay',
	'beach',
	'bead',
	'beam',
	'bean',
	'beast',
	'bed',
	'bed',
	'bee',
	'beetle',
	'bell',
	'belt',
	'bench',
	'bicycle',
	'bike',
	'bill',
	'bird',
	'biscuit',
	'black',
	'black',
	'blade',
	'blanket',
	'blizzard',
	'blood',
	'blue',
	'board',
	'boat',
	'body',
	'bone',
	'bonus',
	'book',
	'boot',
	'border',
	'boss',
	'bottle',
	'bottom',
	'boundary',
	'bow',
	'bowl',
	'box',
	'boy',
	'brain',
	'brake',
	'branch',
	'brass',
	'bread',
	'breath',
	'brick',
	'bridge',
	'broccoli',
	'broom',
	'brother',
	'brush',
	'bubble',
	'bucket',
	'buffalo',
	'building',
	'bulb',
	'bull',
	'bun',
	'bus',
	'bush',
	'butter',
	'button',
	'buyer',
	'cabbage',
	'cable',
	'cactus',
	'cage',
	'cake',
	'calcium',
	'calculator',
	'calendar',
	'camel',
	'camera',
	'camp',
	'canal',
	'cancer',
	'candle',
	'candy',
	'cannon',
	'canvas',
	'cap',
	'car',
	'carbon',
	'card',
	'care',
	'carriage',
	'carrot',
	'cart',
	'case',
	'cash',
	'cashew',
	'cast',
	'castle',
	'cat',
	'catch',
	'cave',
	'ceiling',
	'cell',
	'cellar',
	'cement',
	'cemetery',
	'cent',
	'century',
	'chain',
	'chair',
	'chalk',
	'channel',
	'cheek',
	'cheese',
	'cheetah',
	'cherry',
	'chess',
	'chest',
	'chicken',
	'child',
	'children',
	'chili',
	'chimpanzee',
	'chin',
	'chocolate',
	'circle',
	'city',
	'clam',
	'class',
	'claw',
	'clay',
	'cliff',
	'climate',
	'clock',
	'cloth',
	'cloud',
	'clover',
	'clown',
	'club',
	'coach',
	'coal',
	'coast',
	'coat',
	'cobra',
	'cockroach',
	'cocoa',
	'coffee',
	'coil',
	'coin',
	'collar',
	'color',
	'comb',
	'company',
	'compass',
	'computer',
	'concrete',
	'continent',
	'cook',
	'cookie',
	'copper',
	'cord',
	'cork',
	'corn',
	'cotton',
	'cough',
	'country',
	'cover',
	'cow',
	'crab',
	'crack',
	'crane',
	'crate',
	'crayon',
	'cream',
	'creature',
	'credit',
	'cricket',
	'cricket',
	'crime',
	'crocodile',
	'crook',
	'crow',
	'crowd',
	'crown',
	'cube',
	'cucumber',
	'cup',
	'current',
	'curtain',
	'curve',
	'dad',
	'daffodil',
	'dahlia',
	'dark',
	'date',
	'dawn',
	'death',
	'decade',
	'deck',
	'degree',
	'depth',
	'desert',
	'desk',
	'diamond',
	'diary',
	'dice',
	'diesel',
	'dime',
	'dinosaur',
	'dirt',
	'dish',
	'disk',
	'distance',
	'doctor',
	'dodo',
	'doll',
	'dollar',
	'dolphin',
	'dome',
	'donkey',
	'door',
	'doughnut',
	'dove',
	'dragon',
	'drain',
	'drama',
	'drawer',
	'dress',
	'drill',
	'drink',
	'drop',
	'drum',
	'duck',
	'dusk',
	'dust',
	'eagle',
	'ear',
	'earth',
	'east',
	'eclipse',
	'edge',
	'egg',
	'elbow',
	'electron',
	'elephant',
	'ellipse',
	'engine',
	'entry',
	'equation',
	'equator',
	'eraser',
	'error',
	'event',
	'exam',
	'exit',
	'eye',
	'face',
	'fact',
	'factory',
	'fall',
	'fan',
	'fang',
	'farm',
	'farmer',
	'fat',
	'father',
	'faucet',
	'fax',
	'feast',
	'feather',
	'feet',
	'fence',
	'fever',
	'field',
	'file',
	'film',
	'finger',
	'fire',
	'fish',
	'flag',
	'flame',
	'flesh',
	'floor',
	'flower',
	'flute',
	'fly',
	'fog',
	'food',
	'foot',
	'force',
	'forest',
	'fork',
	'form',
	'formula',
	'fountain',
	'fox',
	'frame',
	'frock',
	'frog',
	'front',
	'fruit',
	'fuel',
	'fungi',
	'fur',
	'furniture',
	'galaxy',
	'game',
	'garden',
	'garlic',
	'gas',
	'gate',
	'gear',
	'gecko',
	'gem',
	'gene',
	'giant',
	'gift',
	'giraffe',
	'girl',
	'glacier',
	'glass',
	'glove',
	'glue',
	'goal',
	'goat',
	'gold',
	'goose',
	'gorilla',
	'governor',
	'grade',
	'grain',
	'grape',
	'graph',
	'grass',
	'gravity',
	'green',
	'grid',
	'grip',
	'ground',
	'group',
	'guava',
	'guest',
	'guide',
	'guitar',
	'hair',
	'half',
	'hall',
	'hammer',
	'hand',
	'harmonica',
	'harpoon',
	'hat',
	'hawk',
	'head',
	'heart',
	'heat',
	'helicopter',
	'helium',
	'helmet',
	'hill',
	'hip',
	'hippo',
	'hockey',
	'hole',
	'home',
	'honey',
	'hook',
	'hope',
	'horn',
	'horse',
	'hose',
	'hospital',
	'hotel',
	'hour',
	'house',
	'hurricane',
	'hydrogen',
	'ice',
	'idea',
	'impulse',
	'income',
	'ink',
	'insect',
	'instrument',
	'insurance',
	'interest',
	'invention',
	'iridium',
	'iron',
	'island',
	'item',
	'jackal',
	'jacket',
	'jail',
	'jam',
	'jar',
	'jeans',
	'jeep',
	'jelly',
	'jewel',
	'join',
	'joke',
	'journey',
	'judge',
	'juice',
	'kangaroo',
	'kettle',
	'key',
	'kick',
	'kidney',
	'kind',
	'king',
	'kite',
	'kitten',
	'kiwi',
	'knee',
	'knowledge',
	'lab',
	'lace',
	'lack',
	'ladder',
	'lady',
	'lake',
	'lamp',
	'land',
	'land',
	'language',
	'lasso',
	'law',
	'lawn',
	'lawyer',
	'lead',
	'leaf',
	'leather',
	'left',
	'leg',
	'lemon',
	'lens',
	'leopard',
	'letter',
	'lettuce',
	'level',
	'library',
	'life',
	'lift',
	'light',
	'lily',
	'line',
	'linen',
	'link',
	'lion',
	'lip',
	'liquid',
	'list',
	'liver',
	'lizard',
	'load',
	'lock',
	'locket',
	'log',
	'logo',
	'look',
	'loss',
	'lotus',
	'love',
	'low',
	'lumber',
	'lunch',
	'lung',
	'machine',
	'magic',
	'magnet',
	'mail',
	'mall',
	'mammoth',
	'man',
	'manager',
	'mango',
	'map',
	'marble',
	'market',
	'mars',
	'mask',
	'mass',
	'mat',
	'math',
	'matrix',
	'matter',
	'meal',
	'meat',
	'media',
	'memory',
	'menu',
	'mercury',
	'metal',
	'meteor',
	'milk',
	'millennium',
	'mind',
	'mine',
	'minister',
	'minute',
	'mirror',
	'mist',
	'mode',
	'mom',
	'money',
	'monk',
	'monkey',
	'month',
	'mood',
	'mop',
	'morning',
	'mosquito',
	'mother',
	'motion',
	'motor',
	'mountain',
	'mouse',
	'mouth',
	'movie',
	'mud',
	'muffin',
	'mug',
	'muscle',
	'mushroom',
	'music',
	'nail',
	'name',
	'nation',
	'nature',
	'nebula',
	'neck',
	'needle',
	'nerve',
	'nest',
	'net',
	'neutron',
	'news',
	'night',
	'nitrogen',
	'noise',
	'north',
	'nose',
	'nose',
	'note',
	'number',
	'nurse',
	'nut',
	'oak',
	'oat',
	'ocean',
	'octopus',
	'office',
	'oil',
	'olive',
	'onion',
	'orange',
	'orbit',
	'orchid',
	'ornament',
	'ostrich',
	'oven',
	'owl',
	'owner',
	'oxygen',
	'oyster',
	'pack',
	'page',
	'paint',
	'pair',
	'palm',
	'pan',
	'panda',
	'pant',
	'panther',
	'papaya',
	'paper',
	'parcel',
	'parent',
	'park',
	'parrot',
	'part',
	'patch',
	'peace',
	'peak',
	'pear',
	'pearl',
	'pen',
	'pencil',
	'penguin',
	'pepper',
	'perfume',
	'person',
	'pest',
	'pet',
	'petrol',
	'phone',
	'photon',
	'piano',
	'pickle',
	'picture',
	'pie',
	'pigeon',
	'pill',
	'pillar',
	'pillow',
	'pilot',
	'pin',
	'pine',
	'pipe',
	'pizza',
	'place',
	'plan',
	'plane',
	'planet',
	'plant',
	'plasma',
	'plastic',
	'plate',
	'platinum',
	'play',
	'pleasure',
	'plot',
	'plough',
	'plug',
	'plutonium',
	'pocket',
	'poem',
	'poet',
	'point',
	'pole',
	'police',
	'polo',
	'pond',
	'pool',
	'port',
	'porter',
	'position',
	'post',
	'pot',
	'potato',
	'powder',
	'power',
	'price',
	'print',
	'printer',
	'prison',
	'profit',
	'proton',
	'pulsar',
	'pump',
	'punch',
	'purse',
	'pyramid',
	'quartz',
	'queen',
	'question',
	'quiet',
	'quilt',
	'quince',
	'quiver',
	'rabbit',
	'rack',
	'radio',
	'radish',
	'rain',
	'rake',
	'range',
	'rat',
	'rate',
	'ratio',
	'ray',
	'receipt',
	'rectangle',
	'red',
	'rent',
	'rhino',
	'rice',
	'rice',
	'rifle',
	'right',
	'rim',
	'ring',
	'risk',
	'river',
	'road',
	'robin',
	'rock',
	'rocket',
	'rod',
	'role',
	'roof',
	'room',
	'root',
	'rope',
	'rose',
	'route',
	'rub',
	'rule',
	'run',
	'rust',
	'sack',
	'saddle',
	'sail',
	'salad',
	'salt',
	'sample',
	'sand',
	'satellite',
	'sauce',
	'scale',
	'scarf',
	'scene',
	'scent',
	'school',
	'science',
	'scissor',
	'screw',
	'sea',
	'second',
	'seed',
	'self',
	'shade',
	'shake',
	'shampoo',
	'shark',
	'sheep',
	'sheet',
	'shelf',
	'shell',
	'ship',
	'shirt',
	'shoe',
	'shop',
	'shot',
	'shoulder',
	'shout',
	'shovel',
	'shower',
	'side',
	'sign',
	'silicon',
	'silk',
	'silver',
	'sink',
	'sister',
	'site',
	'size',
	'skate',
	'skeleton',
	'skill',
	'skin',
	'skirt',
	'sky',
	'sleep',
	'sleet',
	'slip',
	'slope',
	'sloth',
	'smell',
	'smile',
	'smoke',
	'snail',
	'snake',
	'snow',
	'soap',
	'soccer',
	'society',
	'sock',
	'socket',
	'soda',
	'sodium',
	'sofa',
	'soil',
	'soldier',
	'son',
	'song',
	'sort',
	'sound',
	'soup',
	'south',
	'space',
	'spade',
	'spark',
	'speaker',
	'spear',
	'sphere',
	'spider',
	'sponge',
	'spoon',
	'spot',
	'spring',
	'spy',
	'square',
	'squid',
	'squirrel',
	'stage',
	'stamp',
	'stand',
	'star',
	'state',
	'statement',
	'station',
	'steak',
	'steam',
	'steel',
	'stem',
	'step',
	'stew',
	'stick',
	'stitch',
	'stomach',
	'stone',
	'storm',
	'story',
	'stove',
	'straw',
	'street',
	'string',
	'student',
	'study',
	'sugar',
	'suit',
	'summer',
	'sushi',
	'swan',
	'sweater',
	'swing',
	'switch',
	'sword',
	'syringe',
	'system',
	'table',
	'tail',
	'tale',
	'tank',
	'tap',
	'tape',
	'task',
	'tattoo',
	'tea',
	'teacher',
	'telephone',
	'telescope',
	'tennis',
	'tent',
	'term',
	'test',
	'text',
	'theory',
	'thief',
	'thigh',
	'thing',
	'thorn',
	'thought',
	'thread',
	'throat',
	'thumb',
	'thunder',
	'ticket',
	'tide',
	'tie',
	'tiger',
	'tile',
	'tilt',
	'time',
	'timer',
	'tin',
	'tip',
	'titanium',
	'toast',
	'toe',
	'tomato',
	'tomb',
	'tongue',
	'tool',
	'tooth',
	'top',
	'topic',
	'tornado',
	'tortoise',
	'toss',
	'touch',
	'towel',
	'tower',
	'town',
	'toy',
	'trade',
	'train',
	'tree',
	'tremor',
	'triangle',
	'trip',
	'trophy',
	'trouser',
	'truck',
	'trunk',
	'truth',
	'tsunami',
	'tub',
	'tube',
	'tulip',
	'tuna',
	'tunnel',
	'turnip',
	'twig',
	'twist',
	'type',
	'umbrella',
	'uncle',
	'union',
	'unit',
	'universe',
	'uranium',
	'user',
	'valley',
	'value',
	'van',
	'vanilla',
	'vase',
	'vegetable',
	'veil',
	'vein',
	'venom',
	'verse',
	'vessel',
	'vest',
	'video',
	'view',
	'village',
	'violin',
	'virus',
	'vitamin',
	'voice',
	'volcano',
	'vulture',
	'waffle',
	'wall',
	'wallet',
	'walrus',
	'war',
	'watch',
	'water',
	'wave',
	'wax',
	'weapon',
	'weather',
	'web',
	'week',
	'weight',
	'west',
	'whale',
	'wheat',
	'wheel',
	'while',
	'whip',
	'whistle',
	'white',
	'wife',
	'wind',
	'window',
	'wing',
	'winter',
	'wire',
	'wolf',
	'woman',
	'wonder',
	'wood',
	'wool',
	'word',
	'work',
	'world',
	'wound',
	'wrench',
	'wrist',
	'yak',
	'yard',
	'yarn',
	'year',
	'yellow',
	'yogurt',
	'youth',
	'zebra',
	'zinc'
]