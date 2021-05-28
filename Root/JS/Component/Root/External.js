//var external_latLng;
//var external_wolo_code_string;

function external_close() {
	external_hide();
}

function external_proceed() {
	window.location.replace(getIntentURL(external_latLng, external_wolo_code_string));
}

function external_show(latLng, city_string, wcode_string) {
	external_latLng = latLng;
	external_wolo_code_string = city_string + ' ' + wcode_string;
	showOverlay(document.getElementById('external_message'));
	document.getElementById('external_wcode_city').innerText = city_string;
	document.getElementById('external_wcode_code').innerText = wcode_string;
	document.getElementById('external_address').innerText = '';
	document.body.classList.add('external');
}

function external_hide() {
	hideOverlay(document.getElementById('external_message'));
	document.body.classList.remove('external');
}
