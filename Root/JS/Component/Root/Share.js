// const WCODE_CODE_COPIED_MESSAGE;
// const WCODE_LINK_COPIED_MESSAGE;

function handleShareWCode() {
	if (navigator.share)
		shareWCode();
	else
		copyWcodeJumpLink();
}

function shareWCode() {
	var share_address;
	if(current_address)
		share_address = current_address;
	else
		share_address = address;
	navigator.share( {
		title: "Wolo",
		text: "Wolo code for: " + ' ' + share_address + ' ' + '|',
		url: '/' + getCodeComplete().join('.').toLowerCase().replace(' ', '_') + '/'
	} )
	.catch((error) => console.log('Error sharing', error));
}

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
			if(getCityGroupName(cities[key]) == group_name)
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

		showOverlay(document.getElementById('copy_wcode_message'));
	} );
}

function hideCopyCodeMessage() {
	hideOverlay(document.getElementById('copy_wcode_message'));
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
	var code_url = location.hostname + '/' + getCodeComplete().join('.').toLowerCase().replace(' ', '_');
	showAndCopy(code_url);
	showNotification(WCODE_LINK_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function copyWcodeJumpLink() {
	var code_url = location.hostname + '/' + getCodeComplete().join('.').toLowerCase().replace(' ', '_') + '/';
	showAndCopy(code_url);
	showNotification(WCODE_LINK_COPIED_MESSAGE);
	hideCopyCodeMessage();
}

function shareWCodeLink() {
	if(share_jumto_map.checked)
		copyWcodeJumpLink();
	else
		copyWcodeLink();
}

function gotoCoordinate() {
	window.location.assign(getIntentURL(code_postition, code_city.name_id + ' ' + code_wcode.join(' ')));
}
