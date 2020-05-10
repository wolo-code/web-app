var chooseCityCallback;
var chooseCityList;

function showChooseCityMessage() {
	clearChooseCityList();
	showOverlay(document.getElementById('choose_city_by_name_message'));
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
	hideOverlay(document.getElementById('choose_city_by_name_message'));
	clearChooseCityList();
}

function clearChooseCityList() {
	document.getElementById('choose_city_by_name_message_list').innerHTML = '';
}

function chooseCity(list, matchCount, callback) {
	chooseCityList = {};
	for(let i in matchCount) {
		let index = matchCount[i];
		chooseCityList[index] = (list[index]);
	}
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
