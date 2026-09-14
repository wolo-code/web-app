// var syncLocate_engage;

function initLoad () {
	if(!initLoadDone && document.readyState !== 'loading') {
		initTheme();
		initMapSource();
		firebaseInit();
		initApp();
		dbInit();
		initOfflineStatus();
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
		if(isFirebaseIndexedDbClosingError(error)) {
			recoverFirebaseIndexedDbConnection(error);
			return;
		}
		if(isFirebaseAuthNetworkError(error)) {
			document.getElementById('account_default_image').classList.add('inactive');
			document.getElementById('account_default_image').classList.remove('hide');
			return;
		}
		Sentry.captureException(error);
	});
}

function signedIn() {
	document.getElementById('account_default_image').classList.remove('inactive');
	document.getElementById('account_dialog_display_name').innerText = firebase.auth().currentUser.displayName;
	document.getElementById('account_dialog_email').innerText = firebase.auth().currentUser.email;
	if(typeof firebase.auth().currentUser.photoURL != 'undefined' && firebase.auth().currentUser.photoURL != null && firebase.auth().currentUser.photoURL.length) {
		document.getElementById('account_user_image').setAttribute('src', firebase.auth().currentUser.photoURL);
		document.getElementById('account_user_image').classList.remove('hide');
		document.getElementById('account_default_image').classList.add('hide');
		document.getElementById('account_dialog_user_image').setAttribute('src', firebase.auth().currentUser.photoURL);
		document.getElementById('account_dialog_user_image').classList.remove('hide');
		document.getElementById('account_dialog_default_image').classList.add('hide');
	}
	else {
		document.getElementById('account_default_image').classList.remove('inactive');
		document.getElementById('account_default_image').classList.remove('hide');
		document.getElementById('account_dialog_user_image').classList.add('hide');
		document.getElementById('account_dialog_user_image').setAttribute('src', 'data:,');
		document.getElementById('account_dialog_default_image').classList.remove('hide');
	}
	loadSaveList();
}

function getBottomStackHeight() {
	var stack = document.getElementById('map_bottom_stack');
	return stack ? stack.offsetHeight : 0;
}

function getPanByOffset() {
	var base = window.innerHeight < 1000 ? -118 : 0;
	return base - getBottomStackHeight();
}

function applyMapChromePan() {
	if(typeof map == 'undefined' || !map) {
		return;
	}
	map.panBy(0, getPanByOffset());
	lastBottomStackPanY = getBottomStackHeight();
}

function syncBottomStackMapPan() {
	if(typeof map == 'undefined' || !map) {
		return;
	}
	if(typeof isAppOverlayOpen == 'function' && isAppOverlayOpen()) {
		if(typeof layoutBottomNotification == 'function')
			layoutBottomNotification();
		return;
	}
	var next = getBottomStackHeight();
	var delta = next - lastBottomStackPanY;
	if(delta) {
		if(!programmaticMapFocus)
			map.panBy(0, -delta);
		lastBottomStackPanY = next;
	}
	if(typeof layoutBottomNotification == 'function')
		layoutBottomNotification();
}

function initBottomStackMapPan() {
	var stack = document.getElementById('map_bottom_stack');
	if(typeof lastBottomStackPanY == 'undefined') {
		lastBottomStackPanY = 0;
	}
	if(stack && typeof ResizeObserver != 'undefined' && !stack._bottomStackObserver) {
		stack._bottomStackObserver = new ResizeObserver(function() {
			syncBottomStackMapPan();
		});
		stack._bottomStackObserver.observe(stack);
	}
	window.addEventListener('resize', syncBottomStackMapPan);
}

function showInfoIconGuide(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	closeInfo();
	if(typeof requestDecodeIconGuide == 'function')
		requestDecodeIconGuide();
	else if(typeof startDecodeIconGuide == 'function')
		startDecodeIconGuide(true);
}

function bindControl(id, type, handler) {
	var node = document.getElementById(id);
	if(!node)
		return null;
	node.addEventListener(type, handler);
	return node;
}

