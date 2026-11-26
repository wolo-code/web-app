// const FUNCTIONS_BASE_URL;
// var curAddCityRequestId;

// 2^(10+5)
const N = 32768;
const A = 6378137;
const B = 6356752.314140;
const E_SQ = (A*A-B*B)/(A*A);
const DEG_RAD = Math.PI/180;

function lat_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	const x = Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r));
	return Math.abs((x*x*x)/(DEG_RAD*A*(1-E_SQ)));
}

function lng_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	return Math.abs(Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r))/(DEG_RAD*A*Math.cos(lat_r)));
}

function encodeData(value, d) {
	const i = Math.round(value/d);
	if(!isFinite(i) || i < 0 || i >= N)
		return null;
	return i;
}

function decodeData(data, d) {
	return data*d;
}

function getCityBegin(cityCenter) {
	var center = typeof plainCityCenter == 'function' ? plainCityCenter(cityCenter) : cityCenter;
	if(!center)
		return null;
	const lat = center.lat - lat_span_half(center.lat)*N;
	const lng = center.lng - lng_span_half(center.lat)*N;
	return {'lat': lat, 'lng': lng};
}

function isValidWoloIndexCode(code) {
	if(!code || code.length != 3)
		return false;
	for(var i = 0; i < 3; i++) {
		var index = code[i];
		if(index !== (index | 0) || index < 0 || index > 1023)
			return false;
	}
	return true;
}

function cityCoversPosition(city, position) {
	var begin = city && getCityBegin(city.center);
	return !!begin && isValidWoloIndexCode(encode__(begin, position));
}

function encode_(city, position, locating_encode) {
	if(!city || !city.center) {
		areaNotCovered(position);
		return;
	}
	const cityBegin = typeof getWoloAnchorBegin === 'function' ? getWoloAnchorBegin(city) : getCityBegin(city.center);
	if(!cityBegin) {
		areaNotCovered(position);
		return;
	}
	var gridPosition = typeof isRegionAnchor === 'function' && isRegionAnchor(city) ? regionGridPosition(city, position) : position;
	const code = gridPosition ? encode__(cityBegin, gridPosition) : null;
	if(!isValidWoloIndexCode(code)) {
		if(typeof isRegionAnchor === 'function' && !isRegionAnchor(city) && encodeRegionFallback(position, locating_encode))
			return;
		areaNotCovered(position);
		return;
	}
	code_city = city;
	setDecodeCity(city, 'history', true);
	if(position.precisionDecimals) {
		// This position can be reused when choosing another locality reference.
		position = Object.assign({}, position);
		position.precisionWords = encodePrecisionWolo(city, cityBegin, code, position.precisionDecimals);
		if(!position.precisionWords)
			showNotification('This grid cannot preserve the coordinate pair. Use latitude and longitude directly.');
	}
	setCodeWords(code, city, position, locating_encode);
}

function setCodeWords(code, city, position, locating_encode) {
	var message = [];

	for(const i of code)
		message.push(wordList.getWord(i));

	setCode(city, message, position, locating_encode);
}

function decode_(city, code, precisionWords, useDetectedCity) {
	if(typeof normalizeSavedWcode == 'function')
		code = normalizeSavedWcode(code);
	else if(code && code.length > 3)
		code = code.slice(-3);
	var cityBegin = city && (typeof getWoloAnchorBegin === 'function' ? getWoloAnchorBegin(city) : getCityBegin(city.center));
	if(!city || !cityBegin || !code || code.length != 3) {
		if(typeof showNotification == 'function')
			showNotification('Could not open saved address');
		return;
	}
	var data = [];
	data[0] = wordList.indexOf(code[0]);
	data[1] = wordList.indexOf(code[1]);
	data[2] = wordList.indexOf(code[2]);
	if(data[0] < 0 || data[1] < 0 || data[2] < 0) {
		if(typeof showNotification == 'function')
			showNotification('Could not open saved address');
		return;
	}
	var position = precisionWords ? decodePrecisionWolo(city, cityBegin, data, precisionWords) : decode__(cityBegin, data);
	if(precisionWords && !position) {
		showInvalidCodeDialog(precisionWoloText([city.name].concat(code), precisionWords), 'Invalid Precision Wolo Code');
		return;
	}
	if(!precisionWords && typeof isRegionAnchor === 'function' && isRegionAnchor(city)) {
		position = positionFromRegionGrid(city, position);
		if(!position) {
			showNotification('This code is outside the supported coordinate range');
			return;
		}
	}
	if(useDetectedCity) {
		openDetectedCityDecode(position);
		return;
	}
	code_city = city;
	var sameReference = typeof selected_decode_city !== 'undefined' && selected_decode_city && selected_decode_city.id === city.id;
	var source = sameReference ? selected_decode_city_source : 'history';
	setDecodeCity(city, source, true);
	openDecodedLocation(city, position, code);
}

