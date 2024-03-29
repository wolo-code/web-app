function showNotification(message, duration) {
	// var NOTIFICATION_DURATION_DEFAULT = 2500;
	// var NOTIFICATION_DURATION_LONG = 10000;
	
	if(typeof duration == 'undefined')
		duration = NOTIFICATION_DURATION_DEFAULT;
		
	notification_bottom.innerHTML = message;
	notification_bottom.classList.remove('hide');
	clearNotificationTimer();
	notification_timer = setTimeout(function() {
		notification_bottom.innerText = '';
		notification_bottom.classList.add('hide');
	}, duration);
	
}

function hideNotication() {
	notification_bottom.classList.add('hide');
}

function clearNotificationTimer() {
	if(typeof notification_timer != 'undefined' && notification_timer != null)
		clearTimeout(notification_timer);
}
