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

// Canonical wordlist (https://wordlist.wcodes.org/wordlist.json) comes in two forms:
//   v3 and earlier: a plain array of 1024 words
//   v4+: { version, size, words: [1024 words] }, with retired words in aliases.json
// Returns { version, words } or null.
function normalizeCanonicalWordList(raw) {
	var version;
	var items;
	if(Array.isArray(raw)) {
		version = 3;
		items = raw;
	}
	else if(raw && Array.isArray(raw.words)) {
		version = Number.isInteger(raw.version) ? raw.version : 3;
		items = raw.words;
	}
	else
		return null;
	if(items.length !== 1024)
		return null;
	var words = [];
	for(var i = 0; i < items.length; i++) {
		var item = Array.isArray(items[i]) ? items[i][0] : items[i];
		if(typeof item !== 'string' || !item.trim())
			return null;
		words.push(item.trim().toLowerCase());
	}
	return { version: version, words: words };
}

// Builds Wolo's nested list [[primary, ...aliases], ...] from the canonical list.
// - The primary (encoding) word is always the canonical word for that index.
// - Every word a slot held before stays as an alias, so older codes still decode.
// - Retired words from aliases.json ({ retired: { word: { index } } }) are added as aliases.
// - A plain-array (v3) list never turns a retired alias back into the primary word.
function mergeCanonicalWordList(raw, aliases, existing) {
	var canon = normalizeCanonicalWordList(raw);
	if(!canon)
		return null;
	existing = Array.isArray(existing) ? existing : [];
	var retiredBySlot = {};
	var retired = (aliases && aliases.retired) ? aliases.retired : {};
	for(var word in retired) {
		var entry = retired[word];
		var index = (entry && typeof entry === 'object') ? entry.index : entry;
		if(Number.isInteger(index) && index >= 0 && index < 1024) {
			if(!retiredBySlot[index])
				retiredBySlot[index] = [];
			retiredBySlot[index].push(String(word).trim().toLowerCase());
		}
	}
	var list = [];
	for(var i = 0; i < 1024; i++) {
		var primary = canon.words[i];
		var previous = Array.isArray(existing[i]) ? existing[i] : [];
		if(canon.version <= 3 && previous.length > 1 && previous.indexOf(primary) > 0) {
			list.push(previous.slice());
			continue;
		}
		var slot = [primary];
		var extra = previous.concat(retiredBySlot[i] || []);
		for(var j = 0; j < extra.length; j++) {
			if(typeof extra[j] === 'string' && slot.indexOf(extra[j]) === -1)
				slot.push(extra[j]);
		}
		list.push(slot);
	}
	return list;
}

if(typeof module !== 'undefined' && module.exports)
	module.exports = { WordList: WordList, normalizeCanonicalWordList: normalizeCanonicalWordList, mergeCanonicalWordList: mergeCanonicalWordList };
