var upload_data_index = 0;
var upload_data_rows;

var upload_on = false;
var upload_completed_id = "in_tiruttangal";

function upload_data () {
	var file = document.getElementById('file_input').files[0];
	if(file != null) {
		var reader = new FileReader();
		reader.onload = function(e) {
			upload_data_rows = e.target.result.split("\n");
			while(!upload_on)
				upload_entry();
			upload_entry();
		}
		reader.readAsText(file);
	}
}

function upload_entry() {
	if (upload_data_index < upload_data_rows.length) {
		var cells = unquote(upload_data_rows[upload_data_index]).split('\",\"');
		if (cells.length > 1) {
			var gp_id = null;
			var lat = parseFloat(unquote(cells[3]));
			var lng = parseFloat(unquote(cells[4]));
			var name = unquote(cells[1]);
			var accent = unquote(cells[2]);
			if(accent.length == 0 || accent.localeCompare(name) == 0)
				accent = null;
			var administrative_level_3 = null;
			var administrative_level_2 = null;
			var administrative_level_1 = null;
			var country_iso = unquote(cells[0]);
			if(upload_on)
				submit_city(gp_id, lat, lng, name, accent, administrative_level_3, administrative_level_2, administrative_level_1, country_iso, upload_entry);
			else {
				if(upload_completed_id == country_iso+'_'+name)
					upload_on = true;
			}
		}
		upload_data_index++;
	}
	else
		console.log("Upload completed");
}
