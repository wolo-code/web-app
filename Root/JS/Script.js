window.onload = init;

function init() {
	overlay.addEventListener('click', hideOverlay);
	overlay_message_close.addEventListener('click', hideOverlay);
	info.addEventListener('click', showOverlay);
}

function showAndCopy(message) {
	showNotification(message);
	copyNodeText(notification);
}

function copyNodeText(node) {
	var range = document.createRange();
	range.selectNode(node);
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
