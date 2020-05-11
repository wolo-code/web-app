function hideInfo() {
	hideOverlay(document.getElementById('info_message'));
}

function showInfo() {
	document.getElementById('updated-timediff').innerText = getTimeDiff(document.getElementById('updated-timestamp').innerText);
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
