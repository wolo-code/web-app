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
