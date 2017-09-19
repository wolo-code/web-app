var config = {
	authDomain: "waddress-5f30b.firebaseapp.com",
	databaseURL: "https://waddress-5f30b.firebaseio.com",
	storageBucket: "bucket.appspot.com"
};
firebase.initializeApp(config);

var database = firebase.database();

firebase.database().ref('CityList').on('value', function(snapshot) {
	CityList = snapshot.val();
	if(pendingPosition != null) {
		encode(pendingPosition);
		pendingPosition = null;
	}
	else if(pendingWords != null) {
		decode(pendingWords);
		pendingWords = null;
	}
});
