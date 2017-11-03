function showLocateRightMessage() {
	locate_right_message.classList.remove('hide');
}

function hideLocateRightMessage() {
	locate_right_message.classList.add('hide');
}

function locateRight_grant() {
	locationAccess = true;
	setLocationAccess();
	locate();
	hideLocateRightMessage();
}

function locateRight_deny() {
	locationAccess = false;
	hideLocateRightMessage();
}
