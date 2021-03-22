function postMap() {
	if(pendingLocate)
		syncLocate();
	if(pendingPosition) {
		infoWindow_setContent(MESSAGE_LOADING);		
		focus___(pendingPosition);
	}
}
