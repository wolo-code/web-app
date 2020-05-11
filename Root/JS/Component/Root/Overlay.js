function hideOverlay(e) {
	if(!e.classList.contains('hide')) {
		document.getElementById('overlay').classList.add('hide');
		e.classList.add('hide');
	}
}

function showOverlay(e) {
	if(e.classList.contains('hide')) {
		document.getElementById('overlay').classList.remove('hide');
		e.classList.remove('hide');
	}
}
