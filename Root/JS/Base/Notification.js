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
