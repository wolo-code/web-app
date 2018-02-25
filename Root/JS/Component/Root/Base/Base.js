document.addEventListener('DOMContentLoaded', domInit);
var initWCode = false;

function domInit() {
	versionCheck();
	urlDecode();
}

function setLocationAccess(status) {
	if (typeof(Storage) !== 'undefined') {
		localStorage.location_access = (status == true);
	}
}

function locationAccessCheck() {
	if (typeof(Storage) !== 'undefined' && typeof(localStorage.location_access) !== 'undefined' && localStorage.location_access != '' && JSON.parse(localStorage.location_access) === true) 
		return true;
	return false;
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
	else {
		info_intro.classList.add('hide');
		info_full.classList.remove('hide');
	}
}

function urlDecode() {
	if(window.location.pathname.substr(1) != '') {
		var code = window.location.pathname.substr(1).toLowerCase();
		pendingWords = code.split('.');
		initWCode = true;
	}
}
