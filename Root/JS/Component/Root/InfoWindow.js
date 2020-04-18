function initInfoWindow() {
	if(typeof infoWindow == 'undefined')
		infoWindow = new google.maps.InfoWindow({'map': map});
}

function infoWindow_setContent(string) {
	initInfoWindow();
	infoWindow.setContent(string);
}

function setInfoWindowText(city_accent, city_name, code_string, latLng) {
	initInfoWindow();
	var infoWindow_share_longpress_handle = google.maps.event.addListener(infoWindow, 'domready', function() {
		google.maps.event.removeListener(infoWindow_share_longpress_handle);
		if(document.getElementById('share_code_button') != null)
			addLongpressListener(document.getElementById('share_code_button'));
	});
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'><span class='control' onclick='showChooseCity_by_periphery_Message();'>" + city_accent + "</span></span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code_string + "</span> <span class='slash'>/</span></div></div><div id='infowindow_actions' class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src=" + svg_address + " ><a href='"+ getIntentURL(latLng, city_name + ' ' + code_string) + "'><img id='external_map_button' class='control' src=" + svg_map + " ></a><div id='share_code_button' class='control'><div class='shield'></div><img src=" + svg_share + " ></div></div>");
	showInfoWindow();
}

function isInfoWindowOpen() {
	if(infoWindow) {
		var map = infoWindow.getMap();
		return (map !== null && typeof map !== "undefined");
	}
	else
		return false;
}

function showInfoWindow() {
	initInfoWindow();
	infoWindow.open(map, marker);
}
