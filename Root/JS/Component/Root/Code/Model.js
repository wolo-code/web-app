// var code_city;
// var code_wcode;
// var code_postition;

function setCode(city, wcode, latLng, locating_encode) {
	var mapEl = document.getElementById('map');
	if(typeof code_city != 'undefined' && code_city.gp_id != null && city.gp_id != code_city.gp_id) {
		removeClassIfPresent(mapEl, 'city_tally_true');
		addClassIfPresent(mapEl, 'city_tally_false');
	}
	else {
		removeClassIfPresent(mapEl, 'city_tally_false');
		addClassIfPresent(mapEl, 'city_tally_true');
	}
	code_wcode = wcode;
	code_postition = latLng;
	if(locating_encode !== true)
		addClassIfPresent(document.getElementById('accuracy_container'), 'hide');
	setInfoWindowText(getProperCityAccent(city), city.name_id, getCodeWithPrecision(wcode), latLng, city);
	var entry = typeof getMapPlace === 'function' ? getMapPlace(marker) : null;
	if(entry) {
		entry.detectedCity = city.detected === true;
		entry.routeCode = entry.detectedCity ? null : getCanonicalWoloPathFromWords(getCodeComplete()).slice(1);
	}
	if(typeof syncRegionChoices === 'function') syncRegionChoices();
}

function clearCode() {
	code_postition = null;
	code_digipin = null;
}

function getCodeComplete() {
	if(typeof isRegionAnchor === 'function' && isRegionAnchor(code_city))
		return [code_city.name_id].concat(code_wcode);
	return [].concat(code_city.country.toLowerCase(), [getCodeCityGroupName().toLowerCase()], code_city.name_id, code_wcode);
}

function getCodeFull() {
	if(code_city.detected || (typeof isRegionAnchor === 'function' && isRegionAnchor(code_city)))
		return [code_city.name_id].concat(code_wcode);
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
	if(code_city.detected || (typeof isRegionAnchor === 'function' && isRegionAnchor(code_city)))
		return [code_city.name].concat(code_wcode);
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
	return getCodeWithPrecision(getCodeFull_capitalized());
}

function getWcodeFull_formatted() {
	return getActivePrecisionWoloWords() ? formatWcode([getCodeFull_text()]) : formatWcode(getCodeFull_capitalized());
}

function getCodeWCode() {
	return code_wcode;
}

function getCodeWcode_formatted() {
	return getActivePrecisionWoloWords() ? formatWcode([getCodeWithPrecision(getCodeWCode())]) : formatWcode(getCodeWCode());
}

function getActivePrecisionWoloWords() {
	return typeof code_postition !== 'undefined' && code_postition ? code_postition.precisionWords : null;
}

function getCodeWithPrecision(words) {
	const precisionWords = getActivePrecisionWoloWords();
	return precisionWords ? precisionWoloText(words, precisionWords) : words.join(' ');
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
