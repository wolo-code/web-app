//var loaderCount;

function pushLoader() {
	document.getElementById('wait_loader').classList.remove('hide');
	loaderCount++;
}

function popLoader() {
	if(loaderCount)
		loaderCount--;
	if(!loaderCount)
		document.getElementById('wait_loader').classList.add('hide');
}

function finishInitialLoader() {
	if(!initialLoaderPending)
		return;
	initialLoaderPending = false;
	popLoader();
}

function clearLoader() {
	initialLoaderPending = false;
	loaderCount = 0;
	document.getElementById('wait_loader').classList.add('hide');
}
