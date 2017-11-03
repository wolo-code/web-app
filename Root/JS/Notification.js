function showNotification(message) {
	notification.innerText = message;
	notification.classList.remove('hide');
	if(typeof notification_timer != 'undefined' && notification_timer != null)
		clearTimeout(notification_timer);
	notification_timer = setTimeout(function(){
		notification.innerText = '';
		notification.classList.add('hide');
	}, 2500);
}
