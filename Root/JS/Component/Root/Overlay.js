function hideOverlay(e) {
	document.getElementById('overlay').classList.add('hide');
	e.classList.add('hide');
}

function showOverlay(e) {
	document.getElementById('overlay').classList.remove('hide');
	e.classList.remove('hide');
}
