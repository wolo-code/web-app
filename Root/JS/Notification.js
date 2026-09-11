var NOTIFICATION_FADE_MS = 400;

function showNotification(message, duration) {
	if(typeof duration == 'undefined')
		duration = NOTIFICATION_DURATION_DEFAULT;

	clearNotificationTimer();
	notification_bottom.innerHTML = message;
	notification_bottom.classList.remove('hide', 'fade-out');
	notification_timer = setTimeout(function() {
		fadeOutNotification();
	}, duration);
}

function hideNotication() {
	fadeOutNotification();
}

function fadeOutNotification() {
	if(!notification_bottom || notification_bottom.classList.contains('hide')) {
		return;
	}
	clearNotificationTimer();
	notification_bottom.classList.add('fade-out');
	notification_timer = setTimeout(function() {
		notification_bottom.innerText = '';
		notification_bottom.classList.add('hide');
		notification_bottom.classList.remove('fade-out');
		notification_timer = null;
	}, NOTIFICATION_FADE_MS);
}

function clearNotificationTimer() {
	if(typeof notification_timer != 'undefined' && notification_timer != null)
		clearTimeout(notification_timer);
}
