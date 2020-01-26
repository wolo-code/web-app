function onLogin() {
	showAuthenticationDialog();
	hideAccountDialog();
	ui.start('#firebaseui-auth', uiConfig);	
}

function onLogout() {
	document.getElementById('firebaseui-auth-container').classList.remove('hide');
	firebase.auth().signOut()
	.then(function() {
		document.getElementById('firebaseui-auth-container').classList.add('hide');
		document.getElementById('account_dialog_container').classList.add('hide');
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
	document.getElementById('firebaseui-auth-container').classList.remove('hide');
}

function hideAuthenticationDialog() {
	document.getElementById('firebaseui-auth-container').classList.add('hide');
}
