document.addEventListener('DOMContentLoaded', domInit);
var initWCode = false;

function domInit() {
	versionCheck();
	urlDecode();
}

function versionCheck() {
	var cur_version = 1;
	if (typeof(Storage) !== 'undefined') {
		if(localStorage.note_version == cur_version)
			hideOverlay();
		else {
			localStorage.note_version = cur_version;
			initWCode = true;
		}
	}
}

function urlDecode() {
	if(window.location.pathname.substr(1) != '') {
		var code = window.location.pathname.substr(1).toLowerCase();
		execDecode(code);
		initWCode = true;
	}
}

function hideOverlay() {
	document.getElementById('overlay').classList.add('hide');
}

function showOverlay() {
	document.getElementById('overlay').classList.remove('hide');
}
