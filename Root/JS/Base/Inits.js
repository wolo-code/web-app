// .\Script
var DEFAULT_LATLNG = {lat: -34.397, lng: 150.644};
var DEFAULT_INIT_ZOOM = 2;
var DEFAULT_LOCATE_ZOOM = 24;
var pendingInitMap = true;

// Firebase
var FIREBASE_CONFIG = {
	apiKey: "AIzaSyC-ZxXuNOEEs5mNQD3Z8u4CSJtldtLztDE",
	authDomain: "wolo.codes",
	databaseURL: "https://wolo-codes.firebaseio.com",
	projectId: "wolo-codes",
	storageBucket: "wolo-codes.appspot.com",
	messagingSenderId: "1073432021665",
	appId: "1:1073432021665:web:29ab7635459c72c19bbee0",
	measurementId: "G-882VJ942XZ"
};
var analytics;
var perf;
var database;
var refCityCenter;
var geoFire;

//Script
var initLoadDone = false;

// UpdateMyBrowser
var _umb = {
	require: {
		chrome: 60,
		firefox: 37,
		ie: 10,
		opera: 7,
		safari: 29
	}
};
