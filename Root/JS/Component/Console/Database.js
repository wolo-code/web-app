var data
var data_index = 0;
var idLoader;
var prev_entry;

function queryPendingList() {
	beginLoader();
	var ref = firebase.database().ref('CityRequest');
	var list = ref.orderByChild("processed").equalTo(false).on("value", function(snapshot) {
		if(data != null)
			prev_entry = data[data_index];
		data = [];
		snapshot.forEach(function(child) {
			var entry = child.val();
			entry['id'] = child.key;
			data.push(entry);
		});
		data_count.innerText = data.length;
		clearTimeout(idLoader);
		endLoader('authenticated');
		if(prev_entry == null || JSON.stringify(prev_entry) != JSON.stringify(data[data_index])) {
				data_index = 0;
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
