function addCity(gp_id, callback, onFailure) {

	var http = new XMLHttpRequest();
	http.open('POST', FUNCTIONS_BASE_URL+'/'+'add-city', true);

	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', '1');
	http.requestId = ++curAddCityRequestId;
	http.timeout = 10000;

	function finish() {
		popLoader();
		if(http.requestId !== curAddCityRequestId)
			return;
		var cityId;
		if(http.status === 200) {
			try {
				cityId = JSON.parse(http.responseText)?.added;
			}
			catch(error) {
				// A malformed response is handled as a failed lookup.
			}
		}
		if(isUsableCityId(cityId))
			callback(cityId);
		else if(typeof onFailure === 'function')
			onFailure();
	}

	pushLoader();
	http.onloadend = finish;
	try {
		http.send(stringifyAddCityData(gp_id));
	}
	catch(error) {
		finish();
	}

}

function stringifyAddCityData(gp_id) {
	var object = {};
	object['place_id'] = gp_id;
	return JSON.stringify(object);
}
