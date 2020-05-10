function redirectCancel() {
	initWCode_jumpToMap = false;
	redirect_hideLoader();
}

function redirect_showLoader() {
	showOverlay(document.getElementById('redirecting_message'));
}

function redirect_hideLoader() {
	hideOverlay(document.getElementById('redirecting_message'));
}
