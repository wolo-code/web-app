function WordList(list) {
	this.wordList = list;
	this.curList = [];
	
	for(const subList of this.wordList)
		this.curList.push(subList[0]);
	
	this.indexOf = function(word) {
		for(var index = 0; index < 1024; index++) {
			var i = this.wordList[index].indexOf(word);
			if(i != -1)
				return index;
		}
		return -1;
	};
	
	this.getWord = function(index) {
		return this.curList[index];
	};
	
	this.includes = function(word) {
		for(const group of this.wordList) {
			for(const entry of group) {
				if(entry == word)
					return true;
			}
		}
		return false;
	};
	
}
