function fillForm(gpid, lat, lng, city, accent, group, country) {
	city_gpid.value = gpid;
	city_lat.value = lat;
	city_lng.value = lng;
	city_name.value = city;
	city_accent.value = accent;
	city_group.value = group;
	city_country.value = country;
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
