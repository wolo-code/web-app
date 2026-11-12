// const CURRENT_VERSION;
// var initWCode;
// var initWCode_jumpToMap;
// var initWCode_jump_ask;
var pendingWoloLinkZoom;
var directWoloLinkEntry = false;

function isDirectWoloLinkEntry(location) {
	if(location.pathname !== '/')
		return true;

	var params = new URLSearchParams(location.search);
	return !!params.get('q') || (params.has('from') && params.has('to'));
}

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
		if(typeof markDecodeIconGuideAwaitingIntro == 'function')
			markDecodeIconGuideAwaitingIntro();
		showInfo();
		return false;
	}
	else {
		activateOverlayInfo_full();
		return true;
	}
}

function activateOverlayInfo_full() {
	addClassIfPresent(document.getElementById('info_intro'), 'hide');
	addClassIfPresent(document.getElementById('info_links'), 'hide');
	removeClassIfPresent(document.getElementById('info_message_close'), 'hide');
	removeClassIfPresent(document.getElementById('info_full'), 'hide');
	addClassIfPresent(document.getElementById('info_agency'), 'hide');
}

function activateOverlayInfo_links() {
	addClassIfPresent(document.getElementById('info_intro'), 'hide');
	addClassIfPresent(document.getElementById('info_full'), 'hide');
	removeClassIfPresent(document.getElementById('info_links'), 'hide');
	removeClassIfPresent(document.getElementById('info_message_close'), 'hide');
	removeClassIfPresent(document.getElementById('info_agency'), 'hide');
}

function normalizeWoloPathToken(token) {
	return String(token || '').toLowerCase().replace(/\+/g, ' ').replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
}

function toCanonicalWoloPathToken(token) {
	return normalizeWoloPathToken(token).replace(/ /g, '-');
}

function getCanonicalWoloPathFromWords(words, suffix) {
	var list = Array.isArray(words) ? words : [];
	var canonical = list.map(toCanonicalWoloPathToken).filter(function(entry) { return entry.length > 0; }).join('.');
	return '/' + canonical + (suffix || '');
}

function parseWoloPathWords(rawCodeString) {
	var decoded = String(rawCodeString || '');
	try {
		decoded = decodeURIComponent(decoded);
	}
	catch(error) {
		return null;
	}
	var words = decoded.split('.').map(normalizeWoloPathToken);
	if(words.length < 4 || words.some(function(entry) { return entry.length === 0; }))
		return null;
	return words;
}

function urlDecode() {
	if(window.location.pathname.substr(1) != '') {
		var code_string;
		var suffix = '';
		var end_flag_char = window.location.pathname.substr(-1);
		if(end_flag_char == '/') {
			code_string = window.location.pathname.substr(1, window.location.pathname.length-2);
			initWCode_jumpToMap = true;
			suffix = '/';
		}
		else if (end_flag_char == '_') {
			init_map_mode = 'satellite';
			code_string = window.location.pathname.substr(1, window.location.pathname.length-2);
			initWCode_jumpToMap = false;
			suffix = '_';
		} 
		else {
			code_string = window.location.pathname.substr(1);
			initWCode_jumpToMap = false;
		}
		
		if(!code_string.match(/^[A-Za-z0-9._%+-]+$/)) {
			window.location.replace('/404'+'?url='+window.location.host+window.location.pathname+window.location.search);
			return false;
		}
		else {
			var parsedWords = parseWoloPathWords(code_string);
			if(!parsedWords) {
				window.location.replace('/404'+'?url='+window.location.host+window.location.pathname+window.location.search);
				return false;
			}
			pushLoader();
			pendingWords = parsedWords;
			pendingWoloLinkRedirect = suffix === '/';
			if(initWCode_jumpToMap)
				redirect_showLoader(parsedWords);
			var zoomParam = window.location.search && new URLSearchParams(window.location.search).get('zoom');
			pendingWoloLinkZoom = zoomParam && /^\d+(\.\d+)?$/.test(zoomParam) && Number.isFinite(Number(zoomParam))
				? Number(zoomParam) : null;
			var canonicalPath = getCanonicalWoloPathFromWords(parsedWords, suffix);
			if(window.location.pathname !== canonicalPath && window.history && typeof window.history.replaceState == 'function')
				window.history.replaceState(window.history.state, '', canonicalPath + window.location.search);
			initWCode = true;
			return true;
		}
	}
	else {
		var urlParams = new URLSearchParams(window.location.search);
		var qParam = urlParams.get('q');
		if(qParam != null && qParam != '') {
			toggleMapType();
			var lat_lng = qParam.split(',');
			pendingPosition = {lat: parseFloat(lat_lng[0]), lng: parseFloat(lat_lng[1])};
		}
		return false;
	}
}
