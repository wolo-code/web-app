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
	if(data.length > 0) {
		view_data_index.innerText = data_index+1;
		var entry = data[data_index];
		data_gp_id.innerText = entry.gp_id;
		data_lat.innerText = entry.lat_lng.lat
		data_lng.innerText = entry.lat_lng.lng;
		setAddress(entry.address, entry.gp_id);
		data_time.innerText = formatDate(new Date(entry.time));
		location_request_list.classList.remove('invisible');
		map.panTo(entry.lat_lng);
		showEntryMarker(entry.lat_lng);
	}
	else {
		location_request_list.classList.add('invisible');
		clearAddress();
	}
	clearForm();
}
