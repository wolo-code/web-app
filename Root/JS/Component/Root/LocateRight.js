function showLocateRightMessage(hide_dnd) {
	if(hide_dnd == true)
		locate_right_message_dnd.classList.add('hide');
	else
		locate_right_message_dnd.classList.remove('hide');
	locate_right_message.classList.remove('hide');
}

function hideLocateRightMessage() {
	locate_right_message.classList.add('hide');
}

function locateRight_grant() {
	setLocationAccess(true);
	initLocate();
	hideLocateRightMessage();
	locateRight_DND_check();
}

function locateRight_deny() {
	wait_loader.classList.add('hide');
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
