var chooseCity_by_periphery_Callback;
var chooseCity_by_periphery_List;
var chooseCity_by_periphery_gpid;

function showChooseCity_by_periphery_Message() {
	clearChooseCity_by_periphery_List();
	showChooseCityCurrentReference();
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
		for(let key in chooseCity_by_periphery_gpid) {
			var city = chooseCity_by_periphery_gpid[key].city;
			seen.add(city.gp_id);
			if(city.gp_id == code_city.gp_id ||
				(city.administrative_level_2 == null && city.administrative_level_1 != null))
				continue;
			choices.push({city: city, key: key, select: chooseCity_by_periphery_gpid_Continue});
		}
	}
	for(let key in chooseCity_by_periphery_List) {
		var city = chooseCity_by_periphery_List[key] && chooseCity_by_periphery_List[key].city;
		if(!city || seen.has(city.gp_id) || isChooseCityCurrentCodeCity(city))
			continue;
		choices.push({city: city, key: key, select: chooseCity_by_periphery_Continue});
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
	document.getElementById('choose_city_by_periphery_message_current_city').innerHTML = '';
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
	infoWindow_setContent(MESSAGE_LOADING);
	hideChooseCity_by_periphery_Message();
	var id = e.currentTarget.data_id;
	var city = chooseCity_by_periphery_List[id].city;
	chooseCity_by_periphery_Callback(city);
}

function showChooseCityCurrentReference() {
	if(typeof code_city == 'undefined' || !code_city) {
		return;
	}
	var container = document.getElementById('choose_city_by_periphery_message_current_city');
	var row = document.createElement('div');
	row.innerHTML = getFullCity(code_city);
	row.addEventListener('click', hideChooseCity_by_periphery_Message);
	container.appendChild(row);
}

function chooseCity_by_periphery_gpid_Continue(e) {
	infoWindow_setContent(MESSAGE_LOADING);
	hideChooseCity_by_periphery_Message();
	var id = e.currentTarget.data_id;
	var gp_id = chooseCity_by_periphery_gpid[id].city.gp_id;
	getCityFromCityGp_id (
		gp_id,
		function(city) {
			getCityCenterFromId(city, function(city) {
				chooseCity_by_periphery_Callback(city);
			});
		},
		function() {
			addCity(gp_id, function(city_id) {
				getCityFromId(city_id, function(city) {
					getCityCenterFromId(city, function(city) {
						chooseCity_by_periphery_Callback(city);
					})
				})
			})
		}
	);
}
