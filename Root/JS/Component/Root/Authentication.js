function onLogin() {
	hideAccountDialog();
	showAuthenticationDialog();
	ui.start('#firebaseui-auth', uiConfig);	
}

function onLogout() {
	document.getElementById('wait_loader').classList.remove('hide');
	firebase.auth().signOut()
	.then(function() {
		document.getElementById('wait_loader').classList.add('hide');
		hideOverlay(document.getElementById('firebaseui-auth-container'));
		hideOverlay(document.getElementById('account_dialog_container'));
		document.getElementById('account_user_image').classList.add('hide');
		document.getElementById('account_user_image').setAttribute('src', null);
		document.getElementById('account_default_image').classList.remove('hide');
		document.getElementById('account_default_image').classList.add('inactive');
		document.getElementById('account_default_image').classList.remove('hide');
		document.getElementById('account_dialog_save_list_loader').classList.remove('hide');
		document.getElementById('account_dialog_save_list_placeholder').classList.add('hide');
		document.getElementById('account_dialog_save_list').innerHTML = '';
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
