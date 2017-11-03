function noCity(position) {
	getAddress(position);
	showAddress();
	showNoCityMessage();
	infoWindow.setContent("City not in database");
}

function submitCity() {
	if(address == "")
		pendingCitySubmit = true;
	else
		execSubmitCity();
}

function execSubmitCity() {
	var newPostKey = firebase.database().ref().child('CityRequest').push().key;
	var updates = {};
	var data = {
			"time": firebase.database.ServerValue.TIMESTAMP,
			"gp_id": gpId,
			"address": address,
			"processed": false
		};
	updates['/CityRequest/' + newPostKey] = data;
	firebase.database().ref().update(updates);
	showNotification("Request submitted. Check back later");
}
