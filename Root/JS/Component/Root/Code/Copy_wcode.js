// const WCODE_CODE_COPIED_MESSAGE;
// const WCODE_LINK_COPIED_MESSAGE;

function showCopyWcodeMessage() {
	copy_wcode_message_city_name.innerText = getWcodeCity();
	copy_wcode_message.classList.remove('hide');
}

function hideCopyWcodeMessage() {
	copy_wcode_message.classList.add('hide');
	copy_wcode_message_city_name.innerText = '';	
}

function copyWcodeFull() {
	showAndCopy(getWcodeFull_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyWcodeMessage();
}

function copyWcodeCode() {
	showAndCopy(getWcodeCode_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyWcodeMessage();
}

function copyWcodeLink() {
	var wcode_url = location.hostname + '/' + getWcodeFull().join('.');
	showAndCopy(wcode_url.toLowerCase());
	showNotification(WCODE_LINK_COPIED_MESSAGE);
	hideCopyWcodeMessage();
}
