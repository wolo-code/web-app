function upload_data () {
  var file = document.getElementById('file_input').files[0];
  if(file != null) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var rows = e.target.result.split("\n");
      for (var i = 1; i < rows.length; i++) {
        var cells = rows[i].split(",");
        if (cells.length > 1) {
          var lat = parseFloat(cells[3]);
          var lng = parseFloat(cells[4]);
          var country_iso = cells[0];
          var group = null;
          var name = unquote(cells[1]);
          var accent = unquote(cells[2]);
          submit_city(lat, lng, country_iso, group, name, accent);
        }
      }
    }
    reader.readAsText(file);
  }
}
