// var database;
// var refCityCenter;
// var geoFire;

function firebaseInit() {
	firebase.initializeApp(FIREBASE_CONFIG);
	database = firebase.database();
	refCityCenter = database.ref('CityCenter');
	geoFire = new GeoFire(refCityCenter);
}
