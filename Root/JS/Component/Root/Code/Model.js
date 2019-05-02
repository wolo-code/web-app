var code_city;
var code_wcode;
var code_postition;

function setCode(city, wcode, latLng) {
	code_city = city;
	code_wcode = wcode;
	code_postition = latLng;

	setInfoWindowText(getProperCityAccent(city), city.name_id, wcode.join(' '), latLng);
}

function clearCode() {
	code_postition = null;
}

function getCodeFull() {
	var codeFull_city_part = [code_city.name].concat(code_wcode);
	var prefix;

	if(!multiple_country)
		prefix = [];
	else
		prefix = [code_city.country.toLowerCase()];
	if(multiple_group)
		prefix = prefix.concat([code_city.group.toLowerCase()]);

	if(multiple_city)
		return prefix.concat(codeFull_city_part);
	else
		return codeFull_city_part;
}

function getWcodeFull_formatted() {
	return formatWcode(getCodeFull());
}

function getCodeWCode() {
	return code_wcode;
}

function getCodeWcode_formatted() {
	return formatWcode(getCodeWCode());
}

function getCodeCityName() {
	return code_city.name;
}

function getCodeGroupName() {
	return code_city.group;
}

function getCodeCityCountryName() {
	return code_city.country;
}

function getCodeCityGroupName() {
	return code_city.group;
}

function getCodeCity() {
	return code_city;
}

function formatWcode(code) {
	return ["\\"].concat(code).concat(["/"]);
}

function getCodeCityProperCityAccent() {
	return getProperCityAccent(code_city);
}
