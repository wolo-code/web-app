var offlineWordListReady;
var pendingInitDataRun = false;

function canRunInitDataNow() {
	return typeof map !== 'undefined' && !!map && typeof google === 'object' && !!google && typeof google.maps === 'object';
}

function dbInit() {
	offlineWordListReady = initOfflineWordList();
}

function initData() {
	if((pendingPosition != null || pendingWords != null) && !canRunInitDataNow()) {
		pendingInitDataRun = true;
		return;
	}
	pendingInitDataRun = false;
	if(pendingPosition != null) {
		encode(pendingPosition);
	}
	else if(pendingWords != null) {
		initWCode_jump_ask = true;
		decode(pendingWords);
	}
}

function flushPendingInitData() {
	if(!pendingInitDataRun || !canRunInitDataNow())
		return;
	initData();
}
