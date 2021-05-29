// const FUNCTIONS_BASE_URL;
// var curEncRequestId;
// var curDecRequestId;
// var curAddCityRequestId;

function encode_(city, position, session_id) {
	if(typeof session_id != 'undefined' && session_id == encode_session_id)
		code_city = city;
	else
		code_city = null;
	var http = new XMLHttpRequest();
	http.open('POST', FUNCTIONS_BASE_URL+'/'+'encode', true);

	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', '1');
	http.requestId = ++curEncRequestId;

	pushLoader();
	http.onreadystatechange = function() {
		if(http.readyState == 4) {
			if(http.requestId == curEncRequestId)
				if(typeof session_id != 'undefined' && session_id == encode_session_id) {
					popLoader();
					if(http.status == 200) {
						setCodeWords(http.responseText, city, position);
					}
					else if(http.status == 416) {
						notInRange(position);
					}
				}
		}
	}

	http.send( stringifyEncodeData(city.center, position) );
	return '';
}

function setCodeWords(code, city, position) {
	var message = [];
	var object = JSON.parse(code).code;

	for(const i of object)
		message.push(wordList.getWord(i));

	setCode(city, message, position);
}

function stringifyEncodeData(city_center, position) {
	var object = {};
	object['city_center'] = city_center;
	object['position'] = position;
	return JSON.stringify(object);
}

function decode_(city, code) {
	code_city = city;
	var http = new XMLHttpRequest();
	http.open('POST', FUNCTIONS_BASE_URL+'/'+'decode', true);

	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', '1');
	http.requestId = ++curDecRequestId;

	pushLoader();
	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			if(http.requestId == curDecRequestId) {
				setCodeCoord(city, http.responseText, code);
				notification_top.classList.add('hide');
				popLoader();
			}
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

function setCodeCoord(city, codeIndex, code) {
	var latLng = JSON.parse(codeIndex);
	if(initWCode_jumpToMap) {
		initWCode_jumpToMap = false;
		window.location.replace(getIntentURL(latLng, city.name + ' ' + code.join(' ')));
	}
	else {
		if(initWCode_jump_ask) {
			initWCode_jump_ask = false;
			external_show(latLng, city.name, code.join(' '));
		}
		getAddress(latLng);
		focus__(city, latLng, code);
	}
}
