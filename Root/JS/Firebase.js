// var database;
// var refCityCenter;
// var geoFire;

function firebaseInit() {
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
