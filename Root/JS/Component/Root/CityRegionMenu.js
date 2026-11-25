var cityRegionCityCache = new Map();
var cityRegionCityRequests = new Map();
var cityRegionSearchIndex;

function lookupCityRegionCities(query, render, defer) {
	var needle = normalizeCityLookupToken(query.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
	if(!needle) {
		render(null);
		return;
	}
	var offline = isOfflineMode();
	var scope = offline ? 'offline:' : 'online:';
	var key = scope + needle;
	var now = Date.now();
	var exact = cityRegionCityCache.get(key);
	if(exact && exact.expires > now) {
		render(exact.matches);
		return;
	}
	// A shorter query can answer this one only if its result set was complete.
	for(var length = needle.length - 1; length > 0; length--) {
		var cached = cityRegionCityCache.get(scope + needle.slice(0, length));
		if(cached && cached.expires > now && cached.complete) {
			render(Object.fromEntries(Object.entries(cached.matches).filter(function(entry) {
				return normalizeCityLookupToken(entry[1].name_id || entry[1].name).startsWith(needle);
			})));
			return;
		}
	}

	defer(function() {
		var pending = cityRegionCityRequests.get(key);
		if(pending) {
			pending.push(render);
			return;
		}
		cityRegionCityRequests.set(key, [render]);
		getCitiesFromNameId(needle, function(matches, error) {
			var callbacks = cityRegionCityRequests.get(key);
			cityRegionCityRequests.delete(key);
			if(!error && isOfflineMode() === offline) {
				matches = matches || {};
				var count = Object.keys(matches).length;
				cityRegionCityCache.delete(key);
				cityRegionCityCache.set(key, {
					matches: matches,
					complete: count < 10,
					expires: Date.now() + (!offline && count ? 300000 : 30000)
				});
				if(cityRegionCityCache.size > 64)
					cityRegionCityCache.delete(cityRegionCityCache.keys().next().value);
			}
			callbacks.forEach(function(callback) { callback(matches, error); });
		}, {picker: true});
	});
}

function searchCityRegionNames(query) {
	var needle = normalizeRegionName(query);
	if(!needle) return [];
	if(!cityRegionSearchIndex) {
		cityRegionSearchIndex = allWoloRegions().slice().sort(function(a, b) {
			return a.name.localeCompare(b.name);
		}).map(function(region) {
			return {region: region, names: [region.name].concat(region.aliases).map(normalizeRegionName)};
		});
	}
	var starts = [], other = [];
	for(var entry of cityRegionSearchIndex) {
		if(entry.names[0].startsWith(needle)) {
			starts.push(entry.region);
			if(starts.length === 12) break;
		} else if(other.length < 12 && entry.names.some(function(name) { return name.includes(needle); })) {
			other.push(entry.region);
		}
	}
	return starts.concat(other).slice(0, 12);
}

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
	if(mode === 'history') {
		setDecodeCity(anchor, 'history', true);
		focusSelectedDecodeCityOnMap(anchor);
	} else if(!isDecodeView())
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
	var current = mode === 'history' ? (selected_decode_city || (typeof code_city !== 'undefined' && code_city)) :
		((typeof code_city !== 'undefined' && code_city) || selected_decode_city);
	var currentRegion = isRegionAnchor(current) && regionAnchorFromId(current.id);
	var point = mode === 'matching' || decodeView ? null : cityRegionMenuPosition();
	var suggested = regionAnchorsForPosition(point);
	var history = mode === 'history' ? getDecodeCityHistory() : [];
	var anchorByRegion = new Map();
	history.forEach(function(entry) {
		var anchor = isRegionAnchor(entry) && regionAnchorFromId(entry.id);
		if(anchor) {
			var key = anchor.id.split(':')[2];
			anchorByRegion.set(key, anchor);
		}
	});
	if(currentRegion) {
		var currentKey = currentRegion.id.split(':')[2];
		anchorByRegion.set(currentKey, currentRegion);
	}
	suggested.forEach(function(choice) {
		anchorByRegion.set(choice.region.key, choice.anchor);
	});
	var list = regionPanel.querySelector('.city_region_defaults .city_region_list');
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

	bindCityRegionSearch(cityPanel, function(query, results, report, defer) {
		lookupCityRegionCities(query, function(matches, error) {
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
		}, defer);
	});
	bindCityRegionSearch(regionPanel, function(query, results, report) {
		report(function() {
			var matches = searchCityRegionNames(query);
			matches.forEach(function(region) {
				addRegionButton(results, region, anchorByRegion.get(region.key));
			});
			return matches.length ? '' : 'No matching regions or countries.';
		});
	});
}

function bindCityRegionSearch(panel, search) {
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
		status.textContent = '';
		if(!query) return;
		function report(render) {
			if(input.searchRequest === request)
				status.textContent = render();
		}
		search(query, results, report, function(load) {
			status.textContent = 'Searching cities…';
			timer = setTimeout(function() {
				if(input.searchRequest === request) load();
			}, 200);
		});
	};
	input.oninput();
	input.onkeydown = function(event) {
		if(event.key !== 'Enter' || event.isComposing) return;
		event.preventDefault();
		var first = results.querySelector('button');
		if(first) first.click();
	};
}
