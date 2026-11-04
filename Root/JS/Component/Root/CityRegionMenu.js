function cityRegionMenuPosition() {
	return regionPosition(typeof code_postition !== 'undefined' && code_postition) || regionPosition(typeof latLng_p !== 'undefined' && latLng_p);
}

function closeCityRegionMenu(mode) {
	if(mode === 'nearby') hideChooseCity_by_periphery_Message();
	else if(mode === 'matching') hideChooseCityMessage();
	else hideDecodeCityHistoryMessage();
}

function useCityMenuRegion(anchor, mode, position) {
	if(!anchor) return;
	closeCityRegionMenu(mode);
	if(mode === 'matching') {
		chooseCityCallback(anchor);
		return;
	}
	if(!(typeof isDecodeView === 'function' && isDecodeView())) {
		encode_(anchor, position || anchor.center);
		return;
	}
	setDecodeCity(anchor, 'history', true);
	focusSelectedDecodeCityOnMap(anchor);
}

function renderCityRegionMenu(id, mode) {
	var panel = document.getElementById(id + '_region_menu');
	if(!panel) return;
	var point = mode === 'matching' ? null : cityRegionMenuPosition();
	var current = typeof code_city !== 'undefined' && isRegionAnchor(code_city) && regionAnchorFromId(code_city.id);
	var choices = regionAnchorsForPosition(current && point ? current.center : point);
	var list = panel.querySelector('.city_region_list');
	var manual = panel.querySelector('.city_region_manual');
	list.textContent = '';
	choices.forEach(function(choice) {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'city_region_option';
		button.innerHTML = getRegionReferenceHTML(choice.anchor);
		if(typeof code_city !== 'undefined' && code_city && choice.anchor.id === code_city.id)
			button.setAttribute('aria-pressed', 'true');
		button.addEventListener('click', function(event) {
			if(event && event.stopPropagation) event.stopPropagation();
			useCityMenuRegion(choice.anchor, mode, point);
		});
		list.appendChild(button);
	});
	manual.open = choices.length === 0;
	var select = panel.querySelector('.city_region_name');
	var input = panel.querySelector('.city_region_index');
	select.textContent = '';
	allWoloRegions().slice().sort(function(a, b) { return a.name.localeCompare(b.name); }).forEach(function(region) {
		var option = document.createElement('option');
		option.value = region.key;
		option.textContent = region.name;
		select.appendChild(option);
	});
	function setLimit() {
		var region = allWoloRegions().find(function(entry) { return entry.key === select.value; });
		input.max = region ? region.count : 1;
	}
	select.onchange = setLimit;
	input.value = '';
	setLimit();
	panel.querySelector('.city_region_use').onclick = function(event) {
		if(event && event.stopPropagation) event.stopPropagation();
		setLimit();
		if(!input.reportValidity()) return;
		var region = allWoloRegions().find(function(entry) { return entry.key === select.value; });
		var anchor = region && regionAnchor(region, Number(input.value));
		if(anchor) useCityMenuRegion(anchor, mode, null);
	};
	panel.querySelector('.city_region_propose').onclick = function(event) {
		if(event && event.stopPropagation) event.stopPropagation();
		closeCityRegionMenu(mode);
		showCityProposal();
	};
}
