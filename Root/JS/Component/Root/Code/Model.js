// var code_city;
// var code_wcode;
// var code_postition;

function setCode(city, wcode, latLng) {
	if(typeof code_city != 'undefined' && code_city.gp_id != null && city.gp_id != code_city.gp_id) {
		document.getElementById('map').classList.remove('city_tally_true');
		document.getElementById('map').classList.add('city_tally_false');
	}
	else {
		document.getElementById('map').classList.remove('city_tally_false');
		document.getElementById('map').classList.add('city_tally_true');
	}
	code_wcode = wcode;
	code_postition = latLng;
	document.getElementById('accuracy_container').classList.add('hide');
	setInfoWindowText(getProperCityAccent(city), city.name_id, wcode.join(' '), latLng);
}

function clearCode() {
	code_postition = null;
}

function getCodeComplete() {
	return [].concat(code_city.country.toLowerCase(), [getCodeCityGroupName().toLowerCase()], code_city.name_id, code_wcode);
}

function getCodeFull() {
	var codeFull_city_part = [code_city.name_id].concat(code_wcode);
	var prefix;

	if(!multiple_country)
		prefix = [];
	else
		prefix = [code_city.country.toLowerCase()];
	if(multiple_group)
		prefix = prefix.concat([getCodeCityGroupName().toLowerCase()]);

	if(multiple_city)
		return prefix.concat(codeFull_city_part);
	else
		return codeFull_city_part;
}

function getCodeFull_capitalized() {
	var codeFull_city_part = [code_city.name].concat(code_wcode);
	var prefix;

	if(!multiple_country)
		prefix = [];
	else
		prefix = [code_city.country];
	if(multiple_group)
		prefix = prefix.concat([getCodeCityGroupName()]);

	if(multiple_city)
		return prefix.concat(codeFull_city_part);
	else
		return codeFull_city_part;
}

function getCodeFull_text() {
	return getCodeFull_capitalized().join(' ');
}

function getWcodeFull_formatted() {
	return formatWcode(getCodeFull_capitalized());
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

function getCodeCityNameId() {
	return code_city.name_id;
}

function getCodeCityCountryName() {
	return code_city.country;
}

function getCodeCityGroupName() {
	return getCityGroupName(code_city);
}

function getCityGroupName(city, separator='.') {
	if(typeof city.administrative_level_1 == 'undefined' || city.administrative_level_1 == null)
		return '';
	else {
		if(typeof city.administrative_level_2 == 'undefined' || city.administrative_level_2 == null)
			return city.administrative_level_1;
		else
			return city.administrative_level_1 + separator + city.administrative_level_2;
	}
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
