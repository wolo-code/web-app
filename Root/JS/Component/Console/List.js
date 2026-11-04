function nextRow() {
	if(data_index+1 < data.length) {
		data_index++;
		updateList();
	}
}

function deleteRow() {
}

function previousRow() {
	if(data_index == 0) {
		if(data.length > 0) {
			data_index = data.length-1;
			updateList();
		}
	}
	else {
		data_index--;
		updateList();
	}
}

function setTargetIndex() {
	var param = window.location.hash.substr(1);
	if(param.length > 0)
		target_id = param;
}

function updateList() {
	clearForm();
	if(data.length > 0) {
		view_data_index.innerText = data_index+1;
		var entry = data[data_index];
		data_gp_id.innerText = entry.gp_id;
		data_lat.innerText = entry.lat_lng ? entry.lat_lng.lat : 'Not supplied';
		data_lng.innerText = entry.lat_lng ? entry.lat_lng.lng : 'Not supplied';
		setAddress(entry.address || [entry.city_name, entry.country].filter(Boolean).join(', '), entry.gp_id || '');
		data_time.innerText = formatDate(new Date(entry.time));
		location_request_list.classList.remove('invisible');
		if(entry.lat_lng) syncMarkEntry(entry.lat_lng);
		else if(typeof entryMarker !== 'undefined' && entryMarker) entryMarker.setMap(null);
		city_name.value = entry.city_name || '';
		city_country.value = entry.country || '';
	}
	else {
		location_request_list.classList.add('invisible');
		clearAddress();
	}
}
