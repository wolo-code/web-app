var config = {
	apiKey: "AIzaSyCYD7Q0f4ZR0cH0EOi29wVV2Edgb_j5i_s",
	authDomain: "location.wcodes.org",
	databaseURL: "https://waddress-5f30b.firebaseio.com",
	projectId: "waddress-5f30b",
	storageBucket: "waddress-5f30b.appspot.com",
	messagingSenderId: "744968913043"
};
firebase.initializeApp(config);

var database = firebase.database();
function showNotification(message) {
	notification_bottom.innerText = message;
	notification_bottom.classList.remove('hide');
	if(typeof notification_timer != 'undefined' && notification_timer != null)
		clearTimeout(notification_timer);
	notification_timer = setTimeout(function(){
		notification_bottom.innerText = '';
		notification_bottom.classList.add('hide');
	}, 2500);
}
