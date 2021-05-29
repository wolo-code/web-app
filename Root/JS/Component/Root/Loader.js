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

function clearLoader() {
	loaderCount = 0;
	document.getElementById('wait_loader').classList.add('hide');
}
