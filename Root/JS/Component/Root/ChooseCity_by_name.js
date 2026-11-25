var chooseCityCallback;
var chooseCityList;
var chooseCityCodeWords;

function showChooseCityMessage() {
	clearChooseCityList();
	showOverlay(document.getElementById('choose_city_by_name_message'));
	var container = document.getElementById('choose_city_by_name_message_list');
	var choices = Object.keys(chooseCityList).map(function(key) {
		return {city: chooseCityList[key], key: key, select: chooseCityContinue};
	});
	renderCityChoices(container, choices);
	if(typeof renderCityRegionMenu === 'function') renderCityRegionMenu('matching', 'matching');
}

function hideChooseCityMessage() {
	hideOverlay(document.getElementById('choose_city_by_name_message'));
	clearChooseCityList();
}

function clearChooseCityList() {
	document.getElementById('choose_city_by_name_message_list').innerHTML = '';
}

function chooseCity(list, matchCount, callback, codeWords) {
	chooseCityList = {};
	for(let i in matchCount) {
		let index = matchCount[i];
		chooseCityList[index] = (list[index]);
	}
	chooseCityCallback = callback;
	chooseCityCodeWords = codeWords;
	showChooseCityMessage();
}

function chooseCityContinue(e) {
	hideChooseCityMessage();
	var id = e.currentTarget.data_id;
	var city = chooseCityList[id];
	city.id = id;
	chooseCityCallback(city);
}
