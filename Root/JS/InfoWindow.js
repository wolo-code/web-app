function copyWCode() {
	showAndCopy(getWCodeFullFromInfoWindow().join(' '));
	showNotification("WCode copied");
}

function copyLink() {
	var wcode_url = location.hostname + '/' + getWCodeFromInfoWindow().join('.');
	showAndCopy(wcode_url.toLowerCase());
	showNotification("WCode link copied");
}

function getWCodeFullFromInfoWindow() {
	var wcode_full = infowindow_code.innerText.replace(/(\r?\n|\r)/gm, ' ').split(' ');
	wcode_full.pop();
	return wcode_full;
}

function getWCodeFromInfoWindow() {
	var wcode = getWCodeFullFromInfoWindow();
	return wcode.slice(1, wcode.length-1);
}
