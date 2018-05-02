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
