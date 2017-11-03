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
