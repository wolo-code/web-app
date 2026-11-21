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
	var choices = regionAnchorsForPosition(point);
	var cities = mode === 'nearby' ? panel.parentElement.querySelector('.city_region_cities') : null;
	if(cities) {
		panel.querySelector('.city_region_choices').open = !!current;
		cities.open = !current;
		if(current && !choices.some(function(choice) { return choice.anchor.id === current.id; }))
			choices.push({anchor: current});
	} else if(current && point) {
		choices = regionAnchorsForPosition(current.center);
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
	var manualPoint, suggestions = [];
	function suggestedRegion() {
		return suggestions.find(function(choice) { return choice.region.key === select.value; });
	}
	select.onchange = setLimit;
	input.value = '';
	setLimit();
	function applyManualRegion(event) {
		if(cities) event.preventDefault();
		if(event && event.stopPropagation) event.stopPropagation();
		setLimit();
		if(input.disabled || !input.reportValidity()) return;
		var region = allWoloRegions().find(function(entry) { return entry.key === select.value; });
		var anchor = region && regionAnchor(region, Number(input.value));
		if(!anchor) return;
		if(cities) manual.close();
		var suggestion = suggestedRegion();
		useCityMenuRegion(anchor, mode, suggestion && suggestion.anchor.id === anchor.id ? manualPoint : null);
	}
	if(cities) {
		var hint = manual.querySelector('.city_region_manual_hint');
		var indexFields = manual.querySelector('.city_region_index_fields');
		var outOfRange = manual.querySelector('.city_region_out_of_range');
		var actions = manual.querySelector('.city_region_manual_actions');
		function suggestIndex() {
			setLimit();
			var suggestion = suggestedRegion();
			var outside = !!manualPoint && !suggestion;
			indexFields.hidden = outside;
			input.disabled = outside;
			actions.hidden = outside;
			outOfRange.textContent = outside ? 'The current location is out of range for the selected region.' : '';
			input.value = suggestion ? suggestion.anchor.id.split(':').pop() : '';
			hint.textContent = outside ? '' : suggestion ? 'Suggested index for the map pin' : 'Choose a region and enter its anchor index';
		}
		select.onchange = suggestIndex;
		panel.querySelector('.city_region_manual_open').onclick = function() {
			manualPoint = cityRegionMenuPosition();
			suggestions = regionAnchorsForPosition(manualPoint);
			var initial = suggestions.find(function(choice) {
				return current && choice.anchor.id === current.id;
			}) || suggestions[0];
			if(initial) select.value = initial.region.key;
			suggestIndex();
			manual.showModal();
		};
		manual.querySelector('.city_region_manual_close').onclick = function() {
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
