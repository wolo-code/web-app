// var syncLocate_engage;

function initLoad () {
	if(!initLoadDone && document.readyState === 'interactive') {
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

function setupControls() {
	initBottomStackMapPan();
	document.getElementById('redirect_cancel').addEventListener('click', redirectCancel);
	document.getElementById('authentication_header_close').addEventListener('click', hideAuthenticationDialog);
	document.getElementById('account_dialog_close').addEventListener('click', hideAccountDialog);
	document.getElementById('account').addEventListener('click', onAccount);
	document.getElementById('account_dialog_logout_button').addEventListener('click', onLogout);
	document.getElementById('save_address').addEventListener('focus', onAccountDialogAddressActive);
	document.getElementById('account_dialog_cancel_button').addEventListener('click', onAccountDialogCancel);
	document.getElementById('account_dialog_save_button').addEventListener('click', onAccountDialogSave);
	document.getElementById('account_dialog_add_toggle').addEventListener('click', toggleAccountDialogAdd);
	document.getElementById('account_dialog_saves_hit').addEventListener('click', toggleAccountDialogSaves);
	document.getElementById('account_dialog_row_edit').addEventListener('click', editSaveEntry);
	document.getElementById('account_dialog_row_delete').addEventListener('click', deleteSaveEntry);
	document.getElementById('account_dialog_row_menu').addEventListener('click', function(event) {
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
	document.getElementById('info_message_close').addEventListener('click', closeInfo);
	document.getElementById('info_intro_close_button').addEventListener('click', closeInfo);
	document.getElementById('info_full_close_button').addEventListener('click', closeInfo);
	document.getElementById('info_show_icon_labels').addEventListener('click', showInfoIconGuide);
	document.getElementById('action_menu_info').addEventListener('click', showInfoFromActionMenu);
	document.getElementById('action_menu_map').addEventListener('click', toggleMapViewTypeFromActionMenu);
	document.getElementById('action_menu_decode').addEventListener('click', toggleDecodeViewFromActionMenu);
	document.getElementById('decode_map_view_button').addEventListener('click', toggleDecodeView);
	document.getElementById('footer_author').addEventListener('click', showInfoLinks);
	document.getElementById('no_city_message_close').addEventListener('click', hideNoCityMessage);
	document.getElementById('locate_right_message_close').addEventListener('click', hideLocateRightMessage);
	document.getElementById('locate_right_message_yes').addEventListener('click', locateRight_grant);
	document.getElementById('locate_right_message_no').addEventListener('click', locateRight_deny);
	document.getElementById('invalid_code_message_close').addEventListener('click', hideInvalidCodeDialog);
	document.getElementById('invalid_code_correct').addEventListener('click', invalidCodeCorrect);
	document.getElementById('invalid_code_search').addEventListener('click', invalidCodeSearchMap);
	document.getElementById('no_city_submit_yes').addEventListener('click', noCity_add);
	document.getElementById('no_city_submit_no').addEventListener('click', noCity_cancel);
	document.getElementById('no_city_submit_wait_continue').addEventListener('click', noCityWait_continue);
	document.getElementById('no_city_submit_wait_stop').addEventListener('click', noCityWait_stop);
	document.getElementById('notification_top').addEventListener('click', tryDefaultCity);
	document.getElementById('proceed_button').addEventListener('click', proceedPosition);
	document.getElementById('incompatible_browser_message_close').addEventListener('click', hideIncompatibleBrowserMessage);
	document.getElementById('incompatible_browser_message_continue').addEventListener('click', hideIncompatibleBrowserMessage);
	document.getElementById('address_text_close').addEventListener('click', hideAddress);
	document.getElementById('address_text_main').addEventListener('click', copyAddress);
	document.getElementById('address_text_digipin').addEventListener('click', function(event) {
		copyDigipin(event);
	});
	document.getElementById('address_text_plus').addEventListener('click', function(event) {
		copyPlusCode(event);
	});
	document.getElementById('decode_city_history_message_close').addEventListener('click', hideDecodeCityHistoryMessage);
	document.getElementById('choose_city_by_name_message_close').addEventListener('click', hideChooseCityMessage);
	document.getElementById('choose_city_by_periphery_message_close').addEventListener('click', hideChooseCity_by_periphery_Message);
	document.getElementById('qr_close').addEventListener('click', closeQR);
	document.getElementById('overlay').addEventListener('click', onQROverlayClick);
	document.getElementById('qr_save').addEventListener('click', onQRDialogSave);
	document.getElementById('qr_preview').addEventListener('click', toggleQRpreview);
	document.getElementById('qr_print').addEventListener('click', printQR);
	document.getElementById('qr_download').addEventListener('click', downloadQR);
	document.getElementById('qr_address').addEventListener('focus', qr_address_active);
	document.getElementById('decode_input').addEventListener('input', resizeInput);
	if(typeof syncProceedButtons == 'function') {
		syncProceedButtons();
	}
	document.getElementById('decode_city_geolocation').addEventListener('click', requestDecodeCityGeolocation);
	document.getElementById('decode_city_ip').addEventListener('click', selectIpDecodeCity);
	document.getElementById('decode_city_history_toggle').addEventListener('click', showDecodeCityHistoryMessage);
	if(typeof initDecodeCityHistoryDeleteControls == 'function')
		initDecodeCityHistoryDeleteControls();
	document.getElementById('external_close').addEventListener('click', external_close);
	addLongpressListener(document.getElementById('external_proceed'), external_proceed_external, external_proceed_internal);
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
	document.getElementById('action_menu_info').tabIndex = decodeView ? 0 : -1;
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
