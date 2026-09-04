'use strict';

function plainCityCenter(center) {
	if (!center) {
		return null;
	}
	var lat = typeof center.lat === 'function' ? center.lat() : center.lat;
	var lng = typeof center.lng === 'function' ? center.lng() : center.lng;
	if (lat == null || lng == null || !isFinite(Number(lat)) || !isFinite(Number(lng))) {
		return null;
	}
	return { lat: Number(lat), lng: Number(lng) };
}

function sanitizeCityDetail(city) {
	if (!city) {
		return null;
	}
	var payload = {
		name: city.name || null,
		name_id: city.name_id || null,
		accent: city.accent || null,
		country: city.country || null,
		administrative_level_1: city.administrative_level_1 || null,
		administrative_level_2: city.administrative_level_2 || null,
		locality: city.locality || null,
		gp_id: city.gp_id || null
	};
	if (city.name_id == null && city.name) {
		payload.name_id = String(city.name).toLowerCase();
	}
	return payload;
}

function cityMatchesNameId(city, name_id) {
	if (!city || name_id == null || name_id === '') {
		return false;
	}
	var needle = String(name_id).toLowerCase();
	var candidate = city.name_id != null ? city.name_id : city.name;
	return candidate != null && String(candidate).toLowerCase() === needle;
}

function buildRememberPayload(city) {
	if (!city || !city.id) {
		return null;
	}
	var detail = sanitizeCityDetail(city);
	var center = plainCityCenter(city.center);
	return {
		id: city.id,
		detail: detail,
		center: center
	};
}

module.exports = {
	plainCityCenter,
	sanitizeCityDetail,
	cityMatchesNameId,
	buildRememberPayload
};
