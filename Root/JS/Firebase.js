firebase.initializeApp(FIREBASE_CONFIG);
var database = firebase.database();
var refCityCenter = firebase.database().ref('CityCenter');
var geoFire = new GeoFire(refCityCenter);
