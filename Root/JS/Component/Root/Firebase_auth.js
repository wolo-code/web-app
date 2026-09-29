var uiConfig;
var ui;

function isFirebaseUiAvailable() {
	return typeof firebaseui !== 'undefined'
		&& firebaseui
		&& firebaseui.auth
		&& typeof firebaseui.auth.AuthUI === 'function';
}

function isFirebaseAuthAvailable() {
	return typeof firebase === 'object'
		&& firebase
		&& typeof firebase.auth === 'function'
		&& firebase.auth.GoogleAuthProvider
		&& firebase.auth.EmailAuthProvider;
}

function authInit() {
	if (!isFirebaseAuthAvailable()) {
		return false;
	}

	if (!uiConfig) {
		uiConfig = {
			callbacks: {
				signInSuccessWithAuthResult: function(authResult, redirectUrl) {
					signedIn();
					hideOverlay(document.getElementById('firebaseui-auth-container'));
				},
				uiShown: function() {
					popLoader();
				}
			},
			signInFlow: 'redirect',
			signInOptions: [
				firebase.auth.GoogleAuthProvider.PROVIDER_ID,
				firebase.auth.EmailAuthProvider.PROVIDER_ID,
			],
			tosUrl: 'https://wolo.codes/terms',
			privacyPolicyUrl: function() {
				window.location.assign('https://wolo.codes/policy');
			}
		};
	}

	if (isFirebaseUiAvailable()) {
		try {
			ui = (typeof firebaseui.auth.AuthUI.getInstance === 'function' && firebaseui.auth.AuthUI.getInstance())
				|| new firebaseui.auth.AuthUI(firebase.auth());
			return true;
		} catch(e) {
			console.warn('Failed to instantiate Firebase AuthUI:', e);
			return false;
		}
	}

	return false;
}

