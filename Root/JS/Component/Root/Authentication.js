function onLogin() {
	if (typeof isOfflineMode === 'function' && isOfflineMode()) {
		showNetworkRequiredMessage('Sign-in');
		return;
	}
	hideAccountDialog();
	showAuthenticationDialog();
	ui.start('#firebaseui-auth', uiConfig);	
}

function onLogout() {
	pushLoader();
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
