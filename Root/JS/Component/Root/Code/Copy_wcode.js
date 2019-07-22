// const WCODE_CODE_COPIED_MESSAGE;
// const WCODE_LINK_COPIED_MESSAGE;

function showCopyWcodeMessage() {
	var city_name_id = getCodeCityNameId();
	var country_name = getCodeCityCountryName();
	var group_name = getCodeCityGroupName();
	var country_repeat_count = 0;
	var group_repeat_count = 0;
	var city_repeat_count = 0;
	getCitiesFromNameId(city_name_id, function(cities) {
		for(let key in cities) {
			if(cities[key].country == country_name)
				country_repeat_count++;
			if(cities[key].group == group_name)
				group_repeat_count++;
			city_repeat_count++;
		}
		var prefix = '';
		if(country_repeat_count != city_repeat_count) {
			prefix = country_name + '\\';
			multiple_country = true;
		}
		else
			multiple_country = false;

		if(group_repeat_count != city_repeat_count) {
			prefix += group_name + '\\';
			multiple_group = true;
		}
		else
			multiple_group = false;
		if(city_repeat_count)
			multiple_city = true;
		else
			multiple_city = false;

		copy_wcode_message_city_name.innerText = prefix+getCodeCityProperCityAccent();
		copy_wcode_message.classList.remove('hide');
	} );
}

function hideCopyCodeMessage() {
	copy_wcode_message.classList.add('hide');
	copy_wcode_message_city_name.innerText = '';
}

function copyWcodeFull() {
	showAndCopy(getWcodeFull_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function copyWcodeCode() {
	showAndCopy(getCodeWcode_formatted().join(' '));
	showNotification(WCODE_CODE_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function copyWcodeLink() {
	var code_url = location.hostname + '/' + getCodeFull().join('.').toLowerCase().replace(' ', '_');
	showAndCopy(code_url);
	showNotification(WCODE_LINK_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function copyWcodeJumpLink() {
	var code_url = location.hostname + '/' + getCodeFull().join('.').toLowerCase().replace(' ', '_') + '/';
	showAndCopy(code_url);
	showNotification(WCODE_LINK_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function shareWCodeCopy() {
	if(share_include_city.checked)
		copyWcodeFull();
	else
		copyWcodeCode();
}

function shareWCodeLink() {
	if(share_jumto_map.checked)
		copyWcodeJumpLink();
	else
		copyWcodeLink();
}
