//var loaderCount;

function getWaitLoader() {
	return document.getElementById('wait_loader');
}

function pushLoader() {
	removeClassIfPresent(getWaitLoader(), 'hide');
	loaderCount++;
}

function popLoader() {
	if(loaderCount)
		loaderCount--;
	if(!loaderCount)
		addClassIfPresent(getWaitLoader(), 'hide');
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
	addClassIfPresent(getWaitLoader(), 'hide');
}
