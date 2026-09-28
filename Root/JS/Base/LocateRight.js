function showLocateRightMessage(hide_dnd) {
	var dnd = document.getElementById('locate_right_message_dnd');
	if(hide_dnd == true)
		addClassIfPresent(dnd, 'hide');
	else
		removeClassIfPresent(dnd, 'hide');
	showOverlay(document.getElementById('locate_right_message'));
}

function hideLocateRightMessage() {
	hideOverlay(document.getElementById('locate_right_message'));
}

function locateRight_grant() {
	setLocationAccess(true);
	if(typeof locateRight_callback === 'function')
		initLocate(false, locateRight_callback);
	else
		initLocate(false, locateExec);
	hideLocateRightMessage();
	locateRight_DND_check();
}

function locateRight_deny() {
	popLoader();
	hideLocateRightMessage();
	locateRight_DND_check();
	if(!geoIp_city_name && geoIp_city_name != '')
		getCityByIp();
	else
		showNotification("Choose a place on the map");
}

function locateRight_DND_check() {
	var dndInput = document.getElementById('locate_right_message_dnd_input');
	if(dndInput && dndInput.checked) {
		setLocationAccessDND(true);
	}
	else {
		setLocationAccessDND(false);
	}
}
