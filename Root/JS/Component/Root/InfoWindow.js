function initInfoWindow() {
	if(infoWindow)
		return;
	var card = new google.maps.InfoWindow();
	card.addListener('close', function() {
		var entry = mapPlaces.find(function(place) { return place.card === card; });
		if(!entry)
			return;
		entry.card = null;
		entry.details = null;
		if(!entry.result) {
			entry.marker.setMap(null);
			mapPlaces = mapPlaces.filter(function(place) { return place !== entry; });
		}
		renderMapPlaces();
	});
	infoWindow = card;
}

function retainActiveMapCard() {
	var entry = getMapPlace(marker);
	if(!entry || !isInfoWindowOpen())
		return;
	entry.card = infoWindow;
	entry.details = {
		city: code_city,
		words: code_wcode,
		position: code_postition,
		address: address,
		plusCode: code_plus_code,
		title: current_title,
		segment: current_segment,
		savedAddress: current_address,
		addressLines: current_address_lines,
		nearby: chooseCity_by_periphery_List,
		addressCities: chooseCity_by_periphery_gpid,
		chooseCity: chooseCity_by_periphery_Callback
	};
	if(infoWindow.getContent() === MESSAGE_LOADING) {
		var content = document.createElement('div');
		content.textContent = entry.name || marker.getTitle();
		infoWindow.setContent(content);
	}
	marker = null;
	infoWindow = null;
	renderMapPlaces();
}

function activateMapCard(card) {
	if(card === infoWindow)
		return true;
	var entry = mapPlaces.find(function(place) { return place.card === card; });
	if(!entry)
		return false;
	cleanUp(false, true);
	var details = entry.details;
	entry.card = null;
	entry.details = null;
	marker = entry.marker;
	infoWindow = card;
	code_city = details.city;
	code_wcode = details.words;
	code_postition = details.position;
	latLng_p = resolveLatLng(marker.getPosition());
	code_digipin = getDigipinForPosition(latLng_p);
	code_plus_code = details.plusCode;
	address = details.address;
	current_title = details.title;
	current_segment = details.segment;
	current_address = details.savedAddress;
	current_address_lines = details.addressLines;
	chooseCity_by_periphery_List = details.nearby;
	chooseCity_by_periphery_gpid = details.addressCities;
	chooseCity_by_periphery_Callback = details.chooseCity;
	renderMapPlaces();
	return true;
}

function infoWindow_setContent(string) {
	initInfoWindow();
	infoWindow.setContent(string);
}

function getDigipinForPosition(latLng) {
	if(!latLng || typeof digipin == 'undefined') {
		return null;
	}
	try {
		if(digipin.isValidCoordinate(latLng.lat, latLng.lng)) {
			return String(digipin.encode(latLng.lat, latLng.lng) || '').toUpperCase();
		}
	}
	catch(error) {}
	return null;
}

function getPlusCodeForPosition(latLng) {
	if(!latLng || typeof pluscode == 'undefined' || typeof pluscode.encode != 'function') {
		return null;
	}
	try {
		return pluscode.encode(latLng.lat, latLng.lng);
	}
	catch(error) {}
	return null;
}

function extractPlusCodeFromGeocode(results) {
	if(!results || !results.length) {
		return null;
	}
	var i;
	var plus;
	for(i = 0; i < results.length; i++) {
		plus = results[i] && results[i].plus_code;
		if(plus) {
			return plus.compound_code || plus.global_code || null;
		}
	}
	return null;
}

function setInfoWindowText(city_accent, city_name, code_string, latLng, city) {
	initInfoWindow();
	if(typeof isRegionAnchor === 'function' && isRegionAnchor(city))
		city_accent = getRegionReferenceHTML(city, city_accent);
	if(latLng) {
		latLng_p = latLng;
	}
	code_digipin = getDigipinForPosition(latLng);
	code_plus_code = getPlusCodeForPosition(latLng);
	var card = infoWindow;
	var content = document.createElement('div');
	content.className = 'map_card_content';
	content.innerHTML = "<div class='map_card_code'><div class='map_card_code_left'><span class='slash'>\\</span> <span class='infowindow_code map_card_city'><span class='control'>" + city_accent + "</span></span></div><div class='map_card_code_right'><span class='infowindow_code map_card_words'>" + code_string + "</span> <span class='slash'>/</span></div></div><div class='map_card_actions center'><img class='map_card_address control' src=" + svg_address + " ><div class='map_card_launch control'><img src=" + svg_launch + " ></div><div class='map_card_label control'><div class='shield'></div><img src=" + svg_label + " ></div></div>";
	content.addEventListener('pointerdown', function() { activateMapCard(card); });
	function forThisCard(action) {
		return function() {
			if(activateMapCard(card))
				action();
		};
	}
	content.querySelector('.map_card_city > .control').addEventListener('click', forThisCard(showChooseCity_by_periphery_Message));
	addLongpressListener(content.querySelector('.map_card_words'), forThisCard(copyWcodeFull), forThisCard(copyWcodeCode));
	addLongpressListener(content.querySelector('.map_card_address'), forThisCard(toggleAddress), forThisCard(handleShareWCode));
	addLongpressListener(content.querySelector('.map_card_launch'), forThisCard(gotoCoordinate), forThisCard(copyWcodeJumpLink));
	addLongpressListener(content.querySelector('.map_card_label'), forThisCard(showQR), forThisCard(downloadQR_minimal));
	infoWindow_setContent(content);
	var entry = getMapPlace(marker);
	if(entry && !entry.result) {
		entry.name = city_name + ' ' + code_string;
		renderMapPlaces();
	}
	showInfoWindow();
}

function isInfoWindowOpen() {
	if(!infoWindow)
		return false;
	if(typeof infoWindow.isOpen === 'boolean')
		return infoWindow.isOpen;
	return !!infoWindow.get('map');
}

function showInfoWindow() {
	initInfoWindow();
	if(typeof holdInfoWindowForTryCityZoomOut !== 'undefined' && holdInfoWindowForTryCityZoomOut)
		return;
	infoWindow.open({map: map, anchor: marker, shouldFocus: false});
	if(marker)
		trackActiveMapPlace();
	syncMapPlaceIndices();
}

function syncMapPlaceIndices() {
	var multiple = mapPlaces.length > 1;
	var addressBadge = document.getElementById('address_text_place_index');
	if(addressBadge) {
		var index = mapPlaces.indexOf(getMapPlace(marker));
		addressBadge.hidden = !multiple || index < 0;
		addressBadge.textContent = addressBadge.hidden ? '' : getMapPlaceLabel(index);
		addressBadge.setAttribute('aria-label', addressBadge.hidden ? '' : 'Place ' + getMapPlaceLabel(index));
	}
}
