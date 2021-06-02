// var syncLocate_engage;

function initLoad () {
	if(!initLoadDone && document.readyState === 'interactive') {
		firebaseInit();
		initApp();
		dbInit();
		syncLocate_engage = versionCheck();
		if(!urlDecode()) {
			//if(syncLocate_engage)
				//syncLocate();
		}
		else
			syncLocate_engage = true;
			
		syncInitMap();
		setupControls();
		initLoadDone = true;
	}
};

function initApp() {
	firebase.auth().getRedirectResult().then(function(result) {
		if (result.credential) {
			signedIn();
		}
		else if (firebase.auth().currentUser) {
			signedIn();
		} else {
			document.getElementById('account_default_image').classList.add('inactive');
			document.getElementById('account_default_image').classList.remove('hide');
		}
	}).catch(function(error) {
		Sentry.captureException(error);
	});
}

function signedIn() {
	document.getElementById('account_default_image').classList.remove('inactive');
	document.getElementById('account_dialog_logout').classList.remove('hide');
	document.getElementById('account_dialog_display_name').innerText = firebase.auth().currentUser.displayName;
	document.getElementById('account_dialog_email').innerText = firebase.auth().currentUser.email;
	if(typeof firebase.auth().currentUser.photoURL != 'undefined' && firebase.auth().currentUser.photoURL != null && firebase.auth().currentUser.photoURL.length) {
		document.getElementById('account_user_image').setAttribute('src', firebase.auth().currentUser.photoURL);
		document.getElementById('account_user_image').classList.remove('hide');
		document.getElementById('account_default_image').classList.add('hide');
	}
	else {
		document.getElementById('account_default_image').classList.remove('inactive');
		document.getElementById('account_default_image').classList.remove('hide');
	}
	loadSaveList();
}

function setupControls() {
	document.getElementById('redirect_cancel').addEventListener('click', redirectCancel);
	document.getElementById('account').addEventListener('click', showAccountDialog);
	document.getElementById('authentication_header_close').addEventListener('click', hideAuthenticationDialog);
	document.getElementById('account_dialog_close').addEventListener('click', hideAccountDialog);
	document.getElementById('account').addEventListener('click', onAccount);
	document.getElementById('account_dialog_logout').addEventListener('click', onLogout);
	document.getElementById('save_address').addEventListener('focus', onAccountDialogAddressActive);
	document.getElementById('account_dialog_save').addEventListener('click', onAccountDialogSave);
	document.getElementById('info_message_close').addEventListener('click', closeInfo);
	document.getElementById('info_intro_close_button').addEventListener('click', closeInfo);
	document.getElementById('info_full_close_button').addEventListener('click', closeInfo);
	document.getElementById('info').addEventListener('click', showInfo);
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
	document.getElementById('share_copy_button_text_city').addEventListener('click', copyWcodeFull);
	document.getElementById('share_copy_button_text_nocity').addEventListener('click', copyWcodeCode);
	document.getElementById('share_copy_button_link_jump').addEventListener('click', copyWcodeJumpLink);
	document.getElementById('share_copy_button_link_nojump').addEventListener('click', copyWcodeLink);
	document.getElementById('share_copy_button_qr').addEventListener('click', showQR);
	document.getElementById('qr_close').addEventListener('click', closeQR);
	document.getElementById('qr_preview').addEventListener('click', toggleQRpreview);
	document.getElementById('qr_print').addEventListener('click', printQR);
	document.getElementById('qr_download').addEventListener('click', downloadQR);
	document.getElementById('qr_address').addEventListener('focus', qr_address_active);
	document.getElementById('decode_input').addEventListener('input', resizeInput);
	document.getElementById('external_close').addEventListener('click', external_close);
	addLongpressListener(document.getElementById('external_proceed'), external_proceed_external, external_proceed_internal);
}

function resizeInput() {
	document.getElementById('decode_input_shadow').innerText = this.value;
	this.style.width = document.getElementById('decode_input_shadow').offsetWidth+'px';
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
