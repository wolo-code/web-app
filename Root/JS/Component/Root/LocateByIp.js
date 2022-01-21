function getCityByIp() {

	var http = new XMLHttpRequest();
	http.open('POST', FUNCTIONS_BASE_URL+'/'+'cityByIp', true);

	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', '1');
	http.requestId = ++curGeoIpRequestId;

	pushLoader();
	http.onreadystatechange = function() {
		if(http.readyState == 4) {
			if(http.requestId == curGeoIpRequestId) {
				popLoader();
				if(http.status == 200) {

						if(http.responseText == '')
							console.log(http.responseText);
						else {
							geoIp_country_code = JSON.parse(http.responseText).country;
							geoIp_city_name = JSON.parse(http.responseText).city;
						}
				}
				else if(http.status == 416) {
					notInRange(position);
				}
			}
		}
	}

	http.send( );
	return '';
}
