// const CURRENT_VERSION;
// var initWCode;
// var initWCode_jumpToMap;

function setLocationAccess(status) {
	if (typeof(Storage) !== 'undefined') {
		localStorage.location_access = (status == true);
	}
}

function locationAccessInitCheck() {
	if(typeof(Storage) !== 'undefined' && typeof(localStorage.location_access) !== 'undefined')
		return true;
	else
		return false;
}

function locationAccessCheck() {
	if (locationAccessInitCheck() === true && localStorage.location_access != '' && JSON.parse(localStorage.location_access) === true)
		return true;
	else
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
	else
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
		else if(localStorage.note_version != '' && localStorage.note_version != 'undefined' && JSON.parse(localStorage.note_version) < CURRENT_VERSION)
			set = true;
	}
	if(set) {
		localStorage.note_version = CURRENT_VERSION;
		showInfo();
		return false;
	}
	else {
		activateOverlayInfo_full();
		return true;
	}
}

function activateOverlayInfo_full() {
	info_intro.classList.add('hide');
	info_full.classList.remove('hide');
}

function urlDecode() {
	if(window.location.pathname.substr(1) != '') {
		var code_string;
		var end_flag_char = window.location.pathname.substr(-1);
		if(end_flag_char == '/') {
			redirect_showLoader();
			code_string = window.location.pathname.substr(1, window.location.pathname.length-2);
			initWCode_jumpToMap = true;
		}
		else if (end_flag_char == '_') {
			init_map_mode = 'satellite';
			code_string = window.location.pathname.substr(1, window.location.pathname.length-2);
			initWCode_jumpToMap = false;
		} 
		else {
			code_string = window.location.pathname.substr(1);
			initWCode_jumpToMap = false;
		}
		
		if(!code_string.match(/^[A-Za-z0-9._]+$/)) {
			window.location.replace('/404'+'?url='+window.location.host+window.location.pathname+window.location.search);
			return false;
		}
		else {			
			var code = code_string.toLowerCase().replace('_', ' ');
			pendingWords = code.split('.');
			initWCode = true;
			return true;
		}
	}
	else
		return false;
}
