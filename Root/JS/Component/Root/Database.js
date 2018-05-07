firebase.database().ref('WordList').on('value', function(snapshot) {
	wordList = new WordList(snapshot.val());
	if(CityList != null)
		initData();
});

firebase.database().ref('CityList').on('value', function(snapshot) {
	
	CityList = snapshot.val();
	
	CityList.forEach (function(city){
		city_styled_wordlist.push(city.name);
		city_plus_wordList.push(city.name.toLowerCase());
	});
	
	if(wordList != null)
		initData();
});

function initData() {
	city_plus_wordList = city_plus_wordList.concat(wordList.wordList);
	
	if(pendingPosition != null) {
		encode(pendingPosition);
	}
	else if(pendingWords != null) {
		decode(pendingWords);
	}
}
