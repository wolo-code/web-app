function hideInfo() {
	hideOverlay(document.getElementById('info_message'));
}

function showInfo() {
	showOverlay(document.getElementById('info_message'));
}

function closeInfo() {
	hideInfo();
	activateOverlayInfo_full();
	if(!syncLocate_engage) {
		syncLocate();
		syncLocate_engage = true;
	}
}
