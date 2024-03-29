function addCity(gp_id, callback) {

	var http = new XMLHttpRequest();
	http.open('POST', FUNCTIONS_BASE_URL+'/'+'add-city', true);

	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', '1');
	http.requestId = ++curAddCityRequestId;

	pushLoader();
	http.onreadystatechange = function() {
		if(http.readyState == 4 && http.status == 200) {
			if(http.requestId == curAddCityRequestId) {
				callback(JSON.parse(http.responseText).added);
				popLoader();
			}
		}
	}

	http.send( stringifyAddCityData(gp_id) );

}

function stringifyAddCityData(gp_id) {
	var object = {};
	object['place_id'] = gp_id;
	return JSON.stringify(object);
}
