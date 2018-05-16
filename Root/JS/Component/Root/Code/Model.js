var wcode_city;
var wcode_code;
var wcode_postition;

function setWcode(wcode, latLng) {
	wcode_city = wcode[0];
	wcode_code = wcode.slice(1, wcode.length);
	wcode_postition = latLng;
	
	setInfoWindowText(wcode, latLng);
}

function clearWcode() {
	wcode_postition = null;
}

function getWcodeFull() {
	return [wcode_city].concat(wcode_code);
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
	return wcode_city;	
}
