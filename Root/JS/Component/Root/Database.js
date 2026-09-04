function dbInit() {
	initOfflineWordList();
	database.ref('WordList').on('value', function(snapshot) {
		var list = snapshot.val();
		if (!list) {
			return;
		}
		wordList = new WordList(list);
		city_styled_wordlist = wordList.curList;
		saveWordListSnapshot(list);
		initData();
	}, function(error) {
		if (!wordList) {
			initOfflineWordList();
		}
		if (typeof showNotification === 'function' && isOfflineMode()) {
			showNotification('Using cached word list while offline');
		}
	});
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
