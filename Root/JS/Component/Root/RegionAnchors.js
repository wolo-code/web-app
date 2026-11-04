// Regions select existing Wolo grids; the three-word packing stays unchanged.
function normalizeRegionName(name) {
	return String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9 _-]/g, ' ').replace(/[-_\s]+/g, ' ').trim();
}

function allWoloRegions() {
	return WOLO_REGION_REGISTRY.regions.concat(typeof WOLO_COUNTRY_REGISTRY === 'object' ? WOLO_COUNTRY_REGISTRY.regions : []);
}

function regionByName(name) {
	var needle = normalizeRegionName(name);
	return allWoloRegions().find(function(region) {
		return normalizeRegionName(region.name) === needle || region.aliases.some(function(alias) { return normalizeRegionName(alias) === needle; });
	}) || null;
}

function regionCellAtIndex(region, index) {
	if(!Number.isSafeInteger(index) || index < 1 || index > region.count) return null;
	var offset = index - 1;
	for(var i = 0; i < region.ranges.length; i++) {
		var range = region.ranges[i];
		if(offset < range[1]) return range[0] + offset;
		offset -= range[1];
	}
	return null;
}

function regionIndexForCell(region, cell) {
	var offset = 0;
	for(var i = 0; i < region.ranges.length; i++) {
		var range = region.ranges[i];
		if(cell < range[0]) return null;
		if(cell < range[0] + range[1]) return offset + cell - range[0] + 1;
		offset += range[1];
	}
	return null;
}

function regionAnchor(region, index) {
	var cell = regionCellAtIndex(region, index);
	if(cell === null) return null;
	return {
		id: 'region:v1:' + region.key + ':' + index,
		name: region.name + ' ' + index,
		name_id: (region.country_code ? normalizeRegionName(region.name) : region.name.toLowerCase()) + ' ' + index,
		country: '',
		center: { lat: Math.floor(cell / 720) / 2 - 89.75, lng: (cell % 720) / 2 - 179.75 }
	};
}

function regionAnchorFromId(id) {
	var match = /^region:v1:([a-z0-9-]+):([1-9][0-9]*)$/.exec(String(id || ''));
	if(!match) return null;
	var region = allWoloRegions().find(function(entry) { return entry.key === match[1]; });
	return region ? regionAnchor(region, Number(match[2])) : null;
}

function regionAnchorFromName(name) {
	var match = /^(.*?)\s+([1-9][0-9]*)$/.exec(String(name || '').trim());
	if(!match) return null;
	var region = regionByName(match[1]);
	return region ? regionAnchor(region, Number(match[2])) : null;
}

function regionPosition(position) {
	if(!position) return null;
	var lat = typeof position.lat === 'function' ? position.lat() : position.lat;
	var lng = typeof position.lng === 'function' ? position.lng() : position.lng;
	if(typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
	return { lat: lat, lng: Math.abs(lat) === 90 ? 0 : wrapRegionLongitude(lng) };
}

function wrapRegionLongitude(lng) {
	return ((lng + 180) % 360 + 360) % 360 - 180;
}

function regionAnchorsForPosition(position) {
	var point = regionPosition(position);
	if(!point) return [];
	var row = Math.min(359, Math.floor((point.lat + 90) * 2));
	var cell = row * 720 + Math.floor((point.lng + 180) * 2);
	return allWoloRegions().map(function(region) {
		var index = regionIndexForCell(region, cell);
		return index === null ? null : { region: region, anchor: regionAnchor(region, index) };
	}).filter(Boolean).sort(function(a, b) {
		return Number(a.region.fallback) - Number(b.region.fallback) || a.region.count - b.region.count || a.region.key.localeCompare(b.region.key);
	});
}

function isRegionAnchor(city) {
	return !!(city && /^region:/.test(city.id || ''));
}

function getWoloAnchorBegin(city) {
	if(!isRegionAnchor(city)) return city && getCityBegin(city.center);
	var anchor = regionAnchorFromId(city.id);
	if(!anchor) return null;
	// Reflect southern latitude, keeping the inherited latitude-based scale
	// calculation away from an origin beyond the South Pole. All regions that
	// share a global tile use this same origin and orientation.
	var lat = Math.abs(anchor.center.lat);
	var beginLat = lat - lat_span_half(lat) * N;
	return { lat: beginLat, lng: anchor.center.lng - lng_span_half(beginLat) * N };
}

function regionGridPosition(city, position) {
	var point = regionPosition(position);
	var anchor = regionAnchorFromId(city.id);
	if(!point || !anchor) return null;
	if(Math.abs(point.lat) === 90) point.lng = anchor.center.lng;
	return { lat: anchor.center.lat < 0 ? -point.lat : point.lat,
		lng: anchor.center.lng + wrapRegionLongitude(point.lng - anchor.center.lng) };
}

function positionFromRegionGrid(city, position) {
	var anchor = regionAnchorFromId(city.id);
	if(!anchor || !position || Math.abs(position.lat) > 90.00002) return null;
	return { lat: (anchor.center.lat < 0 ? -1 : 1) * Math.max(-90, Math.min(90, position.lat)), lng: wrapRegionLongitude(position.lng) };
}

function encodeRegionFallback(position) {
	var choices = regionAnchorsForPosition(position);
	if(!choices.length) return false;
	// Reuse a deliberately chosen region while it still contains this tile.
	var preferred = typeof selected_decode_city !== 'undefined' && selected_decode_city;
	var preferredKey = preferred && /^region:v1:([^:]+):/.exec(preferred.id || '');
	var choice = preferredKey && choices.find(function(entry) { return entry.region.key === preferredKey[1]; });
	encode_((choice || choices[0]).anchor, regionPosition(position));
	return true;
}

function syncRegionChoices() {
	var select = document.getElementById('address_region_select');
	if(!select) return;
	var point = typeof code_postition !== 'undefined' && code_postition;
	var current = typeof code_city !== 'undefined' && isRegionAnchor(code_city) && regionAnchorFromId(code_city.id);
	// Decoding can round a boundary point a metre into the neighbouring tile.
	// Alternative prefixes must still identify the original anchor, not silently
	// switch grids because of that rounding.
	var choices = regionAnchorsForPosition(current ? current.center : point);
	select.textContent = '';
	if(typeof code_city !== 'undefined' && code_city && !isRegionAnchor(code_city)) {
		var cityOption = document.createElement('option');
		cityOption.value = code_city.id;
		cityOption.textContent = code_city.name;
		select.appendChild(cityOption);
	}
	choices.forEach(function(choice) {
		var option = document.createElement('option');
		option.value = choice.anchor.id;
		option.textContent = choice.anchor.name;
		select.appendChild(option);
	});
	if(typeof code_city !== 'undefined' && code_city) select.value = code_city.id;
	select.disabled = !choices.length;
}

function chooseAddressRegion() {
	var select = document.getElementById('address_region_select');
	var anchor = select && regionAnchorFromId(select.value);
	if(anchor && typeof code_postition !== 'undefined' && code_postition) {
		encode_(anchor, code_postition);
		showAddress();
	}
}
