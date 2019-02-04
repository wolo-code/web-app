var wcode_city_id;
var wcode_city_name;
var wcode_code;
var wcode_postition;

function setWcode(code, latLng) {
	wcode_city_name = code[0].toLocaleLowerCase();
	wcode_city_id = getCityIdFromName(wcode_city_name);
	wcode_code = code.slice(1, code.length);
	wcode_postition = latLng;

	setInfoWindowText(getCityAccentFromId(wcode_city_id), code, latLng);
}

function clearWcode() {
	wcode_postition = null;
}

function getWcodeFull() {
	return [wcode_city_name].concat(wcode_code);
}

function formatWcode(wcode) {
	return ["\\"].concat(wcode).concat(["/"]);
}

function getWcodeFull_formatted() {
	return formatWcode(getWcodeFull());
}

function getWcodeCode() {
	return wcode_code;
}

function getWcodeCode_formatted() {
	return formatWcode(getWcodeCode());
}

function getWcodeCity() {
	return wcode_city_name;
}
