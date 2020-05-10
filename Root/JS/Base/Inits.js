// .\Script
var DEFAULT_LATLNG = {lat: -34.397, lng: 150.644};
var DEFAULT_INIT_ZOOM = 2;
var DEFAULT_LOCATE_ZOOM = 24;
var pendingInitMap = true;
var syncLocate_engage;

// Firebase
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