function setupControls() {
	initBottomStackMapPan();
	bindControl('redirect_cancel', 'click', redirectCancel);
	bindControl('authentication_header_close', 'click', hideAuthenticationDialog);
	bindControl('account_dialog_close', 'click', hideAccountDialog);
	bindControl('account', 'click', onAccount);
	bindControl('account_dialog_logout_button', 'click', onLogout);
	bindControl('save_address', 'focus', onAccountDialogAddressActive);
	bindControl('account_dialog_cancel_button', 'click', onAccountDialogCancel);
	bindControl('account_dialog_save_button', 'click', onAccountDialogSave);
	bindControl('account_dialog_add_toggle', 'click', toggleAccountDialogAdd);
	bindControl('account_dialog_saves_hit', 'click', toggleAccountDialogSaves);
	bindControl('account_dialog_row_edit', 'click', editSaveEntry);
	bindControl('account_dialog_row_delete', 'click', deleteSaveEntry);
	bindControl('account_dialog_row_menu', 'click', function(event) {
		if(event && event.stopPropagation)
			event.stopPropagation();
	});
	document.addEventListener('click', function(event) {
		if(event && event.target && (event.target.closest('.row-menu-toggle') || event.target.closest('#account_dialog_row_menu')))
			return;
		closeSaveEntryMenus();
	});
	document.addEventListener('keydown', function(event) {
		if(event.key === 'Escape')
			closeSaveEntryMenus();
	});
	var saveListInner = document.querySelector('#account_dialog_save_list_container > .account_dialog_fold_inner');
	if(saveListInner)
		saveListInner.addEventListener('scroll', closeSaveEntryMenus);
	bindControl('info_message_close', 'click', closeInfo);
	bindControl('info_intro_close_button', 'click', closeInfo);
	bindControl('info_full_close_button', 'click', closeInfo);
	bindControl('info_version_indicator', 'click', toggleInfoVersionDisplay);
	bindControl('info_version_indicator', 'mouseenter', fillInfoVersionStamps);
	bindControl('info_version_indicator', 'focus', fillInfoVersionStamps);
	fillInfoVersionStamps();
	bindControl('info_show_icon_labels', 'click', showInfoIconGuide);
	bindControl('action_menu_info', 'click', showInfoFromActionMenu);
	bindControl('action_menu_map', 'click', toggleMapViewTypeFromActionMenu);
	bindControl('action_menu_decode', 'click', toggleDecodeViewFromActionMenu);
	bindControl('decode_map_view_button', 'click', toggleDecodeView);
	bindControl('footer_author', 'click', showInfoLinks);
	bindControl('no_city_message_close', 'click', hideNoCityMessage);
	bindControl('locate_right_message_close', 'click', hideLocateRightMessage);
	bindControl('locate_right_message_yes', 'click', locateRight_grant);
	bindControl('locate_right_message_no', 'click', locateRight_deny);
	bindControl('invalid_code_message_close', 'click', hideInvalidCodeDialog);
	bindControl('invalid_code_correct', 'click', invalidCodeCorrect);
	bindControl('invalid_code_search', 'click', invalidCodeSearchMap);
	bindControl('no_city_submit_yes', 'click', noCity_add);
	bindControl('no_city_submit_no', 'click', noCity_cancel);
	bindControl('no_city_submit_wait_continue', 'click', noCityWait_continue);
	bindControl('no_city_submit_wait_stop', 'click', noCityWait_stop);
	bindControl('notification_top', 'click', tryDefaultCity);
	bindControl('proceed_button', 'click', proceedPosition);
	bindControl('incompatible_browser_message_close', 'click', hideIncompatibleBrowserMessage);
	bindControl('incompatible_browser_message_continue', 'click', hideIncompatibleBrowserMessage);
	bindControl('address_text_close', 'click', hideAddress);
	bindControl('address_text_main', 'click', copyAddress);
	bindControl('address_text_digipin', 'click', function(event) {
		copyDigipin(event);
	});
	bindControl('address_text_plus', 'click', function(event) {
		copyPlusCode(event);
	});
	var qrButtons = document.querySelectorAll('.address_qr_button');
	for(var i = 0; i < qrButtons.length; i++)
		qrButtons[i].addEventListener('click', onCodeQRButtonClick);
	bindControl('code_qr_close', 'click', closeCodeQR);
	bindControl('decode_city_history_message_close', 'click', hideDecodeCityHistoryMessage);
	bindControl('choose_city_by_name_message_close', 'click', hideChooseCityMessage);
	bindControl('choose_city_by_periphery_message_close', 'click', hideChooseCity_by_periphery_Message);
	bindControl('qr_close', 'click', closeQR);
	bindControl('overlay', 'click', onOverlayBackdropClick);
	bindControl('qr_save', 'click', onQRDialogSave);
	bindControl('qr_preview', 'click', toggleQRpreview);
	bindControl('qr_print', 'click', printQR);
	bindControl('qr_download', 'click', downloadQR);
	bindControl('qr_address', 'focus', qr_address_active);
	bindControl('decode_input', 'input', resizeInput);
	if(typeof syncProceedButtons == 'function') {
		syncProceedButtons();
	}
	bindControl('decode_city_geolocation', 'click', requestDecodeCityGeolocation);
	bindControl('decode_city_ip', 'click', selectIpDecodeCity);
	bindControl('decode_city_history_toggle', 'click', showDecodeCityHistoryMessage);
	bindControl('map_city_history_toggle', 'click', showDecodeCityHistoryMessage);
	if(typeof initDecodeCityHistoryDeleteControls == 'function')
		initDecodeCityHistoryDeleteControls();
	bindControl('external_close', 'click', external_close);
	var externalProceed = document.getElementById('external_proceed');
	if(externalProceed)
		addLongpressListener(externalProceed, external_proceed_external, external_proceed_internal);
	var logo = document.getElementById('logo');
	if(logo && typeof clearCacheAndReload == 'function') {
		logo.setAttribute('title', 'Press and hold to clear cache and reload');
		addLongpressListener(logo, function() {}, function(e) {
			if(e && e.preventDefault)
				e.preventDefault();
			clearCacheAndReload();
		});
	}
	if(typeof recordDecodeIconGuideLaunch == 'function')
		recordDecodeIconGuideLaunch();
	closeActionMenu();
	if(typeof initDecodeIconGuide == 'function')
		initDecodeIconGuide();
}

