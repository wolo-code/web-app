var data
var data_index = 0;
var idLoader;
var prev_entry;

function queryPendingList() {
	beginLoader();
	var list = database.ref('CityRequest').orderByChild('processed').equalTo(false).on('value', function(snapshot) {
		if(data != null)
			prev_entry = data[data_index];
		data = [];
		var target_index;
		snapshot.forEach(function(child) {
			var entry = child.val();
			entry['id'] = child.key;
			data.push(entry);
			if(target_index == null && target_id != null)
				if(child.key == target_id)
					target_index = data.length-1;
		});
		data_count.innerText = data.length;
		if(idLoader != null)
			endLoader('authenticated');
		else if(idLoader == -1)
			showConsoleBlock();
		if(prev_entry == null || data_index >= data.length || JSON.stringify(prev_entry) != JSON.stringify(data[data_index])) {
			if(target_id == null)
				data_index = 0;
			else {
				if(target_index == null) {
					data_index = 0;
					showNotification("Target already processed");
				}
				else
					data_index = target_index;
				target_id = null;
			}
			updateList();
		}
	})
}

function process_entry(key) {
	var ref = firebase.database().ref('CityRequest/'+key);
	var updates = {};
	updates['processed'] = 'true';
	ref.update(updates);
}

function submit_city(lat, lng, country, group, name) {
	var cityList;
	var ref = firebase.database().ref('CityList');
	ref.once('value', function(snapshot) {
		cityList = snapshot.val();
		var data = {
			"center": {'lat':lat, 'lng':lng},
			"country": country,
			"group": group,
			"name": name
		};
		cityList[Object.keys(cityList).length] = data;
		ref.set(cityList);
	});
	showNotification("Request submitted");
	clearForm();
}
