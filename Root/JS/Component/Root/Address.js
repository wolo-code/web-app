// var latLng_p;
// var address;
// var gpId;

function getAddress(latLng, callback) {
	var geocoder = new google.maps.Geocoder;
	geocoder.geocode({'location': latLng}, function(address_components, status) {
		latLng_p = latLng;
		if (status === 'OK') {
			if (address_components[0]) {
				address = address_components[0].formatted_address;
				gpId = address_components[0].place_id;
				refreshAddress();
				if(typeof callback != 'undefined')
					callback(address_components);
			} else {
				console.log('No geoCoding results found');
			}
		} else {
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
	if(!address_text.classList.contains('hide')) {
		address_text_content.innerText = address;
	}
}

function copyAddress() {
	copyNodeText(address_text_content);
}