if(typeof initLoad !== 'undefined')
	initLoad();

function isDecodeView() {
	return document.body.classList.contains('decode');
}

function isMapTypeSwitcherVisible() {
	return !document.body.classList.contains('map-source-single');
}

function syncActionMenuAccess() {
	var decodeView = isDecodeView();
	var switcherVisible = isMapTypeSwitcherVisible();
	document.getElementById('action_menu_info').tabIndex = 0;
	document.getElementById('action_menu_map').tabIndex = -1;
	document.getElementById('action_menu_decode').tabIndex = decodeView ? -1 : 0;
	document.getElementById('map_type_button').tabIndex = !decodeView && switcherVisible ? 6 : -1;
	if(typeof syncDecodeIconGuide == 'function')
		syncDecodeIconGuide();
}

function closeActionMenu() {
	syncActionMenuAccess();
}

function showInfoFromActionMenu() {
	showInfo();
}

function toggleMapViewTypeFromActionMenu() {
	closeActionMenu();
	toggleMapViewType();
}

function toggleDecodeViewFromActionMenu() {
	closeActionMenu();
	toggleDecodeView();
}

function resizeInput() {
	var shadow = document.getElementById('decode_input_shadow');
	var longest_line = this.value.split(/\r?\n/).reduce(function(longest, line) {
		return line.length > longest.length ? line : longest;
	}, '');
	shadow.innerText = longest_line || this.getAttribute('placeholder');
	this.style.width = shadow.offsetWidth+'px';
	this.style.height = '26px';
	this.style.height = Math.min(this.scrollHeight - 16, 112)+'px';
	if(typeof syncProceedButtons == 'function') {
		syncProceedButtons();
	}
}

function showAndCopy(message) {
	showNotification(message);
	copyNodeText(notification_bottom);
}

function copyPlainText(text) {
	if(navigator.clipboard && window.isSecureContext && navigator.clipboard.writeText) {
		navigator.clipboard.writeText(text).catch(function() {
			copyPlainTextFallback(text);
		});
		return;
	}
	copyPlainTextFallback(text);
}

function copyPlainTextFallback(text) {
	var textarea = document.createElement('textarea');
	textarea.value = text;
	textarea.setAttribute('readonly', '');
	textarea.style.position = 'fixed';
	textarea.style.left = '-9999px';
	document.body.appendChild(textarea);
	textarea.select();
	try {
		document.execCommand('copy');
	}
	catch(error) {}
	document.body.removeChild(textarea);
}

function copyNodeText(node) {
	var range = document.createRange();
	range.selectNode(node);
	window.getSelection().removeAllRanges();
	window.getSelection().addRange(range);
	document.execCommand('copy');
	window.getSelection().removeAllRanges();
}