function openDetectedCityDecode(position) {
	// The detected center gives a position, but saving and sharing require a published reference.
	var point = regionPosition({lat: position.lat, lng: wrapRegionLongitude(position.lng)});
	var choice = point && regionAnchorsForPosition(point)[0];
	var city = choice && choice.anchor;
	var begin = city && getWoloAnchorBegin(city);
	var gridPosition = begin && regionGridPosition(city, point);
	var indices = gridPosition && encode__(begin, gridPosition);
	if(!isValidWoloIndexCode(indices)) {
		showDecodeReferenceRequired('Couldn’t decode with the detected city.');
		return;
	}
	if(position.precisionDecimals) {
		point.precisionDecimals = position.precisionDecimals;
		point.precisionWords = encodePrecisionWolo(city, begin, indices, point.precisionDecimals);
		if(!point.precisionWords) {
			showDecodeReferenceRequired('Couldn’t preserve the precision of this Wolo Code.');
			return;
		}
	}
	code_city = city;
	setDecodeCityStatus('');
	openDecodedLocation(city, point, indices.map(index => wordList.getWord(index)));
}

function openDecodedLocation(city, position, code) {
	setCodeCoord(city, position, code);
	addClassIfPresent(document.getElementById('notification_top'), 'hide');
	addClassIfPresent(document.getElementById('wait_loader'), 'hide');
}

function encode__(city_begin, position) {
	const lat_diff = encodeData(position.lat - city_begin.lat, lat_span_half(city_begin.lat)*2);
	const lng_diff = encodeData(position.lng - city_begin.lng, lng_span_half(city_begin.lat)*2);
	if(lat_diff == null || lng_diff == null)
		return null;
	const word_index_1 = lat_diff >> 5;
	const word_index_2 = lng_diff >> 5;
	const word_index_3 = (lat_diff & 0x001F) << 5 | (lng_diff & 0x001F);
	return [word_index_1, word_index_2, word_index_3];
}

function decode__(city_begin, code) {
	const word_index_1 = code[0];
	const word_index_2 = code[1];
	const word_index_3 = code[2];
	const lat_diff_bin = word_index_1 << 5 | word_index_3 >> 5;
	const lng_diff_bin = word_index_2 << 5 | word_index_3 & 0x001F;
	const lat_diff = decodeData(lat_diff_bin, lat_span_half(city_begin.lat)*2);
	const lng_diff = decodeData(lng_diff_bin, lng_span_half(city_begin.lat)*2);
	const lat = city_begin.lat + lat_diff;
	const lng = city_begin.lng + lng_diff;

	return({"lat":lat, "lng":lng});
}

function setCodeCoord(city, position, code) {
	var codeText = typeof precisionWoloText === 'function' ? precisionWoloText(code, position.precisionWords) : code.join(' ');
	var linkZoom = typeof pendingWoloLinkZoom === 'undefined' ? undefined : pendingWoloLinkZoom;
	if(linkZoom !== undefined)
		pendingWoloLinkZoom = undefined;
	function showLocation() {
		focus__(city, position, code, linkZoom);
		if(keepAddressPanelOpen) {
			latLng_p = position;
			showAddress();
		}
	}
	if(initWCode_jumpToMap) {
		initWCode_jumpToMap = false;
		if(redirect_isActive()) {
			redirect_start(city.name, codeText, position, showLocation);
			getAddress(position);
		}
		else
			window.location.replace(getIntentURL(position, city.name + ' ' + codeText));
		return;
	}
	if(initWCode_jump_ask) {
		initWCode_jump_ask = false;
		external_show(position, city.name, codeText);
	}
	getAddress(position);
	showLocation();
}
