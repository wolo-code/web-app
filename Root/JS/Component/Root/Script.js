function initLoad () {
	if(!initLoadDone && document.readyState === 'interactive') {
		firebaseInit();
		dbInit();
		versionCheck();
		if(!urlDecode())
			syncLocate();
		syncInitMap();
		setupControls();
		initLoadDone = true;
	}
};

function setupControls() {
	document.getElementById('redirect_cancel').addEventListener('click', redirectCancel);
	document.getElementById('overlay_message_close').addEventListener('click', hideOverlay);
	document.getElementById('info_intro_close_button').addEventListener('click', hideOverlay);
	document.getElementById('info_full_close_button').addEventListener('click', hideOverlay);
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
	document.getElementById('proceed_button').addEventListener('click', proceedPosition);
	document.getElementById('share_wcode_message_close').addEventListener('click', hideCopyCodeMessage);
	document.getElementById('incompatible_browser_message_close').addEventListener('click', hideIncompatibleBrowserMessage);
	document.getElementById('incompatible_browser_message_continue').addEventListener('click', hideIncompatibleBrowserMessage);
	document.getElementById('address_text_close').addEventListener('click', hideAddress);
	document.getElementById('address_text_copy').addEventListener('click', copyAddress);
	document.getElementById('choose_city_by_name_message_close').addEventListener('click', hideChooseCityMessage);
	document.getElementById('choose_city_by_periphery_message_close').addEventListener('click', hideChooseCity_by_periphery_Message);
	document.getElementById('share_copy_button').addEventListener('click', shareWCodeCopy);
	document.getElementById('share_link_button').addEventListener('click', shareWCodeLink);
	document.getElementById('share_qr_button').addEventListener('click', showQR);
	document.getElementById('qr_close').addEventListener('click', closeQR);
	document.getElementById('qr_preview').addEventListener('click', toggleQRpreview);
	document.getElementById('qr_print').addEventListener('click', printQR);
	document.getElementById('qr_download').addEventListener('click', downloadQR);
	document.getElementById('qr_address').addEventListener('focus', qr_address_active);
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
