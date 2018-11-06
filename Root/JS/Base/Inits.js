// .\Script
var DEFAULT_LATLNG = {lat: -34.397, lng: 150.644};
var DEFAULT_INIT_ZOOM = 2;
var DEFAULT_LOCATE_ZOOM = 24;
var pendingInitMap = true;

// Firebase
var FIREBASE_CONFIG = {
	apiKey: "AIzaSyCYD7Q0f4ZR0cH0EOi29wVV2Edgb_j5i_s",
	authDomain: "location.wcodes.org",
	databaseURL: "https://waddress-5f30b.firebaseio.com",
	projectId: "waddress-5f30b",
	storageBucket: "waddress-5f30b.appspot.com",
	messagingSenderId: "744968913043"
};

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
