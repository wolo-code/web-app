var data
// var data_index;
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
	var ref = database.ref('CityRequest/'+key);
	var updates = {};
	updates['processed'] = 'true';
	ref.update(updates);
}

function submit_city(gp_id, lat, lng, name, accent, administrative_level_3, administrative_level_2, administrative_level_1, country, callback) {
	var refCityDetail = database.ref('CityDetail').push();
	refCityDetail.set({
		'gp_id': gp_id,
		'name_id': name.toLocaleLowerCase(),
		'name': name,
		'accent': accent,
		'administrative_level_3': administrative_level_3,
		'administrative_level_2': administrative_level_2,
		'administrative_level_1': administrative_level_1,
		'country': country
	});
	geoFireInit();
	geoFire.set(refCityDetail.key, [lat, lng]).then( function() {
			if(typeof callback == 'function')
				callback();
		}, function(err) {
			console.log("Error: " + err);
		}
	);
}
