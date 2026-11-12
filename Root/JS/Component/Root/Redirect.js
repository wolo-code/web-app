var REDIRECT_DELAY_MS = 3000;
var redirectActive = false;
var redirectTimer = null;
var redirectShowLocation = null;

function redirect_isActive() {
	return redirectActive;
}

function redirect_showLoader(words) {
	redirectActive = true;
	var dialog = document.getElementById('external_message');
	var status = document.getElementById('external_redirect_status');
	status.textContent = 'Opening ' + getExternalMapLabel() + '…';
	dialog.classList.add('redirect-pending');
	getWaitLoader().classList.add('redirect-loading');
	external_show(null, words.slice(0, -3).join(' '), words.slice(-3).join(' '));
	document.getElementById('redirect_cancel').focus();
}

function redirect_start(city, code, position, showLocation) {
	var dialog = document.getElementById('external_message');
	var loader = getWaitLoader();
	external_setCode(city, code);
	redirectShowLocation = showLocation;
	loader.style.setProperty('--redirect-duration', REDIRECT_DELAY_MS + 'ms');
	loader.classList.add('redirect-countdown');
	redirectTimer = setTimeout(function() {
		if(getVisibleOverlayDialog() !== dialog) {
			redirectCancel();
			return;
		}
		redirect_reset();
		window.location.replace(getIntentURL(position, city + ' ' + code));
	}, REDIRECT_DELAY_MS);
}

function redirect_reset() {
	clearTimeout(redirectTimer);
	redirectTimer = null;
	redirectShowLocation = null;
	redirectActive = false;
	initWCode_jumpToMap = false;
	var dialog = document.getElementById('external_message');
	dialog.classList.remove('redirect-pending');
	var loader = getWaitLoader();
	loader.classList.remove('redirect-loading', 'redirect-countdown');
	loader.style.removeProperty('--redirect-duration');
	external_hide();
}

function redirectCancel() {
	var showLocation = redirectShowLocation;
	redirect_reset();
	var path = window.location.pathname;
	if(path.length > 1 && path.endsWith('/'))
		window.history.replaceState(window.history.state, '', path.slice(0, -1) + window.location.search + window.location.hash);
	if(showLocation)
		showLocation();
}
