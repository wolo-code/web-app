firebase.database().ref('WordList').on('value', function(snapshot) {
	wordList = new WordList(snapshot.val());
	if(CityList != null)
		initData();
});

firebase.database().ref('CityDetail').on('value', function(snapshot) {

	CityList = snapshot.val();

	for(let key in CityList) {
		city_id_hashlist[CityList[key].name.toLowerCase()] = key;
		city_styled_wordlist.push(CityList[key].name);
		city_plus_wordList.push(CityList[key].name.toLowerCase());
	};

	if(wordList != null)
		initData();
});

function initData() {
	city_styled_wordlist = city_styled_wordlist.concat(wordList.curList);
	city_plus_wordList = city_plus_wordList.concat(wordList.curList);

	if(pendingPosition != null) {
		encode(pendingPosition);
	}
	else if(pendingWords != null) {
		decode(pendingWords);
	}
}
