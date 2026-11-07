function postMap() {
	if(restoreMapRoute()) return;
	if(pendingLocate)
		syncLocate();
	if(pendingPosition) {
		infoWindow_setContent(MESSAGE_LOADING);		
		focus___(pendingPosition);
	}
}
