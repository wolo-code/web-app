// var database;
// var refCityCenter;
// var geoFire;

function firebaseInit() {
	firebase.initializeApp(FIREBASE_CONFIG);
	if(typeof firebase.analytics != 'undefined')
		analytics = firebase.analytics();
	database = firebase.database();
	refCityCenter = database.ref('CityCenter');
	geoFire = new GeoFire(refCityCenter);
}
