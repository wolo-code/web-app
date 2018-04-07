function showLocateRightMessage() {
	locate_right_message.classList.remove('hide');
}

function hideLocateRightMessage() {
	locate_right_message.classList.add('hide');
}

function locateRight_grant() {
	setLocationAccess(true);
	locate();
	hideLocateRightMessage();
}

function locateRight_deny() {
	wait_loader.classList.add('hide');
	hideLocateRightMessage();
}
