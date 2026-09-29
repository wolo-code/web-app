var firebaseUiRetryStarted = false;

function retryFirebaseUiSdk(onSuccess, onError) {
	var source = document.querySelector('script[src*="firebase-ui-auth.js"]');
	var retry;
	if (firebaseUiRetryStarted || !source)
		return false;
	firebaseUiRetryStarted = true;
	pushLoader();
	retry = document.createElement('script');
	retry.src = source.src + (source.src.indexOf('?') == -1 ? '?' : '&') + '_retry=' + Date.now();
	retry.onload = function() {
		firebaseUiRetryStarted = false;
		popLoader();
		if (typeof authInit === 'function')
			authInit();
		if (typeof onSuccess === 'function')
			onSuccess();
	};
	retry.onerror = function() {
		firebaseUiRetryStarted = false;
		popLoader();
		if (typeof onError === 'function')
			onError();
	};
	document.head.appendChild(retry);
	return true;
}

function showSignInUnavailableMessage() {
	if (typeof showNotification === 'function') {
		showNotification('Sign-in service could not be loaded. Check your connection or ad blocker.', NOTIFICATION_DURATION_LONG);
	} else if (typeof showNetworkRequiredMessage === 'function') {
		showNetworkRequiredMessage('Sign-in');
	}
}

function onLogin() {
	if (typeof isOfflineMode === 'function' && isOfflineMode()) {
		showNetworkRequiredMessage('Sign-in');
		return;
	}
	if (!ui && typeof authInit === 'function') {
		authInit();
	}
	if (!ui) {
		var retried = retryFirebaseUiSdk(function() {
			if (ui) {
				hideAccountDialog();
				showAuthenticationDialog();
				ui.start('#firebaseui-auth', uiConfig);
			} else {
				showSignInUnavailableMessage();
			}
		}, function() {
			showSignInUnavailableMessage();
		});
		if (!retried) {
			showSignInUnavailableMessage();
		}
		return;
	}
	hideAccountDialog();
	showAuthenticationDialog();
	ui.start('#firebaseui-auth', uiConfig);	
}

function onLogout() {
	pushLoader();
	if (typeof firebase !== 'object' || !firebase || typeof firebase.auth !== 'function') {
		popLoader();
		return;
	}
	firebase.auth().signOut()
	.then(function() {
		var userImage = document.getElementById('account_user_image');
		var dialogUserImage = document.getElementById('account_dialog_user_image');
		var saveList = document.getElementById('account_dialog_save_list');
		popLoader();
		hideOverlay(document.getElementById('firebaseui-auth-container'));
		hideOverlay(document.getElementById('account_dialog_container'));
		addClassIfPresent(userImage, 'hide');
		if(userImage)
			userImage.setAttribute('src', null);
		if(typeof showSignedOutAccountChrome == 'function')
			showSignedOutAccountChrome();
		addClassIfPresent(dialogUserImage, 'hide');
		if(dialogUserImage)
			dialogUserImage.setAttribute('src', 'data:,');
		removeClassIfPresent(document.getElementById('account_dialog_default_image'), 'hide');
		removeClassIfPresent(document.getElementById('account_dialog_save_list_loader'), 'hide');
		addClassIfPresent(document.getElementById('account_dialog_save_list_placeholder'), 'hide');
		addClassIfPresent(document.getElementById('account_dialog_save_list_end'), 'hide');
		if(saveList)
			saveList.innerHTML = '';
	})
	.catch(function(error) {
		console.error('logout error');
	});
}

function showAuthenticationDialog() {
	showOverlay(document.getElementById('firebaseui-auth-container'));
}

function hideAuthenticationDialog() {
	hideOverlay(document.getElementById('firebaseui-auth-container'));
}
