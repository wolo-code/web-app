// var latLng_p;
// var address;
// var gpId;

function getAddress(latLng, session_id, callback) {
	var geocoder = new google.maps.Geocoder;
	geocoder.geocode({'location': latLng}, function(address_components, status) {
		latLng_p = latLng;
		code_plus_code = extractPlusCodeFromGeocode(address_components) || getPlusCodeForPosition(latLng);
		if (status === 'OK') {
			if (address_components[0]) {
				getCity_by_address_list(address_components);
				address = address_components[0].formatted_address;
				gpId = getCityGpId(address_components);
				if(typeof code_city != 'undefined' && code_city.gp_id != null && gpId != code_city.gp_id) {
					setCurrentCity_status(false);
				}
				else {
					setCurrentCity_status(true);
				}
				if(!current_title)
					refreshAddress();
				if(typeof callback != 'undefined') {
					sessionForwarder(session_id, callback, [address_components]);
				}
			} else {
				console.log('No geoCoding results found');
			}
		} else {
			if(status == 'ZERO_RESULTS')
				noCity(latLng_p);
			else
				console.log('Geocoder failed due to: ' + status);
		}
		if(pendingCitySubmit) {
			execSubmitCity();
			pendingCitySubmit = false;
		}
		if(keepAddressPanelOpen) {
			showAddress();
		}
	});
}

function toggleAddress() {
	if(address_text.classList.value == 'hide')
		showAddress();
	else
		hideAddress();
}

function showAddress() {
	document.getElementById('address_text_title').innerText = '';
	document.getElementById('address_text_segment').innerText = '';
	address_text_content.innerText = address || '';
	refreshAddressCodes();
	address_text.classList.remove('hide');
}

function hideAddress() {
	keepAddressPanelOpen = false;
	address_text_content.innerText = '';
	clearAddressCodeRows();
	address_text.classList.add('hide');
}

function clearAddress() {
	address = null;
	gpId = null;
	code_plus_code = null;
	address_text_content.innerText = '';
	clearAddressCodeRows();
}

function refreshAddress() {
	address_text_content.innerText = address;
	external_address.innerText = address;
	refreshAddressCodes();
}

function refreshAddressCodes() {
	var digipinCode = (typeof getDigipinForPosition == 'function' && latLng_p) ? getDigipinForPosition(latLng_p) : (typeof code_digipin != 'undefined' ? code_digipin : null);
	if(typeof code_digipin != 'undefined') {
		code_digipin = digipinCode;
	}
	var plusCode = code_plus_code || (typeof getPlusCodeForPosition == 'function' ? getPlusCodeForPosition(latLng_p) : null);
	if(typeof code_plus_code != 'undefined') {
		code_plus_code = plusCode;
	}
	var codes = document.getElementById('address_text_codes');
	var digipinRow = document.getElementById('address_text_digipin_row');
	var plusRow = document.getElementById('address_text_plus_row');
	var digipinNode = document.getElementById('address_text_digipin');
	var plusNode = document.getElementById('address_text_plus');
	if(!codes || !digipinRow || !plusRow) {
		return;
	}
	if(digipinCode) {
		digipinNode.innerText = String(digipinCode).toUpperCase();
		digipinRow.classList.remove('hide');
	}
	else {
		digipinNode.innerText = '';
		digipinRow.classList.add('hide');
	}
	if(plusCode) {
		plusNode.innerText = plusCode;
		plusRow.classList.remove('hide');
	}
	else {
		plusNode.innerText = '';
		plusRow.classList.add('hide');
	}
	if(digipinCode || plusCode) {
		codes.classList.remove('hide');
	}
	else {
		codes.classList.add('hide');
	}
}

function clearAddressCodeRows() {
	var codes = document.getElementById('address_text_codes');
	var digipinRow = document.getElementById('address_text_digipin_row');
	var plusRow = document.getElementById('address_text_plus_row');
	var digipinNode = document.getElementById('address_text_digipin');
	var plusNode = document.getElementById('address_text_plus');
	if(digipinNode) {
		digipinNode.innerText = '';
	}
	if(plusNode) {
		plusNode.innerText = '';
	}
	if(digipinRow) {
		digipinRow.classList.add('hide');
	}
	if(plusRow) {
		plusRow.classList.add('hide');
	}
	if(codes) {
		codes.classList.add('hide');
	}
}

function getAddressPanelSelection() {
	var panel = document.getElementById('address_text');
	var sel = window.getSelection();
	var node;
	var range;
	var text;
	if(!panel || !sel || sel.isCollapsed || !sel.rangeCount) {
		return '';
	}
	node = sel.anchorNode;
	if(node && node.nodeType !== 1) {
		node = node.parentNode;
	}
	if(!node || !panel.contains(node)) {
		return '';
	}
	range = sel.getRangeAt(0);
	text = range ? range.toString() : sel.toString();
	return text;
}

function copyAddressPanelSelection() {
	var text = getAddressPanelSelection();
	if(!text || !text.trim()) {
		return false;
	}
	copyPlainText(text);
	showNotification(SELECTED_TEXT_COPIED_MESSAGE);
	return true;
}

function copyAddress(event) {
	if(copyAddressPanelSelection()) {
		if(event && event.stopPropagation) {
			event.stopPropagation();
		}
		return;
	}
	if(address_text.classList.contains('hide')) {
		showAddress();
	}
	copyNodeText(address_text_content);
	showNotification(ADDRESS_COPIED_MESSAGE);
}

function copyPlusCode(event) {
	if(event && event.stopPropagation) {
		event.stopPropagation();
	}
	if(copyAddressPanelSelection()) {
		return;
	}
	if(!code_plus_code) {
		return;
	}
	showAndCopy(code_plus_code);
	showNotification(PLUS_CODE_COPIED_MESSAGE);
}
