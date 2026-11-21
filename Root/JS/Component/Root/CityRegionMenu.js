function cityRegionMenuPosition() {
	return regionPosition(typeof code_postition !== 'undefined' && code_postition) || regionPosition(typeof latLng_p !== 'undefined' && latLng_p);
}

function closeCityRegionMenu(mode) {
	if(mode === 'nearby') hideChooseCity_by_periphery_Message();
	else if(mode === 'matching') hideChooseCityMessage();
	else hideDecodeCityHistoryMessage();
}

function useCityMenuRegion(anchor, mode, point) {
	closeCityRegionMenu(mode);
	if(!isDecodeView())
		encode_(anchor, point);
	else
		setDecodeCity(anchor, 'history', true);
}

function enterCityMenuRegion(region, mode, codeWords) {
	var input = document.getElementById('decode_input');
	var existing = input.value.toLowerCase().match(/[a-z]+/g) || [];
	var words = codeWords || existing.slice(-3);
	if(words.length !== 3 || typeof wordList === 'undefined' || !words.every(function(word) { return wordList.includes(word); }))
		words = [];
	closeCityRegionMenu(mode);
	if(mode === 'matching' && codeWords) popLoader();
	if(!isDecodeView()) toggleDecodeView();
	var prefix = region.name + ' ';
	input.value = prefix + (words.length ? ' ' + words.join(' ') : '');
	input.focus();
	input.setSelectionRange(prefix.length, prefix.length);
	input.dispatchEvent(new Event('input', {bubbles: true}));
	showNotification('Enter the anchor index after the region name.');
}

function useCityMenuSearchCity(city, mode) {
	var expectedDialog = getVisibleOverlayDialog();
	if(!expectedDialog) return;
	var point = mode === 'nearby' && cityRegionMenuPosition();
	var selection = expectedDialog.citySearchSelection = Symbol();
	var session = typeof encode_session_id !== 'undefined' && encode_session_id;
	getCityCenterFromId(city, function(resolved) {
		if(getVisibleOverlayDialog() !== expectedDialog || expectedDialog.citySearchSelection !== selection ||
			(mode === 'nearby' && session !== encode_session_id))
			return;
		if(!resolved || !resolved.center) {
			showNotification('Could not load that city. Choose it again to retry.');
			return;
		}
		closeCityRegionMenu(mode);
		if(mode === 'matching')
			chooseCityCallback(resolved);
		else if(point && cityCoversPosition(resolved, point))
			encode_continue(resolved, point);
		else {
			setDecodeCity(resolved, 'history', true);
			focusSelectedDecodeCityOnMap(resolved);
		}
	});
}

