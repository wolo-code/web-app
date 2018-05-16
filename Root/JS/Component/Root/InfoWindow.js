function infoWindow_setContent(string) {
	if(typeof infoWindow == 'undefined')
		infoWindow = new google.maps.InfoWindow({'map': map});
	infoWindow.setContent(string);
}

function setInfoWindowText(code, latLng) {
	infoWindow_setContent("<div id='infowindow_code'><div id='infowindow_code_left'><span class='slash'>\\</span> <span class='infowindow_code' id='infowindow_code_left_code'>" + code[0] + "</span></div><div id='infowindow_code_right'>" + "<span class='infowindow_code' id='infowindow_code_right_code'>" + code.slice(1, code.length).join(' ') + "</span> <span class='slash'>/</span></div></div><div id='infowindow_actions' class='center'><img id='show_address_button' class='control' onclick='toggleAddress();' src=" + svg_address + " ><img id='copy_code_button' class='control' onclick='showCopyWcodeMessage();' src=" + svg_copy + " ><img id='copy_link_button' class='control' onclick='copyWcodeLink();' src=" + svg_link + " ><a href='"+ getIntentURL(latLng, code) + "'><img id='external_map_button' class='control' onclick='' src=" + svg_map + " ></a></div>")
}
