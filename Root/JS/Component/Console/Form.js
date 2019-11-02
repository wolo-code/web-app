function fillForm(address_object) {
	city_gpid.value = address_object.gp_id;
	city_lat.value = address_object.city_lat;
	city_lng.value = address_object.city_lng;
	city_name.value = address_object.city_name;
	city_accent.value = address_object.city_accent;
	city_group.value = address_object.group;
	city_country.value = address_object.country;
}

function clearForm() {
	city_gpid.value = '';
	city_lat.value = '';
	city_lng.value = '';
	city_country.value = '';
	city_group.value = '';
	city_name.value = '';
	city_accent.value = '';
}
