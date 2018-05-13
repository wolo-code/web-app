function syncCheckIncompatibleBrowserMessage() {
	if(UMB.getStatus() == 'unsupported')
		showIncompatibleBrowserMessage();
}
