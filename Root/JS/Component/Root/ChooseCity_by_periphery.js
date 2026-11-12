var chooseCity_by_periphery_Callback;
var chooseCity_by_periphery_List;
var chooseCity_by_periphery_gpid;

function showChooseCity_by_periphery_Message() {
	clearChooseCity_by_periphery_List();
	showChooseCity_by_periphery_List();
	if(typeof renderCityRegionMenu === 'function') renderCityRegionMenu('nearby', 'nearby');
	showOverlay(document.getElementById('choose_city_by_periphery_message'));
}

function isChooseCityCurrentCodeCity(city) {
	if(!city || typeof code_city == 'undefined' || !code_city) {
		return false;
	}
	return city.id == code_city.id;
}

function showChooseCity_by_periphery_List() {
	var container = document.getElementById('choose_city_by_periphery_message_list');
	var choices = [];
	var seen = new Set();
	if(typeof code_city !== 'undefined' && code_city) {
		if(!isRegionAnchor(code_city))
			choices.push({city: code_city, status: 'Current', select: hideChooseCity_by_periphery_Message});
		for(let key in chooseCity_by_periphery_gpid) {
			var city = chooseCity_by_periphery_gpid[key].city;
			seen.add(city.gp_id);
			if(city.gp_id == code_city.gp_id ||
				(city.administrative_level_2 == null && city.administrative_level_1 != null))
				continue;
			choices.push({city: city, key: key, status: 'Nearby', select: chooseCity_by_periphery_gpid_Continue});
		}
	}
	for(let key in chooseCity_by_periphery_List) {
		var city = chooseCity_by_periphery_List[key] && chooseCity_by_periphery_List[key].city;
		if(!city || seen.has(city.gp_id) || isChooseCityCurrentCodeCity(city))
			continue;
		choices.push({city: city, key: key, status: 'Nearby', select: chooseCity_by_periphery_Continue});
		if(city.gp_id)
			seen.add(city.gp_id);
	}
	renderCityChoices(container, choices);
}

function hideChooseCity_by_periphery_Message() {
	hideOverlay(document.getElementById('choose_city_by_periphery_message'));
	clearChooseCity_by_periphery_List();
}

function clearChooseCity_by_periphery_List() {
	document.getElementById('choose_city_by_periphery_message_list').innerHTML = '';
}

function chooseCity_by_periphery(list, callback) {
	chooseCity_by_periphery_List = list;
	chooseCity_by_periphery_Callback = callback;
	var peripheryMessage = document.getElementById('choose_city_by_periphery_message');
	if(peripheryMessage && peripheryMessage.classList && !peripheryMessage.classList.contains('hide'))
		showChooseCity_by_periphery_List();
}

function chooseCity_by_periphery_Continue(e) {
	var entry = chooseCity_by_periphery_List[e.currentTarget.data_id];
	hideChooseCity_by_periphery_Message();
	if(entry && marker && typeof chooseCity_by_periphery_Callback === 'function')
		chooseCity_by_periphery_Callback(entry.city);
}

function chooseCity_by_periphery_gpid_Continue(e) {
	var entry = chooseCity_by_periphery_gpid[e.currentTarget.data_id];
	var selectCity = chooseCity_by_periphery_Callback;
	hideChooseCity_by_periphery_Message();
	if(!entry || !marker || typeof selectCity !== 'function')
		return;

	var gpId = entry.city.gp_id;
	var selectedMarker = marker;
	var session = encode_session_id = Symbol();
	var timeout = setTimeout(function() { finish(null); }, 15000);

	function isCurrent() {
		return session === encode_session_id && selectedMarker === marker;
	}

	function finish(city) {
		clearTimeout(timeout);
		if(!isCurrent())
			return;
		if(city && city.center)
			selectCity(city);
		else {
			encode_session_id = Symbol();
			showNotification('Could not load that city. Choose it again to retry.');
		}
	}

	function loadCenter(city) {
		if(isCurrent())
			getCityCenterFromId(city, finish);
	}

	getCityFromCityGp_id(gpId, session, loadCenter, function() {
		if(!isCurrent())
			return;
		addCity(gpId, function(cityId) {
			if(isCurrent())
				getCityFromId(cityId, loadCenter, {notify: false});
		}, function() { finish(null); });
	});
}
