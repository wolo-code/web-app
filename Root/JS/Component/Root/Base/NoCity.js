function showNoCityMessage() {
	no_city_message.classList.remove('hide');
}

function hideNoCityMessage() {
	no_city_message.classList.add('hide');
}

function noCity_add() {
	submitCity();
	noCity_showLoader();
}

function noCity_showLoader() {
	no_city_message_prompt.classList.add('hide');
	no_city_message_wait.classList.remove('hide');
}

function noCity_cancel() {
	hideNoCityMessage();
}

function noCityWait_continue() {
	infoWindow_setContent("Waiting for update");
	hideNoCityMessage();
}

function noCityWait_stop() {
	pendingPosition = null;
	hideNoCityMessage();	
}
