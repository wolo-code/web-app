window.onload = init;

function init() {
	overlay.addEventListener('click', hideOverlay);
	overlay_message_close.addEventListener('click', hideOverlay);
	info.addEventListener('click', showOverlay);
	no_city_message_close.addEventListener('click', hideNoCityMessage);
	locate_right_message_close.addEventListener('click', hideLocateRightMessage);
	locate_right_message_yes.addEventListener('click', locateRight_grant);
	locate_right_message_no.addEventListener('click', locateRight_deny);
	no_city_submit_yes.addEventListener('click', noCity_add);
	no_city_submit_no.addEventListener('click', noCity_cancel);
	no_city_submit_wait_continue.addEventListener('click', noCityWait_continue);
	no_city_submit_wait_stop.addEventListener('click', noCityWait_stop);
	notification_top.addEventListener('click', tryDefaultCity);
}

function showAndCopy(message) {
	showNotification(message);
	copyNodeText(notification_bottom);
}

function copyNodeText(node) {
	var range = document.createRange();
	range.selectNode(node);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand('copy');
	window.getSelection().removeAllRanges();
}
