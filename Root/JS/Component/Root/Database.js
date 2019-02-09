database.ref('WordList').on('value', function(snapshot) {
	wordList = new WordList(snapshot.val());
	city_styled_wordlist = wordList.curList;
	initData();
});

function initData() {
	if(pendingPosition != null) {
		encode(pendingPosition);
	}
	else if(pendingWords != null) {
		decode(pendingWords);
	}
}
