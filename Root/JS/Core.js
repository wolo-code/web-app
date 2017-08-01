function getCityFromLocation(latLng) {
	//ToDo
	return BANGALORE;
}

function getCityFromName(cityName) {
	//ToDo
	return BANGALORE;
}

function getCityBegin(cityCenter) {
	var CITY_SPAN_PERIMETER = 0.5/2;
	var lat = cityCenter.lat - CITY_SPAN_PERIMETER;
	var lng = cityCenter.lng - CITY_SPAN_PERIMETER;
	return {'lat': lat, 'lng': lng};
}

function encode(position) {
	var city = getCityFromLocation(position);
	return city.name + " " + encode_(getCityBegin(city.center), position);
}

function decode(words) {
	var city = getCityFromName(words[0]);
	return decode_(getCityBegin(city.center), words.splice(1, words.length-1))
}
