function getCityByIp(retry_count, callback, loader_held) {
	if(typeof retry_count == 'function') {
		callback = retry_count;
		retry_count = 0;
	}

	var http = new XMLHttpRequest();
	http.open('POST', FUNCTIONS_BASE_URL+'/'+'cityByIp', true);

	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', '1');
	http.requestId = ++curGeoIpRequestId;
	retry_count = retry_count || 0;

	if(!loader_held) {
		pushLoader();
		loader_held = true;
	}
	http.onreadystatechange = function() {
		if(http.readyState == 4) {
			if(http.requestId == curGeoIpRequestId) {
				if(http.status == 200) {
					if(http.responseText == '') {
						retryCityByIp(retry_count, callback, loader_held);
						return;
					}
					else {
							var response;
							try {
								response = JSON.parse(http.responseText);
							}
							catch(error) {
								retryCityByIp(retry_count, callback, loader_held);
								return;
							}
							var city_name = normalizeIpCityName(response.city);

							if(city_name == null) {
								retryCityByIp(retry_count, callback, loader_held);
								return;
							}

							popLoader();
							loader_held = false;
							geoIp_country_code = response.country;
							geoIp_city_name = city_name;
							setDecodeCityFromIp(city_name);
							if(typeof callback == 'function')
								callback(city_name);
							if(pendingWords_geo) {
								var pending_words = pendingWords_geo;
								pendingWords_geo = null;
								decodeWithIpCity(pending_words);
							}
					}
				}
				else {
					if(http.status == 416)
						notInRange(position);
					popLoader();
				}
			}
			else if(loader_held)
				popLoader();
		}
	}

	http.send( );
	return '';
	
}

function normalizeIpCityName(city_name) {
	if(typeof city_name != 'string')
		return null;

	city_name = city_name.trim();
	if(city_name == '' || city_name.toLowerCase() == 'undefined')
		return null;

	return city_name;
}

function retryCityByIp(retry_count, callback, loader_held) {
	var MAX_CITY_BY_IP_RETRIES = 2;
	var CITY_BY_IP_RETRY_DELAY = 750;

	if(retry_count < MAX_CITY_BY_IP_RETRIES) {
		setTimeout(function() {
			getCityByIp(retry_count + 1, callback, loader_held);
		}, CITY_BY_IP_RETRY_DELAY);
	}
	else {
		if(loader_held)
			popLoader();
		geoIp_city_name = '';
		failPendingIpCityDecode();
	}
}

function failPendingIpCityDecode() {
	if(!pendingWords_geo)
		return;

	pendingWords_geo = null;
	popLoader();
	showNotification(PURE_WCODE_CITY_FAILED);
}
