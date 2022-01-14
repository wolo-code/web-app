const IP_GEO_BASE_URL = "https://extreme-ip-lookup.com"
var curIpGeoRequestId = 0;

function getCityFromIp(callback, ar_param) {
	var http = new XMLHttpRequest();
	http.open('POST', IP_GEO_BASE_URL+'/'+'json', true);

	http.setRequestHeader('Content-type', 'application/json');
	http.setRequestHeader('version', '1');
	http.requestId = ++curIpGeoRequestId;

	pushLoader();
	http.onreadystatechange = function() {
		if(http.readyState == 4) {
			if(http.requestId == curIpGeoRequestId)
				if(true) {
					popLoader();
					if(http.status == 200) {
						callback(JSON.parse(http.responseText));
					}
				}
		}
	}

	http.send();

}
