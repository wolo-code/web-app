var chooseCity_by_periphery_Callback;
var chooseCity_by_periphery_List;
var chooseCity_by_periphery_gpid;
var chooseCity_by_periphery_List_gpids = [];

function showChooseCity_by_periphery_Message() {
	clearChooseCity_by_periphery_List();
	showChooseCity_by_periphery_gpid();
	showChooseCity_by_periphery_List();
	choose_city_by_periphery_message.classList.remove('hide');
}

function showChooseCity_by_periphery_List() {
	var container = document.getElementById('choose_city_by_periphery_message_list');
	var chooseCity_by_periphery_List_gpids_ = [];
	for(let key in chooseCity_by_periphery_List) {
		if(!chooseCity_by_periphery_List_gpids_.includes(chooseCity_by_periphery_List[key].city.gp_id) && !chooseCity_by_periphery_List_gpids.includes(chooseCity_by_periphery_List[key].city.gp_id)) {
			var row = document.createElement('div');
			row.innerHTML = getFullCity(chooseCity_by_periphery_List[key].city);
			container.appendChild(row);
			row.addEventListener('click', chooseCity_by_periphery_Continue);
			row.data_id = key;
			chooseCity_by_periphery_List_gpids_.push(chooseCity_by_periphery_List[key].city.gp_id);
		}
	}
}

function hideChooseCity_by_periphery_Message() {
	choose_city_by_periphery_message.classList.add('hide');
	clearChooseCity_by_periphery_List();
}

function clearChooseCity_by_periphery_List() {
	document.getElementById('choose_city_by_periphery_message_current_city').innerHTML = '';
	document.getElementById('choose_city_by_periphery_message_list').innerHTML = '';
}

function chooseCity_by_periphery(list, callback) {
	chooseCity_by_periphery_List = list;
	chooseCity_by_periphery_Callback = callback;
	if(!document.getElementById('choose_city_by_periphery_message').classList.contains('hide')
	 && document.getElementById('choose_city_by_periphery_message_list').innerHTML.length == 0)
		showChooseCity_by_periphery_List()
}

function chooseCity_by_periphery_Continue(e) {
	infoWindow_setContent(MESSAGE_LOADING);
	hideChooseCity_by_periphery_Message();
	var id = e.target.data_id;
	var city = chooseCity_by_periphery_List[id].city;
	chooseCity_by_periphery_Callback(city);
}

function showChooseCity_by_periphery_gpid() {
	var container = document.getElementById('choose_city_by_periphery_message_current_city');
	var row = document.createElement('div');
	row.innerHTML = getFullCity(code_city);
	row.addEventListener('click', hideChooseCity_by_periphery_Message);
	container.appendChild(row);
	
	for(let key in chooseCity_by_periphery_gpid) {
		chooseCity_by_periphery_List_gpids.push(chooseCity_by_periphery_gpid[key].city.gp_id);
		if(chooseCity_by_periphery_gpid[key].city.gp_id == code_city.gp_id)
			continue;
		else {
			if(chooseCity_by_periphery_gpid[key].city.administrative_level_2 == null && chooseCity_by_periphery_gpid[key].city.administrative_level_1 != null)
				continue;
			var container = document.getElementById('choose_city_by_periphery_message_list');
			var row = document.createElement('div');
			row.innerHTML = getFullCity(chooseCity_by_periphery_gpid[key].city);
			row.data_id = key;
			row.addEventListener('click', chooseCity_by_periphery_gpid_Continue);
			container.appendChild(row);
		}
	}
}

function chooseCity_by_periphery_gpid_Continue(e) {
	infoWindow_setContent(MESSAGE_LOADING);
	hideChooseCity_by_periphery_Message();
	var id = e.target.data_id;
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
