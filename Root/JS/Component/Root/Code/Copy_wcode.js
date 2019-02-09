// const WCODE_CODE_COPIED_MESSAGE;
// const WCODE_LINK_COPIED_MESSAGE;

function showCopyWcodeMessage() {
	copy_wcode_message_city_name.innerText = getCodeCity();
	copy_wcode_message.classList.remove('hide');
}

function hideCopyCodeMessage() {
	copy_wcode_message.classList.add('hide');
	copy_wcode_message_city_name.innerText = '';
}

function copyWcodeFull() {
	showAndCopy(getWcodeFull_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function copyWcodeCode() {
	showAndCopy(getCodeWcode_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function copyWcodeLink() {
	var code_url = location.hostname + '/' + getCodeFull().join('.');
	showAndCopy(code_url.toLowerCase());
	showNotification(WCODE_LINK_COPIED_MESSAGE);
	hideCopyCodeMessage();
}
