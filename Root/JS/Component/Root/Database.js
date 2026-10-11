function dbInit() {
	initOfflineWordList();
}

function initData() {
	if(pendingPosition != null) {
		encode(pendingPosition);
	}
	else if(pendingWords != null) {
		initWCode_jump_ask = true;
		decode(pendingWords);
	}
}
