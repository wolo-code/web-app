// var locateRight_callback;

function showLocateRightMessage(hide_dnd) {
	if(hide_dnd == true)
		locate_right_message_dnd.classList.add('hide');
	else
		locate_right_message_dnd.classList.remove('hide');
	showOverlay(document.getElementById('locate_right_message'));
}

function hideLocateRightMessage() {
	hideOverlay(document.getElementById('locate_right_message'));
}

function locateRight_grant() {
	setLocationAccess(true);
	initLocate(false, locateRight_callback);
	hideLocateRightMessage();
	locateRight_DND_check();
}

function locateRight_deny() {
	popLoader();
	hideLocateRightMessage();
	locateRight_DND_check();
	showNotification("Choose a place on the map");
}

function locateRight_DND_check() {
	if(locate_right_message_dnd_input.checked) {
		setLocationAccessDND(true);
	}
	else {
		setLocationAccessDND(false);
	}
}
