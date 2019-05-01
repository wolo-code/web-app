// var latLng_p;
// var address;
// var gpId;

function getAddress(latLng) {
	var geocoder = new google.maps.Geocoder;
	geocoder.geocode({'location': latLng}, function(results, status) {
			latLng_p = latLng;
			if (status === 'OK') {
				if (results[0]) {
					address = results[0].formatted_address;
					gpId = results[0].place_id;
					refreshAddress();
					if(pendingFillForm) {
						getAddressCity(results)
						pendingFillForm = null;
					}
				} else {
					console.log('No geoCoding results found');
				}
			} else {
				console.log('Geocoder failed due to: ' + status);
			}
		});
}

function getAddressCity(address_components) {
	var found_city_i;
	var found_group_i;
	var found_country_i;
	for(var i = address_components.length-1; i >= 0; i--) {
		if(address_components[i].types.includes('locality')) {
			found_city_i = i;
			break;
		} else if (address_components[i].types.includes('administrative_area_level_1')) {
			found_group_i = i;
			found_city_i = i;
		} else if (address_components[i].types.includes('administrative_area_level_2')) {
			found_city_i = i;
		} else if ( found_city_i == null && (address_components[i].types.includes('sublocality') || address_components[i].types.includes('sublocality_level_1')) ) {
			found_city_i = i;
		} else if (address_components[i].types.includes('country')) {
			found_country_i = i;
		}
	}
	var gp_id;
	var city_lat;
	var city_lng;
	var city_name;
	var city_accent;
	if(found_city_i != null) {
		gp_id = address_components[found_city_i].place_id;
		city_lat = address_components[found_city_i].geometry['location']['lat']();
		city_lng = address_components[found_city_i].geometry['location']['lng']();
		city_name = address_components[found_city_i].address_components[0].short_name;
		city_accent = address_components[found_city_i].address_components[0].long_name;
	}
	var group = found_group_i != null? address_components[found_group_i].address_components[0].long_name : null;
	var country = found_country_i != null? address_components[found_country_i].address_components[0].long_name : null;
	fillForm(gp_id, city_lat, city_lng, city_name, city_accent, group, country);
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
	address = '';
	gpId = '';
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

function setAddress(a, g) {
	address = a;
	gpId = g;
	refreshAddress();
}
