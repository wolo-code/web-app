var DEFAULT_WCODE = ['bangalore', 'diesel', 'hall', 'planet'];
var pendingCity = false;

function noCity(position) {
	showAddress();
	showNoCityMessage();
	infoWindow.setContent("Location not in database");
}

function submitCity() {
	if(address == "")
		pendingCitySubmit = true;
	else {
		execSubmitCity();
		pendingCity = true;
	}
}

function execSubmitCity() {
	var newPostKey = firebase.database().ref().child('CityRequest').push().key;
	var updates = {};
	var data = {
			"time": firebase.database.ServerValue.TIMESTAMP,
			"lat_lng": latLng_p,
			"gp_id": gpId,
			"address": address,
			"processed": false
		};
	updates['/CityRequest/' + newPostKey] = data;
	firebase.database().ref().update(updates);
	showNotification("Request submitted");
}

function tryDefaultCity() {
	decode(DEFAULT_WCODE);
	notification_top.classList.add('hide');
	infoWindow.close();
}
