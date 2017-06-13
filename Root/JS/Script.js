window.onload = init;

function init() {
	overlay.addEventListener('click', hideOverlay);
	overlay_message_close.addEventListener('click', hideOverlay);
	info.addEventListener('click', showOverlay);
}

function copyWCode() {
	showAndCopy(getWCodeFullFromInfoWindow().join(' '));
	showNotification("WCode copied");
}

function copyLink() {
	var wcode_url = location.hostname + '/' + getWCodeFromInfoWindow().join('.');
	showAndCopy(wcode_url.toLowerCase());
	showNotification("WCode link copied");
}

function getWCodeFullFromInfoWindow() {
	var wcode_full = infowindow_code.innerText.replace(/(\r?\n|\r)/gm, ' ').split(' ');
	wcode_full.pop();
	return wcode_full;
}

function getWCodeFromInfoWindow() {
	var wcode = getWCodeFullFromInfoWindow();
	return wcode.slice(1, wcode.length-1);
}

function showAndCopy(message) {
	showNotification(message);
	var range = document.createRange();
	range.selectNode(notification);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand('copy');
	window.getSelection().removeAllRanges();
}

function showNotification(message) {
	notification.innerText = message;
	notification.classList.remove('hide');
	if(typeof notification_timer != 'undefined' && notification_timer != null)
		clearTimeout(notification_timer);
	notification_timer = setTimeout(function(){
		notification.innerText = '';
		notification.classList.add('hide');
	}, 2500);
}
