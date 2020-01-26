var uiConfig;
var ui;

function authInit() {
	uiConfig = {
		callbacks: {
			signInSuccessWithAuthResult: function(authResult, redirectUrl) {
				signedIn();
				document.getElementById('firebaseui-auth-container').classList.add('hide');
			},
			uiShown: function() {
				wait_loader.classList.add('hide');
			}
		},
		signInFlow: 'popup',
		signInOptions: [
			firebase.auth.GoogleAuthProvider.PROVIDER_ID,
			firebase.auth.FacebookAuthProvider.PROVIDER_ID,
			firebase.auth.EmailAuthProvider.PROVIDER_ID,
		],
		tosUrl: 'https://location.wcodes.org/tos',
		privacyPolicyUrl: function() {
			window.location.assign('https://location.wcodes.org/ppc');
		}
	};
	
	ui = new firebaseui.auth.AuthUI(firebase.auth());
}
