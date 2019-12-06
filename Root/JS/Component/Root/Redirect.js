function redirectCancel() {
	initWCode_jumpToMap = false;
	redirect_hideLoader();
}

function redirect_showLoader() {
	document.getElementById('redirecting_message').classList.remove('hide');
}

function redirect_hideLoader() {
	document.getElementById('redirecting_message').classList.add('hide');
}
