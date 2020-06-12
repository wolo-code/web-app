function hideOverlay(e) {
	if(!e.classList.contains('hide'))
		e.classList.add('hide');
	if(!document.getElementById('overlay').classList.contains('hide'))
		document.getElementById('overlay').classList.add('hide');			
}

function showOverlay(e) {
	if(document.getElementById('overlay').classList.contains('hide'))
		document.getElementById('overlay').classList.remove('hide');
	if(e.classList.contains('hide'))
		e.classList.remove('hide');
}
