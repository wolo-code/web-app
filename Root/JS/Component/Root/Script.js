
function setupControls() {
	document.getElementById('overlay').addEventListener('click', hideOverlay);
	document.getElementById('overlay_message_close').addEventListener('click', hideOverlay);
	document.getElementById('info').addEventListener('click', showOverlay);
	document.getElementById('no_city_message_close').addEventListener('click', hideNoCityMessage);
	document.getElementById('locate_right_message_close').addEventListener('click', hideLocateRightMessage);
	document.getElementById('locate_right_message_yes').addEventListener('click', locateRight_grant);
	document.getElementById('locate_right_message_no').addEventListener('click', locateRight_deny);
	document.getElementById('no_city_submit_yes').addEventListener('click', noCity_add);
	document.getElementById('no_city_submit_no').addEventListener('click', noCity_cancel);
	document.getElementById('no_city_submit_wait_continue').addEventListener('click', noCityWait_continue);
	document.getElementById('no_city_submit_wait_stop').addEventListener('click', noCityWait_stop);
	document.getElementById('notification_top').addEventListener('click', tryDefaultCity);
	document.getElementById('copy_wcode_message_close').addEventListener('click', hideCopyWcodeMessage);
	document.getElementById('copy_wcode_submit_yes').addEventListener('click', copyWcodeFull);
	document.getElementById('copy_wcode_submit_no').addEventListener('click', copyWcodeCode);
	document.getElementById('incompatible_browser_message_close').addEventListener('click', hideIncompatibleBrowserMessage);
	document.getElementById('incompatible_browser_message_continue').addEventListener('click', hideIncompatibleBrowserMessage);
	document.getElementById('address_text_close').addEventListener('click', hideAddress);
	document.getElementById('address_text_copy').addEventListener('click', copyAddress);
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
