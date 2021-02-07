function suggestWrapper(event) {
	if(typeof wordList != undefined && wordList != null) {
		cityNameList = [];
		getCitiesFromNameId(event.srcElement.value.toLowerCase(), function(cityList) {
			for(let key in cityList)
				if(cityNameList.indexOf(getProperCityAccent(cityList[key])) == -1)
					cityNameList.push(getProperCityAccent(cityList[key]));
			city_styled_wordlist = cityNameList.concat(wordList.curList);
			suggestComplete(event.srcElement);
		});
		suggestComplete(event.srcElement);
	}
}

function suggestComplete(e) {
	var input_array = e.value.toLowerCase().split(' ');
	var curList;
	if(input_array.length > 0)
		curList = getPossibleList(input_array.slice(0, -1));
	if(curList != null) {
		var curWord = input_array[input_array.length-1];
		if(curList != city_styled_wordlist && curList != wordList.curList) {
			var compareWord = input_array.slice(0, -1).join(' ')+' ';
			var newList = [];
			var regEx = new RegExp(compareWord, 'ig');
			curList.forEach(function(city_name) {
				if(city_name.toLowerCase().startsWith(compareWord))
					newList.push(city_name.replace(regEx, ''));
			});
			curList = newList;
		}
		changeInput(e, curList, curWord);
	}
	else
		document.getElementById(e.getAttribute('data-suggest')).innerText = '';
};

function getPossibleList(code) {
	var list;

	if(code.length == 0)
		list = city_styled_wordlist;
	else {
		var i;
		for(i = code.length; i > 0; i--) {
			var cityName = code.slice(0, i).join(' ');
			if(cityNameList.includes(cityName)) {
				list = wordList.curList;
				break;
			}
			else {
				list = matchWord(city_styled_wordlist, cityName+' ');
				if(list && list.length > 0)
					break;
			}
		}
		for(; i < code.length; i++) {
			if(!wordList.indexOf(code[i]))
				return null;
			else
				list = wordList.curList;
		}
	}
	return list;
}

function matchWord(list, input) {
	if(input.match(/^[A-Za-z]+$/)) {
		var regEx = new RegExp(input.split('').join('\\w*').replace(/\W/, ''), 'i');
		return list.filter(function(word) {
			if (word.match(regEx)) {
				if(word.toLowerCase().startsWith(input))
					if(word.toLowerCase() != input)
						return word;
			}
		});
	}
	else
		return [];
}

function changeInput(e, list, val) {
	var autoCompleteResult = matchWord(list, val);
	document.getElementById(e.getAttribute('data-suggest')).innerText = '';
	if(autoCompleteResult.length < 5 || val.length > 2)
		for(var i = 0; i < autoCompleteResult.length && i < 10; i++) {
			var option = document.createElement('div');
			option.innerText = autoCompleteResult[i];
			option.addEventListener('click', chooseWord);
			document.getElementById(e.getAttribute('data-suggest')).appendChild(option);
		}
}

function chooseWord(event) {
	var cur_word = document.getElementById(event.srcElement.parentElement.getAttribute('data-input')).value.split(' ');
	cur_word[cur_word.length-1] = this.innerText;
	document.getElementById(event.srcElement.parentElement.getAttribute('data-input')).value = cur_word.join(' ') + ' ';
	document.getElementById(event.srcElement.parentElement.getAttribute('data-input')).focus();
	resizeInput.call( document.getElementById(event.srcElement.parentElement.getAttribute('data-input')) );
	event.srcElement.parentElement.innerText = '';
}
