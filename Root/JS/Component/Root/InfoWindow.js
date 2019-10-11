function infoWindow_setContent(string) {
	if(typeof infoWindow == 'undefined')
		infoWindow = new google.maps.InfoWindow({'map': map});
	infoWindow.setContent(string);
}

function setInfoWindowText(city_accent, city_name, code_string, latLng) {
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + city_accent + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code_string + "</span> <span class='slash'>/</span></div></div><div id='infowindow_actions' class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src=" + svg_address + " ><a href='"+ getIntentURL(latLng, city_name + ' ' + code_string) + "'><img id='external_map_button' class='control' src=" + svg_map + " ></a><div id='share_code_button' class='control'><div class='shield'></div><img src=" + svg_share + " ></div></div>");
	var infoWindow_share_longpress_handle = google.maps.event.addListener(infoWindow, 'domready', function() {
		google.maps.event.removeListener(infoWindow_share_longpress_handle);	
		addLongpressListener(document.getElementById('share_code_button'));
	});
}

function isInfoWindowOpen() {
	var map = infoWindow.getMap();
	return (map !== null && typeof map !== "undefined");
}
