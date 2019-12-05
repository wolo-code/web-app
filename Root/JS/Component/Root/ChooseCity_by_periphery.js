var chooseCity_by_periphery_Callback;
var chooseCity_by_periphery_List;

function showChooseCity_by_periphery_Message() {
	clearChooseCity_by_periphery_List();
	choose_city_by_periphery_message.classList.remove('hide');
	var container = document.getElementById('choose_city_by_periphery_message_list');
	for(let key in chooseCity_by_periphery_List) {
		var row = document.createElement('div');
		row.innerHTML = getFullCity(chooseCity_by_periphery_List[key].city);
		container.appendChild(row);
		row.addEventListener('click', chooseCity_by_periphery_Continue);
		row.data_id = key;
	}
}

function hideChooseCity_by_periphery_Message() {
	choose_city_by_periphery_message.classList.add('hide');
	clearChooseCity_by_periphery_List();
}

function clearChooseCity_by_periphery_List() {
	document.getElementById('choose_city_by_periphery_message_list').innerHTML = '';
}

function chooseCity_by_periphery(list, callback) {
	chooseCity_by_periphery_List = list;
	chooseCity_by_periphery_Callback = callback;
}

function chooseCity_by_periphery_Continue(e) {
	infoWindow_setContent(MESSAGE_LOADING);
	hideChooseCity_by_periphery_Message();
	var id = e.target.data_id;
	var city = chooseCity_by_periphery_List[id].city;
	chooseCity_by_periphery_Callback(city);
}
