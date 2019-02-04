function infoWindow_setContent(string) {
	if(typeof infoWindow == 'undefined')
		infoWindow = new google.maps.InfoWindow({'map': map});
	infoWindow.setContent(string);
}

function setInfoWindowText(city_name, code, latLng) {
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + city_name + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code.slice(1, code.length).join(' ') + "</span> <span class='slash'>/</span></div></div><div id='infowindow_actions' class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src=" + svg_address + " ><a href='"+ getIntentURL(latLng, code) + "'><img id='external_map_button' class='control' onclick='' src=" + svg_map + " ></a><img id='copy_code_button' class='control' onclick='showCopyWcodeMessage();' src=" + svg_copy + " ></div>")
}
