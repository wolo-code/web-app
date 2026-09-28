function showIncompatibleBrowserMessage() {
	removeClassIfPresent(document.getElementById('incompatible_browser_message'), 'hide');
}

function hideIncompatibleBrowserMessage() {
	addClassIfPresent(document.getElementById('incompatible_browser_message'), 'hide');
	showNotification("This browser is not unsupported");
}
