document.addEventListener('DOMContentLoaded', domInit);

var CURRENT_VERSION = 1;
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

function setLocationAccessDND(status) {
	if (typeof(Storage) !== 'undefined') {
		localStorage.location_access_dnd = (status == true);
	}
}

function locationAccessDNDcheck() {
	if(locationAccessDNDstatus() && JSON.parse(localStorage.location_access_dnd) === true) 
		return true;
	return false;
}

function locationAccessDNDstatus() {
	if (typeof(Storage) !== 'undefined' && typeof(localStorage.location_access_dnd) !== 'undefined' && localStorage.location_access_dnd != '')
		return true;
	else {
		setLocationAccessDND(false);
		return false;
	}
}

function versionCheck() {
	var set = false;
	if (typeof(Storage) !== 'undefined') {
		if(typeof(localStorage.note_version) === 'undefined')
			set = true;
		else if(localStorage.note_version != '' && JSON.parse(localStorage.note_version) < CURRENT_VERSION)
			set = true;
	}
	if(set) {
		localStorage.note_version = CURRENT_VERSION;
		initWCode = true;
		showOverlay();
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
	else
		locate();
}
