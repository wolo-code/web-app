function encode_(city_begin, position) {
	var http = new XMLHttpRequest();
	//var url = 'http://localhost:8010/WCodes-code/us-central1/encode';
	var url = 'https://us-central1-wcode-0.cloudfunctions.net/encode';//
	http.open('POST', url, true);

//	http.setRequestHeaders('Content-type', 'version');
	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', 1);

	http.onreadystatechange = function() {//Call a function when the state changes.
		if(http.readyState == 4 && http.status == 200) {
			setCodeWords(http.responseText, position);
		}
	}

	http.send( stringifyEncodeData(city_begin, position) );
	return '';
}

function setCodeWords(code, position) {
	var message = [];
	message.push('Bangalore');
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

function decode_(city_begin, code) {

	var http = new XMLHttpRequest();
	// var url = 'http://localhost:8010/WCodes-code/us-central1/decode';
	var url = 'https://us-central1-wcode-0.cloudfunctions.net/decode';
	http.open('POST', url, true);

//	http.setRequestHeaders('Content-type', 'version');
	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', 1);

	http.onreadystatechange = function() {//Call a function when the state changes.
		if(http.readyState == 4 && http.status == 200) {
			setCodeCoord(http.responseText, code);
		}
	}

	var data = [];
	data[0] = wordList.indexOf(code[0]);
	data[1] = wordList.indexOf(code[1]);
	data[2] = wordList.indexOf(code[2]);
	http.send( stringifyDecodeData(city_begin, data) );

	lat = city_begin.lat;
	lng = city_begin.lng;
	return {
		lat: (function() {
			return lat
		})(),
		lng: (function() {
			return lng
		})()
	};
}

function stringifyDecodeData(city_begin, code) {
	var object = {};
	object['city_begin'] = city_begin;
	object['code'] = code;
	return JSON.stringify(object);
}

function setCodeCoord(codeIndex, code) {
	var object = JSON.parse(codeIndex);
	code.unshift('Bangalore');
	focus__(object, code);
}
