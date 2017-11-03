function showNoCityMessage() {
	no_city_message.classList.remove('hide');
}

function hideNoCityMessage() {
	no_city_message.classList.add('hide');
}

function noCity_add() {
	submitCity();
	hideNoCityMessage();
}

function noCity_cancel() {
	hideNoCityMessage();
}
