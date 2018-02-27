var data
var data_index;
var idLoader;

function queryPendingList() {
	beginLoader();
	var ref = firebase.database().ref('CityRequest');
	var list = ref.orderByChild("processed").equalTo(false).on("value", function(snapshot) {
		data = [];
		data_index = 0;		
		snapshot.forEach(function(child) {
			var x = child.val();
			x['id'] = child.key;
			data.push(x);
		});
		data_count.innerText = data.length;
		clearTimeout(idLoader);
		endLoader('authenticated');
		updateList();
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
