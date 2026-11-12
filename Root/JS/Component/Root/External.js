//var external_latLng;
//var external_wolo_code_string;

function external_close() {
	if(redirect_isActive())
		redirectCancel();
	else
		external_hide();
}

function external_proceed_external() {
	window.location.assign(getIntentURL(external_latLng, external_wolo_code_string));
}

function external_proceed_internal() {
	toggleMapType();
	external_hide();
}

function external_show(latLng, city_string, wcode_string) {
	external_latLng = latLng;
	external_wolo_code_string = city_string + ' ' + wcode_string;
	showOverlay(document.getElementById('external_message'));
	external_setCode(city_string, wcode_string);
	document.getElementById('external_address').textContent = '';
	document.body.classList.add('external');
}

function external_setCode(city, code) {
	document.getElementById('external_wcode_city').innerText = city;
	document.getElementById('external_wcode_code').innerText = code;
}

function external_hide() {
	hideOverlay(document.getElementById('external_message'));
	document.body.classList.remove('external');
}
