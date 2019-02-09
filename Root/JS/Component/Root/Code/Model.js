var code_city;
var code_wcode;
var code_postition;

function setCode(city, wcode, latLng) {
	code_city = city;
	code_wcode = wcode;
	code_postition = latLng;

	setInfoWindowText(getProperCityAccent(city), city.name, wcode.join(' '), latLng);
}

function clearCode() {
	code_postition = null;
}

function getCodeFull() {
	return [code_city.name].concat(code_wcode);
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

function getCodeCity() {
	return code_city.name;
}

function formatWcode(code) {
	return ["\\"].concat(code).concat(["/"]);
}
