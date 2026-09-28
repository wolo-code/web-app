var NOTIFICATION_FADE_MS = 400;

function layoutBottomNotification() {
	var notif = document.getElementById('notification_bottom');
	var stack = document.getElementById('map_bottom_stack');
	if(!notif || !stack || notif.parentElement === stack)
		return;
	var stackH = stack.offsetHeight || 0;
	var gap = stackH ? 8 : 0;
	notif.style.bottom = (80 + stackH + gap) + 'px';
}

function getNotificationBottom() {
	return document.getElementById('notification_bottom');
}

function showNotification(message, duration) {
	var notification = getNotificationBottom();
	if(!notification || !notification.classList)
		return;
	if(typeof duration == 'undefined')
		duration = NOTIFICATION_DURATION_DEFAULT;

	clearNotificationTimer();
	notification.innerHTML = message;
	notification.classList.remove('hide', 'fade-out');
	layoutBottomNotification();
	if(typeof layoutDecodeIconGuide == 'function')
		layoutDecodeIconGuide();
	notification_timer = setTimeout(function() {
		fadeOutNotification();
	}, duration);
}

function hideNotication() {
	fadeOutNotification();
}

function fadeOutNotification() {
	var notification = getNotificationBottom();
	if(!notification || !notification.classList || notification.classList.contains('hide')) {
		return;
	}
	clearNotificationTimer();
	notification.classList.add('fade-out');
	notification_timer = setTimeout(function() {
		var bottom = getNotificationBottom();
		if(bottom) {
			bottom.innerText = '';
			addClassIfPresent(bottom, 'hide');
			removeClassIfPresent(bottom, 'fade-out');
		}
		notification_timer = null;
		if(typeof layoutBottomNotification == 'function')
			layoutBottomNotification();
		if(typeof layoutDecodeIconGuide == 'function')
			layoutDecodeIconGuide();
	}, NOTIFICATION_FADE_MS);
}

function clearNotificationTimer() {
	if(typeof notification_timer != 'undefined' && notification_timer != null)
		clearTimeout(notification_timer);
}
