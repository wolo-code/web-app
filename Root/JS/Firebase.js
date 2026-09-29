// var database;
// var refCityCenter;
// var geoFire;

var firebaseDatabaseRetryStarted = false;

function retryFirebaseDatabaseSdk() {
	var source = document.querySelector('script[src*="/firebase-database.js"]');
	var retry;
	if(firebaseDatabaseRetryStarted || !source)
		return false;
	firebaseDatabaseRetryStarted = true;
	retry = document.createElement('script');
	retry.src = source.src + (source.src.indexOf('?') == -1 ? '?' : '&') + '_retry=' + Date.now();
	retry.onload = function() {
		firebaseDatabaseRetryStarted = false;
		if(typeof initLoad == 'function')
			initLoad();
	};
	retry.onerror = function() {
		firebaseDatabaseRetryStarted = false;
		showErrorPrompt(new Error('Firebase Database SDK failed to load'));
	};
	document.head.appendChild(retry);
	return true;
}

function isFirebaseAuthNetworkError(error) {
	var message = '';
	if(error) {
		if(error.message)
			message = error.message;
		else if(typeof error == 'string')
			message = error;
	}
	if(error && error.code == 'auth/network-request-failed')
		return true;
	return message.indexOf('Network Error') != -1
		|| message.indexOf('network-request-failed') != -1
		|| message.indexOf('Failed to fetch') != -1
		|| message.indexOf('Load failed') != -1;
}

function isFirebaseIndexedDbClosingError(error) {
	var message = '';
	if(error) {
		if(error.message)
			message = error.message;
		else if(typeof error == 'string')
			message = error;
	}
	return message.indexOf('database connection is closing') != -1 && (!error.name || error.name == 'InvalidStateError');
}

function isFirebaseInstallationError(error) {
	var message = '';
	if(error) {
		if(error.code && typeof error.code == 'string' && error.code.indexOf('installations/') != -1)
			return true;
		if(error.message)
			message = error.message;
		else if(typeof error == 'string')
			message = error;
	}
	return message.indexOf('installations/') != -1 || message.indexOf('Installations:') != -1;
}

function isFirebaseUiMissingError(error) {
	var message = '';
	if(error) {
		if(error.message)
			message = error.message;
		else if(typeof error == 'string')
			message = error;
	}
	return message.indexOf('firebaseui') != -1 || message.indexOf('firebase ui') != -1;
}

function recoverFirebaseIndexedDbConnection(error) {
	if(typeof Sentry != 'undefined')
		Sentry.captureException(error);
	if(typeof sessionStorage != 'undefined' && sessionStorage.firebase_indexeddb_recovery == 'reloading')
		return true;
	if(typeof sessionStorage != 'undefined')
		sessionStorage.firebase_indexeddb_recovery = 'reloading';
	window.location.reload();
	return true;
}

function firebaseResumeRecoveryInit() {
	window.addEventListener('error', function(event) {
		if(isFirebaseUiMissingError(event.error || event.message)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		if(isFirebaseInstallationError(event.error || event.message)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		if(isFirebaseIndexedDbClosingError(event.error || event.message)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			recoverFirebaseIndexedDbConnection(event.error || new Error(event.message));
		}
	}, true);
	window.addEventListener('unhandledrejection', function(event) {
		if(isFirebaseUiMissingError(event.reason)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		if(isFirebaseInstallationError(event.reason)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		if(isFirebaseIndexedDbClosingError(event.reason)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			recoverFirebaseIndexedDbConnection(event.reason);
		}
	}, true);
	if(typeof sessionStorage != 'undefined' && sessionStorage.firebase_indexeddb_recovery == 'reloading') {
		setTimeout(function() {
			delete sessionStorage.firebase_indexeddb_recovery;
		}, 5000);
	}
}

function firebaseInit() {
	if(typeof firebase != 'object' || typeof firebase.database != 'function') {
		retryFirebaseDatabaseSdk();
		return false;
	}
	firebaseResumeRecoveryInit();
	pushLoader();
	firebase.initializeApp(FIREBASE_CONFIG);
	popLoader();
	if(typeof authInit != 'undefined') {
		try {
			authInit();
		} catch(authError) {
			console.warn('Firebase Auth UI initialization deferred or failed:', authError);
		}
	}
	if(typeof firebase.analytics != 'undefined') {
		try {
			analytics = firebase.analytics();
		} catch(analyticsError) {}
	}
	if(typeof firebase.performance != 'undefined') {
		try {
			perf = firebase.performance();
		} catch(perfError) {}
	}
	database = firebase.database();
	refCityCenter = database.ref('CityCenter');
	return true;
}

function geoFireInit() {
	if(geoFire == null)
		geoFire = new GeoFire(refCityCenter);
}
