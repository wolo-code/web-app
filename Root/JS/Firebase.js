// var database;
// var refCityCenter;
// var geoFire;

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
		if(isFirebaseIndexedDbClosingError(event.error || event.message)) {
			event.preventDefault();
			event.stopImmediatePropagation();
			recoverFirebaseIndexedDbConnection(event.error || new Error(event.message));
		}
	}, true);
	window.addEventListener('unhandledrejection', function(event) {
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
	firebaseResumeRecoveryInit();
	pushLoader();
	firebase.initializeApp(FIREBASE_CONFIG);
	popLoader();
	if(typeof authInit != 'undefined')
		authInit();
	if(typeof firebase.analytics != 'undefined')
		analytics = firebase.analytics();
	if(typeof firebase.performance != 'undefined')
		perf = firebase.performance();
	database = firebase.database();
	refCityCenter = database.ref('CityCenter');
}

function geoFireInit() {
	if(geoFire == null)
		geoFire = new GeoFire(refCityCenter);
}
