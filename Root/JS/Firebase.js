// var database;
// var refCityCenter;
// var geoFire;

var firebaseDatabaseRetryStarted = false;
var firebaseSdkRetryAttempted = false;
var firebaseClientUnavailable = false;

function hasFirebaseDatabase() {
	return typeof firebase == 'object' && typeof firebase.database == 'function';
}

function findFirebaseSdkScript(fileName) {
	return document.querySelector('script[src*="/' + fileName + '"]');
}

function appendFirebaseSdkRetry(source, onload, onerror) {
	var retry = document.createElement('script');
	retry.src = source.src + (source.src.indexOf('?') == -1 ? '?' : '&') + '_retry=' + Date.now();
	retry.onload = onload;
	retry.onerror = onerror;
	document.head.appendChild(retry);
}

function finishFirebaseSdkRetry() {
	firebaseDatabaseRetryStarted = false;
	if(typeof initLoad == 'function')
		initLoad();
}

function retryFirebaseDatabaseSdk() {
	var appSource;
	var databaseSource;
	if(firebaseDatabaseRetryStarted)
		return true;
	if(firebaseSdkRetryAttempted)
		return false;
	appSource = findFirebaseSdkScript('firebase-app.js');
	databaseSource = findFirebaseSdkScript('firebase-database.js');
	if(typeof firebase != 'object' && !appSource && !databaseSource)
		return false;
	if(typeof firebase == 'object' && typeof firebase.database != 'function' && !databaseSource)
		return false;
	firebaseSdkRetryAttempted = true;
	firebaseDatabaseRetryStarted = true;
	function loadDatabase() {
		if(!databaseSource || (typeof firebase == 'object' && typeof firebase.database == 'function')) {
			finishFirebaseSdkRetry();
			return;
		}
		appendFirebaseSdkRetry(databaseSource, finishFirebaseSdkRetry, finishFirebaseSdkRetry);
	}
	if(typeof firebase != 'object' && appSource) {
		appendFirebaseSdkRetry(appSource, loadDatabase, finishFirebaseSdkRetry);
		return true;
	}
	loadDatabase();
	return true;
}

function markFirebaseClientUnavailable() {
	firebaseClientUnavailable = true;
	database = null;
	refCityCenter = null;
	geoFire = null;
	if(typeof showNotification == 'function')
		showNotification('Using cached data while Firebase is unavailable');
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
	if(hasFirebaseDatabase()) {
		firebaseClientUnavailable = false;
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
		return true;
	}
	if(retryFirebaseDatabaseSdk())
		return false;
	markFirebaseClientUnavailable();
	return true;
}

function geoFireInit() {
	if(geoFire != null)
		return true;
	if(!refCityCenter || typeof GeoFire != 'function')
		return false;
	geoFire = new GeoFire(refCityCenter);
	return true;
}
