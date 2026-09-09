var MAP_LAYER_ROADMAP = 'roadmap';
var MAP_LAYER_SATELLITE = 'satellite';
var MAP_LAYER_OSM = 'osm';
var OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
var osmMapTypeInitialized = false;

function initOsmMapType() {
	if(osmMapTypeInitialized || typeof map !== 'object' || !map || typeof google === 'undefined') {
		return;
	}

	map.mapTypes.set(MAP_LAYER_OSM, new google.maps.ImageMapType({
		getTileUrl: function(coord, zoom) {
			return OSM_TILE_URL
				.replace('{z}', String(zoom))
				.replace('{x}', String(coord.x))
				.replace('{y}', String(coord.y));
		},
		tileSize: new google.maps.Size(256, 256),
		name: 'OpenStreetMap',
		maxZoom: 19,
		alt: 'OpenStreetMap'
	}));
	osmMapTypeInitialized = true;
}

function getCurrentMapLayer() {
	if(document.body.classList.contains('osm')) {
		return MAP_LAYER_OSM;
	}
	if(document.body.classList.contains('satellite')) {
		return MAP_LAYER_SATELLITE;
	}
	if(document.body.classList.contains('map')) {
		return MAP_LAYER_ROADMAP;
	}
	return null;
}

function syncOsmAttribution() {
	var attribution = document.getElementById('osm_attribution');
	if(!attribution) {
		return;
	}
	if(getCurrentMapLayer() === MAP_LAYER_OSM) {
		attribution.classList.remove('hide');
	}
	else {
		attribution.classList.add('hide');
	}
}

function setMapLayer(layer) {
	initOsmMapType();
	document.body.classList.remove('map', 'satellite', 'osm');

	if(layer === MAP_LAYER_SATELLITE) {
		document.body.classList.add('satellite');
		map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
	}
	else if(layer === MAP_LAYER_OSM) {
		document.body.classList.add('osm');
		map.setMapTypeId(MAP_LAYER_OSM);
	}
	else {
		document.body.classList.add('map');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
	}

	syncOsmAttribution();
	if(typeof syncAppModeBackground === 'function') {
		syncAppModeBackground();
	}
}

function isMapViewActive() {
	return document.body.classList.contains('map')
		|| document.body.classList.contains('satellite')
		|| document.body.classList.contains('osm');
}

function ensureMapViewForLocation() {
	if(!isMapViewActive()) {
		setMapLayer(MAP_LAYER_ROADMAP);
	}
}
