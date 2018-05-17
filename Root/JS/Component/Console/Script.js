var auth_processed = false;
var target_id;

function initLoad () {
	if(!initLoadDone && document.readyState === 'interactive') {
		initApp();
		setupControls();
		setTargetIndex();
		initLoadDone = true;
	}
};

function initApp() {
	firebase.auth().getRedirectResult().then(function(result) {
		if (result.credential) {
			// This gives you a Google Access Token. You can use it to access the Google API.
			//var token = result.credential.accessToken;
			queryPendingList();
		}
		else if (firebase.auth().currentUser) {
			queryPendingList();
			// User already signed in.
			// Update your UI, hide the sign in button.
		} else {
			showRestrictedBlock();
			// No user signed in, update your UI, show the sign in button.
			var provider = new firebase.auth.GoogleAuthProvider();
			firebase.auth().signInWithRedirect(provider);
		}
		var user = result.user;
	}).catch(function(error) {
		var errorCode = error.code;
		var errorMessage = error.message;
		// The email of the user's account used.
		var email = error.email;
		// The firebase.auth.AuthCredential type that was used.
		var credential = error.credential;
		// ...
	});
}

function initMap() {
	if(auth_processed)
		initialize();
	else
		map_processed = true;
}

function setupControls() {
	
	view_data_index.addEventListener('click', function(e) {
		showDetails();
	});
	
	details_close.addEventListener('click', function(e) {
		hideDetails();
	});
	
	data_previous.addEventListener('click', function(e) {
		previousRow();
	});
	
	data_reject.addEventListener('click', function(e) {
		process_entry(data[data_index].id);
		deleteRow();
//		updateRow();
	});
	
	data_next.addEventListener('click', function(e) {
		nextRow();
	});
	
	data_process_checkbox.addEventListener('change', function() {
		if(this.checked) {
			var entry = data[data_index];
			map.panTo(entry.lat_lng);
			showEntryMarker(entry.lat_lng);			
		}
		else {
			
		}
	});
	
	submit_city_button.addEventListener('click', function() {
		if(city_lat.value != '' && city_lng.value != '')
			if(city_submit_panel.checkValidity()) {
				submit_city(city_lat.value, city_lng.value, city_country.value.trim(), city_group.value.trim(), city_name.value.trim());
				if(data_process_checkbox.checked)
					process_entry(data[data_index].id);
			}
			else
				showNotification("Check form data");
		else
			showNotification("Did you not select a search result?");
	});
	
}
