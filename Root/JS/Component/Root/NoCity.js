var cityProposalInFlight = false;
var cityProposalLocation = null;
var cityProposalRequest = null;

function showCityProposal() {
	if(!cityProposalInFlight && !cityProposalRequest) {
		cityProposalLocation = regionPosition(typeof code_postition !== 'undefined' && code_postition) || regionPosition(typeof latLng_p !== 'undefined' && latLng_p);
		var include = document.getElementById('no_city_include_location');
		include.checked = !!cityProposalLocation;
		include.disabled = !cityProposalLocation;
		document.getElementById('no_city_location').textContent = cityProposalLocation ? cityProposalLocation.lat.toFixed(6) + ', ' + cityProposalLocation.lng.toFixed(6) : 'No map location selected';
		noCity_hideLoader();
	}
	showNoCityMessage();
}

function newCityProposal() {
	if(cityProposalInFlight) return;
	cityProposalRequest = null;
	document.getElementById('no_city_name').value = '';
	document.getElementById('no_city_country').value = '';
	showCityProposal();
}

function showNoCityMessage() {
	showOverlay(document.getElementById('no_city_message'));
}

function hideNoCityMessage() {
	hideOverlay(document.getElementById('no_city_message'));
}

function cityProposalEmailHref(requestId, data) {
	var link = document.getElementById('no_city_email_details');
	var recipient = (link.getAttribute('data-u') || 'support') + '@' + (link.getAttribute('data-d') || 'wolo.codes');
	var subject = 'Wolo add city request ' + requestId;
	var body = 'Request ID: ' + requestId + '\r\nCity: ' + data.city_name + '\r\nCountry / region: ' + (data.country || '') + '\r\n';
	if(data.lat_lng) body += 'Proposed location: ' + data.lat_lng.lat + ', ' + data.lat_lng.lng + '\r\n';
	if(data.address) body += 'Address: ' + data.address + '\r\n';
	body += '\r\nAdditional details (suggested center, local names, coverage, or supporting links):\r\n';
	return 'mailto:' + recipient + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
}

function openCityProposalDraft(href) {
	window.location.assign(href);
}

function noCity_add() {
	if(cityProposalInFlight) return;
	var name = document.getElementById('no_city_name');
	if(!name.reportValidity()) return;
	if(typeof isOfflineMode === 'function' && isOfflineMode()) {
		showNotification('Requesting a city needs an internet connection');
		return;
	}
	var cityName = name.value.trim();
	if(!cityName) { name.focus(); return; }
	var include = document.getElementById('no_city_include_location').checked;
	var data = {
		city_name: cityName,
		country: document.getElementById('no_city_country').value.trim(),
		lat_lng: include ? cityProposalLocation : null,
		gp_id: '', address: '', source: 'user-proposal'
	};
	var addressPosition = regionPosition(typeof latLng_p !== 'undefined' && latLng_p);
	if(data.lat_lng && addressPosition && data.lat_lng.lat === addressPosition.lat && data.lat_lng.lng === addressPosition.lng) {
		data.address = typeof address === 'string' ? address : '';
		data.gp_id = typeof gpId === 'string' ? gpId : '';
	}
	cityProposalInFlight = true;
	noCity_showLoader();
	// Acknowledge the exact write before announcing success or opening a draft.
	return Promise.resolve().then(function() { return submitCity(data); }).then(function(requestId) {
		cityProposalInFlight = false;
		cityProposalRequest = { id: requestId, data: data };
		document.getElementById('no_city_request_id').textContent = requestId;
		document.getElementById('no_city_request_status').textContent = 'Request submitted. Review may take some time. Add any supporting details in your email draft.';
		addClassIfPresent(document.getElementById('no_city_request_loader'), 'hide');
		var href = cityProposalEmailHref(requestId, data);
		document.getElementById('no_city_email_details').setAttribute('href', href);
		removeClassIfPresent(document.getElementById('no_city_request_details'), 'hide');
		removeClassIfPresent(document.getElementById('no_city_new_request'), 'hide');
		showNotification('City request submitted');
		try { openCityProposalDraft(href); }
		catch(error) { showNotification('Request saved. Use Add details by email to open your draft.'); }
		return requestId;
	}).catch(function() {
		cityProposalInFlight = false;
		noCity_hideLoader();
		showNotification('Could not submit the city request. Check your connection and try again.');
		return null;
	});
}

function noCity_showLoader() {
	addClassIfPresent(document.getElementById('no_city_message_prompt'), 'hide');
	removeClassIfPresent(document.getElementById('no_city_message_wait'), 'hide');
	removeClassIfPresent(document.getElementById('no_city_request_loader'), 'hide');
	addClassIfPresent(document.getElementById('no_city_request_details'), 'hide');
	addClassIfPresent(document.getElementById('no_city_new_request'), 'hide');
	document.getElementById('no_city_request_status').textContent = 'Submitting your city proposal…';
}

function noCity_hideLoader() {
	removeClassIfPresent(document.getElementById('no_city_message_prompt'), 'hide');
	addClassIfPresent(document.getElementById('no_city_message_wait'), 'hide');
}

function noCity_cancel() {
	hideNoCityMessage();
	removeClassIfPresent(document.getElementById('notification_top'), 'hide');
}

function noCityWait_continue() {
	hideNoCityMessage();
}

function noCityWait_stop() {
	hideNoCityMessage();
	removeClassIfPresent(document.getElementById('notification_top'), 'hide');
}
