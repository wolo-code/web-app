function showNoCityMessage() {
	showOverlay(document.getElementById('no_city_message'));
}

function hideNoCityMessage() {
	hideOverlay(document.getElementById('no_city_message'));
	noCity_hideLoader();
}

function noCity_add() {
	submitCity();
	noCity_showLoader();
}

function noCity_showLoader() {
	addClassIfPresent(document.getElementById('no_city_message_prompt'), 'hide');
	removeClassIfPresent(document.getElementById('no_city_message_wait'), 'hide');
}

function noCity_hideLoader() {
	removeClassIfPresent(document.getElementById('no_city_message_prompt'), 'hide');
	addClassIfPresent(document.getElementById('no_city_message_wait'), 'hide');
}

function noCity_cancel() {
	hideNoCityMessage();
	removeClassIfPresent(document.getElementById('notification_top'), 'hide');
}

function noCityWait_continue() {
	infoWindow_setContent("Waiting for update");
	hideNoCityMessage();
}

function noCityWait_stop() {
	pendingPosition = null;
	pendingCity = false;
	hideNoCityMessage();
	removeClassIfPresent(document.getElementById('notification_top'), 'hide');
}
