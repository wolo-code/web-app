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
		if(document.getElementById('share_qr_button') != null)
			addLongpressListener(document.getElementById('share_qr_button'), showQR, downloadQR_minimal);
	});
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'><span class='control' onclick='showChooseCity_by_periphery_Message();'>" + city_accent + "</span></span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code_string + "</span> <span class='slash'>/</span></div></div><div id='infowindow_actions' class='center'><img id='show_address_button' class='control' src=" + svg_address + " ><a href='"+ getIntentURL(latLng, city_name + ' ' + code_string) + "'><img id='external_launch_button' class='control' src=" + svg_launch + " ></a><div id='share_qr_button' class='control'><div class='shield'></div><img src=" + svg_label + " ></div></div>");
	addLongpressListener(document.getElementById('show_address_button'), toggleAddress, handleShareWCode);
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
