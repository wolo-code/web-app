function getCityFromLocation(latLng) {
	//ToDo
	return BANGALORE;
}

function getCityFromName(cityName) {
	//ToDo
	return BANGALORE;
}

function encode(position) {
	var city = getCityFromLocation(position);
	var code_ = encode_(city.begin, position)
	return city.name + " " + code_;
}

function decode(words) {
	var city = getCityFromName(words[0]);
	return decode_(city.begin, words.splice(1, words.length-1))
}
