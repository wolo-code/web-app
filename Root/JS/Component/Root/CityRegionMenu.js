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
	var current = mode !== 'matching' && typeof code_city !== 'undefined' && isRegionAnchor(code_city) && regionAnchorFromId(code_city.id);
	var choices = regionAnchorsForPosition(current && point ? current.center : point);
	var cities = mode === 'nearby' ? panel.parentElement.querySelector('.city_region_cities') : null;
	if(cities) {
		panel.parentElement.insertBefore(current ? panel : cities, current ? cities : panel);
		panel.querySelector('.city_region_choices').open = !!current;
		cities.open = !current;
		if(current) {
			choices = [{anchor: current}].concat(choices.filter(function(choice) {
				return choice.anchor.id !== current.id;
			}));
		}
	}
	var list = panel.querySelector('.city_region_list');
	var manual = panel.querySelector('.city_region_manual');
	list.textContent = '';
	choices.forEach(function(choice) {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'city_region_option';
		button.innerHTML = getRegionReferenceHTML(choice.anchor);
		if(current && choice.anchor.id === current.id)
			button.setAttribute('aria-pressed', 'true');
		button.addEventListener('click', function(event) {
			if(event && event.stopPropagation) event.stopPropagation();
			useCityMenuRegion(choice.anchor, mode, point);
		});
		list.appendChild(button);
	});
	if(!cities) manual.open = choices.length === 0;
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
	function applyManualRegion(event) {
		if(cities) event.preventDefault();
		if(event && event.stopPropagation) event.stopPropagation();
		setLimit();
		if(!input.reportValidity()) return;
		var region = allWoloRegions().find(function(entry) { return entry.key === select.value; });
		var anchor = region && regionAnchor(region, Number(input.value));
		if(!anchor) return;
		if(cities) manual.close();
		useCityMenuRegion(anchor, mode, null);
	}
	if(cities) {
		panel.querySelector('.city_region_manual_open').onclick = function() {
			manual.showModal();
		};
		manual.querySelector('.city_region_manual_cancel').onclick = function() {
			manual.close();
		};
		manual.querySelector('form').onsubmit = applyManualRegion;
	} else {
		panel.querySelector('.city_region_use').onclick = applyManualRegion;
	}
	(cities || panel).querySelector('.city_region_propose').onclick = function(event) {
		if(event && event.stopPropagation) event.stopPropagation();
		closeCityRegionMenu(mode);
		showCityProposal();
	};
}
