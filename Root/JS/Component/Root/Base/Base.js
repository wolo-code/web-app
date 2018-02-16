document.addEventListener('DOMContentLoaded', domInit);
var initWCode = false;
var locationAccess = false;

function domInit() {
	versionCheck();
	urlDecode();
	if (typeof(Storage) !== 'undefined') {
		if (typeof(localStorage.location_access) !== 'undefined')
			locationAccess = JSON.parse(localStorage.location_access);
	}
}

function setLocationAccess() {
	if (typeof(Storage) !== 'undefined') {
		localStorage.location_access = true;
	}
}

function versionCheck() {
	var cur_version = 1;
	if (typeof(Storage) !== 'undefined') {
		if(localStorage.note_version != cur_version) {
			localStorage.note_version = cur_version;
			initWCode = true;
			showOverlay();
		}
	}
}

function urlDecode() {
	if(window.location.pathname.substr(1) != '') {
		var code = window.location.pathname.substr(1).toLowerCase();
		pendingWords = code.split('.');
		initWCode = true;
	}
}