function renderCityRegionMenu(id, mode) {
	var picker = document.getElementById(id + '_region_menu');
	if(!picker) return;
	var tabs = picker.querySelector('.city_region_tabs');
	var selectTab = tabs.selectCityRegionTab || (tabs.selectCityRegionTab = bindCityRegionTabs(tabs));
	var cityPanel = document.getElementById(id + '_city_panel');
	var regionPanel = document.getElementById(id + '_region_panel');
	var decodeView = isDecodeView();
	var current = mode === 'history' && decodeView ? selected_decode_city :
		mode !== 'matching' && typeof code_city !== 'undefined' && code_city;
	var currentRegion = isRegionAnchor(current) && regionAnchorFromId(current.id);
	var point = mode === 'matching' || decodeView ? null : cityRegionMenuPosition();
	var suggested = regionAnchorsForPosition(point);
	var anchorByRegion = new Map(suggested.map(function(choice) { return [choice.region.key, choice.anchor]; }));
	var list = regionPanel.querySelector('.city_region_defaults .city_region_list');
	var history = mode === 'history' ? getDecodeCityHistory() : [];
	var matchingWords = mode === 'matching' ? chooseCityCodeWords : null;
	picker.closest('.choose_city_message').citySearchSelection = null;

	function addRegionButton(target, region, anchor) {
		var button = document.createElement('button');
		button.type = 'button';
		button.className = 'city_region_option';
		if(anchor) {
			button.innerHTML = getRegionReferenceHTML(anchor);
			if(currentRegion && currentRegion.id === anchor.id)
				button.setAttribute('aria-current', 'true');
		} else {
			button.textContent = region.name;
		}
		button.addEventListener('click', function() {
			if(anchor && currentRegion && anchor.id === currentRegion.id) closeCityRegionMenu(mode);
			else if(anchor) useCityMenuRegion(anchor, mode, point);
			else enterCityMenuRegion(region, mode, matchingWords);
		});
		target.appendChild(button);
	}

	list.textContent = '';
	if(currentRegion && !suggested.some(function(choice) { return choice.anchor.id === currentRegion.id; }) &&
		!history.some(function(entry) { return entry.id === currentRegion.id; }))
		addRegionButton(list, null, currentRegion);
	suggested.forEach(function(choice) {
		if(!history.some(function(entry) { return entry.id === choice.anchor.id; }))
			addRegionButton(list, choice.region, choice.anchor);
	});
	var hasCityChoices = !!cityPanel.querySelector('.choose_city_message_list').children.length;
	selectTab(tabs.querySelector(currentRegion || (!hasCityChoices && mode === 'nearby') ? 'button:last-child' : 'button:first-child'));

	var regions = allWoloRegions().slice().sort(function(a, b) { return a.name.localeCompare(b.name); });
	bindCityRegionSearch(cityPanel, 'cities', function(query, results, report) {
		getCitiesFromNameId(normalizeCityLookupToken(query.normalize('NFD').replace(/[\u0300-\u036f]/g, '')), function(matches, error) {
			report(function() {
				var choices = Object.entries(matches || {}).map(function(entry) {
					var city = Object.assign({}, entry[1], {id: entry[0]});
					return {
						city: city,
						status: current && (current.id === city.id || current.gp_id && current.gp_id === city.gp_id) ? 'Current' : undefined,
						select: function() { useCityMenuSearchCity(city, mode); }
					};
				});
				renderCityChoices(results, choices);
				return error ? 'City search is unavailable. Try again.' : choices.length ? '' : 'No matching cities.';
			});
		}, {picker: true});
	});
	bindCityRegionSearch(regionPanel, 'regions', function(query, results, report) {
		var needle = normalizeRegionName(query);
		var matches = regions.filter(function(region) {
			return needle && [region.name].concat(region.aliases).some(function(name) {
				return normalizeRegionName(name).includes(needle);
			});
		});
		matches.sort(function(a, b) {
			return Number(normalizeRegionName(b.name).startsWith(needle)) - Number(normalizeRegionName(a.name).startsWith(needle));
		});
		matches.slice(0, 12).forEach(function(region) {
			addRegionButton(results, region, anchorByRegion.get(region.key));
		});
		report(function() { return matches.length ? '' : 'No matching regions or countries.'; });
	});
}

function bindCityRegionSearch(panel, kind, search) {
	var input = panel.querySelector('.city_region_search');
	var defaults = panel.querySelector('.city_region_defaults');
	var results = panel.querySelector('.city_region_search_results');
	var status = panel.querySelector('.city_region_search_status');
	var timer;
	input.value = '';
	input.oninput = function updateSearch() {
		clearTimeout(timer);
		var query = input.value.trim();
		var request = input.searchRequest = Symbol();
		defaults.hidden = !!query;
		results.textContent = '';
		status.textContent = query && kind === 'cities' ? 'Searching cities…' : '';
		if(!query) return;
		function report(render) {
			if(input.searchRequest === request)
				status.textContent = render();
		}
		if(kind === 'cities')
			timer = setTimeout(function() {
				if(input.searchRequest === request) search(query, results, report);
			}, 200);
		else
			search(query, results, report);
	};
	input.oninput();
	input.onkeydown = function(event) {
		if(event.key !== 'Enter' || event.isComposing) return;
		event.preventDefault();
		var first = results.querySelector('button');
		if(first) first.click();
	};
}
