function focus__(pos, code) {
	focus_(pos);
	setWcode(code, pos);
}

function focus_(pos, bounds) {
	
	hideNoCityMessage();

	if(typeof marker === 'undefined') {
		marker = new google.maps.Marker({
			position: pos,
			map: map,
			title: 'Hello World!'
		});
		marker.addListener('click', function() {
			if(infoWindow_open == false) {
				infoWindow.open(map, marker);
				infoWindow_open = true;
			}
			else {
				infoWindow.close();
				infoWindow_open = false;
			}
		})
	}
	else {
		marker.setPosition(pos);
	}

	if(marker.getMap() == null)
		marker.setMap(map);

	if(typeof bounds !== 'undefined') {
		map.fitBounds(bounds, 26);
	}
	else if (typeof accuCircle !== 'undefined') {
		accuCircle.setOptions({'fillOpacity': 0.10});
	}
	
	map.panTo(pos);
	map.panBy(0, getPanByOffset());
	infoWindow_setContent(MESSAGE_LOADING);
	infoWindow.open(map, marker);
	infoWindow_open = true;

}
