// var latLng_p;
// var address;
// var gpId;

function getAddress(latLng, session_id, callback) {
	var geocoder = new google.maps.Geocoder;
	geocoder.geocode({'location': latLng}, function(address_components, status) {
		latLng_p = latLng;
		if (status === 'OK') {
			if (address_components[0]) {
				getCity_by_address_list(address_components);
				address = address_components[0].formatted_address;
				gpId = getCityGpId(address_components);
				if(typeof code_city != 'undefined' && code_city.gp_id != null && gpId != code_city.gp_id) {
					setCurrentCity_status(false);
				}
				else {
					setCurrentCity_status(true);
				}
				if(!current_title)
					refreshAddress();
				if(typeof callback != 'undefined') {
					sessionForwarder(session_id, callback, [address_components]);
				}
			} else {
				console.log('No geoCoding results found');
			}
		} else {
			if(status == 'ZERO_RESULTS')
				noCity(latLng_p);
			else
				console.log('Geocoder failed due to: ' + status);
		}
		if(pendingCitySubmit) {
			execSubmitCity();
			pendingCitySubmit = false;
		}
	});
}

function toggleAddress() {
	if(address_text.classList.value == 'hide')
		showAddress();
	else
		hideAddress();
}

function showAddress() {
	document.getElementById('address_text_title').innerText = '';
	document.getElementById('address_text_segment').innerText = '';
	address_text_content.innerText = address;
	address_text.classList.remove('hide');
}

function hideAddress() {
	address_text_content.innerText = '';
	address_text.classList.add('hide');
}

function clearAddress() {
	address = null;
	gpId = null;
	address_text_content.innerText = '';
}

function refreshAddress() {
	address_text_content.innerText = address;
	external_address.innerText = address;
}

function copyAddress() {
	if(address_text.classList.contains('hide')) {
		showAddress();
	}
	copyNodeText(address_text_content);
}
