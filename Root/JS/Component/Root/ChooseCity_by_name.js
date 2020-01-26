var chooseCityCallback;
var chooseCityList;

function showChooseCityMessage() {
	clearChooseCityList();
	choose_city_by_name_message.classList.remove('hide');
	var container = document.getElementById('choose_city_by_name_message_list');
	for(let key in chooseCityList) {
		var row = document.createElement('div');
		row.innerHTML = getFullCity(chooseCityList[key]);
		container.appendChild(row);
		row.addEventListener('click', chooseCityContinue);
		row.data_id = key;
	}
}

function hideChooseCityMessage() {
	choose_city_by_name_message.classList.add('hide');
	clearChooseCityList();
}

function clearChooseCityList() {
	document.getElementById('choose_city_by_name_message_list').innerHTML = '';
}

function chooseCity(list, callback) {
	chooseCityList = list;
	chooseCityCallback = callback;
	showChooseCityMessage();
}

function chooseCityContinue(e) {
	hideChooseCityMessage();
	var id = e.target.data_id;
	var city = chooseCityList[id];
	city.id = id;
	chooseCityCallback(city);
}