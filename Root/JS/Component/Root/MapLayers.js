var MAP_LAYER_ROADMAP = 'roadmap';
var MAP_LAYER_SATELLITE = 'satellite';
var MAP_LAYER_OSM = 'osm';
var MAP_LAYER_APPLE = 'apple';
var MAP_LAYER_ESRI = 'esri';
var MAP_LAYER_MICROSOFT = 'microsoft';
var MAP_VIEW_CLASSES = ['map', 'satellite', 'osm', 'apple', 'esri', 'microsoft'];
var OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
var MAPKIT_SCRIPT_URL = 'https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js';
var TRANSPARENT_TILE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
var ESRI_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}';
var MICROSOFT_TILE_URL = 'https://t.ssl.ak.dynamic.tiles.virtualearth.net/comp/ch/{q}?mkt=en-US&it=G,L&shading=hill&n=z';
var rasterMapTypesInitialized = false;
var appleMap = null;
var appleMapkitReady = false;
var appleMapkitLoading = false;
var appleMapkitErrorBound = false;
var appleMapkitWaiters = [];

function wrapTileX(x, zoom) {
	var range = 1 << zoom;
	return ((x % range) + range) % range;
}

function tileXYToQuadKey(x, y, zoom) {
	var quadKey = '';
	var i;
	var digit;
	var mask;
	for(i = zoom; i > 0; i--) {
		digit = 0;
		mask = 1 << (i - 1);
		if((x & mask) !== 0) {
			digit += 1;
		}
		if((y & mask) !== 0) {
			digit += 2;
		}
		quadKey += String(digit);
	}
	return quadKey;
}

function rasterTileUrl(template, coord, zoom) {
	var x = wrapTileX(coord.x, zoom);
	var y = coord.y;
	var range = 1 << zoom;
	if(y < 0 || y >= range) {
		return null;
	}
	return template
		.replace('{s}', String.fromCharCode(97 + ((x + y) % 4)))
		.replace('{q}', tileXYToQuadKey(x, y, zoom))
		.replace('{z}', String(zoom))
		.replace('{x}', String(x))
		.replace('{y}', String(y));
}

function getAppleMapsToken() {
	return typeof WOLO_APPLE_MAPS_TOKEN === 'string' ? WOLO_APPLE_MAPS_TOKEN.trim() : '';
}

function hasAppleMapsToken() {
	return getAppleMapsToken().length > 0;
}

function setBlankMapType(id, name) {
	map.mapTypes.set(id, new google.maps.ImageMapType({
		getTileUrl: function() {
			return TRANSPARENT_TILE_URL;
		},
		tileSize: new google.maps.Size(256, 256),
		name: name,
		maxZoom: 21,
		alt: name
	}));
}

function getAppleMapElement() {
	return document.getElementById('apple_map');
}

function hideAppleMapStage() {
	var el = getAppleMapElement();
	if(!el) {
		return;
	}
	el.classList.add('hide');
	el.setAttribute('aria-hidden', 'true');
	el.style.transform = '';
	if(appleMapFollowRaf) {
		cancelAnimationFrame(appleMapFollowRaf);
		appleMapFollowRaf = 0;
	}
}

function showAppleMapStage() {
	var el = getAppleMapElement();
	if(!el) {
		return;
	}
	el.classList.remove('hide');
	el.setAttribute('aria-hidden', 'false');
}

function bindAppleMapKitErrors() {
	if(typeof mapkit === 'undefined' || appleMapkitErrorBound) {
		return;
	}
	appleMapkitErrorBound = true;
	mapkit.addEventListener('error', function() {
		appleMapkitReady = false;
		if(typeof showNotification === 'function') {
			showNotification('Apple Maps could not authorize this site');
		}
	});
}

var appleMapFollowBaseCenter = null;
var appleMapFollowBaseZoom = null;
var appleMapFollowRaf = 0;
var APPLE_MAP_FOLLOW_COMMIT_PX = 192;

function syncAppleMapAppearance() {
	if(!appleMap || typeof mapkit === 'undefined') {
		return;
	}
	appleMap.colorScheme = document.documentElement.classList.contains('dark-mode')
		? mapkit.Map.ColorSchemes.Dark
		: mapkit.Map.ColorSchemes.Light;
}

function resetAppleMapFollowTransform() {
	var el = getAppleMapElement();
	if(el) {
		el.style.transform = '';
	}
}

function googleLatLngToContainerPixel(latLng) {
	var projection;
	var bounds;
	var ne;
	var topLeft;
	var scale;
	var world;
	if(typeof google === 'undefined' || typeof map !== 'object' || !map || !latLng) {
		return null;
	}
	projection = typeof map.getProjection === 'function' ? map.getProjection() : null;
	bounds = map.getBounds();
	if(!projection || !bounds || typeof projection.fromLatLngToPoint !== 'function') {
		return null;
	}
	ne = bounds.getNorthEast();
	topLeft = projection.fromLatLngToPoint(new google.maps.LatLng(ne.lat(), bounds.getSouthWest().lng()));
	world = projection.fromLatLngToPoint(latLng);
	scale = Math.pow(2, map.getZoom());
	return {
		x: (world.x - topLeft.x) * scale,
		y: (world.y - topLeft.y) * scale
	};
}

function applyAppleMapRegion(region) {
	if(typeof appleMap.setRegionAnimated === 'function') {
		appleMap.setRegionAnimated(region, false);
	}
	else {
		appleMap.region = region;
	}
}

function googleBoundsToAppleRegion(bounds, center) {
	var ne = bounds.getNorthEast();
	var sw = bounds.getSouthWest();
	return new mapkit.CoordinateRegion(
		new mapkit.Coordinate(center.lat(), center.lng()),
		new mapkit.CoordinateSpan(Math.abs(ne.lat() - sw.lat()), Math.abs(ne.lng() - sw.lng()))
	);
}

function syncAppleMapFromGoogle() {
	var bounds;
	var center;
	if(!appleMap || typeof mapkit === 'undefined' || typeof map !== 'object' || !map || getCurrentMapLayer() !== MAP_LAYER_APPLE) {
		return;
	}
	bounds = map.getBounds();
	center = map.getCenter();
	if(!bounds || !center) {
		return;
	}
	applyAppleMapRegion(googleBoundsToAppleRegion(bounds, center));
	appleMapFollowBaseCenter = new google.maps.LatLng(center.lat(), center.lng());
	appleMapFollowBaseZoom = map.getZoom();
	resetAppleMapFollowTransform();
}

function followAppleMapFromGoogle() {
	var bounds;
	var center;
	var el;
	var pixel;
	var dx;
	var dy;
	var zoom;
	if(!appleMap || typeof mapkit === 'undefined' || typeof map !== 'object' || !map || getCurrentMapLayer() !== MAP_LAYER_APPLE) {
		return;
	}
	bounds = map.getBounds();
	center = map.getCenter();
	zoom = map.getZoom();
	el = getAppleMapElement();
	if(!bounds || !center || !el) {
		return;
	}
	if(appleMapFollowBaseCenter == null || appleMapFollowBaseZoom !== zoom) {
		syncAppleMapFromGoogle();
		return;
	}
	pixel = googleLatLngToContainerPixel(appleMapFollowBaseCenter);
	if(!pixel) {
		syncAppleMapFromGoogle();
		return;
	}
	dx = pixel.x - (el.clientWidth / 2);
	dy = pixel.y - (el.clientHeight / 2);
	if(Math.abs(dx) > APPLE_MAP_FOLLOW_COMMIT_PX || Math.abs(dy) > APPLE_MAP_FOLLOW_COMMIT_PX) {
		syncAppleMapFromGoogle();
		return;
	}
	el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
}

function scheduleAppleMapFollow() {
	if(getCurrentMapLayer() !== MAP_LAYER_APPLE) {
		return;
	}
	if(appleMapFollowRaf) {
		return;
	}
	appleMapFollowRaf = requestAnimationFrame(function() {
		appleMapFollowRaf = 0;
		followAppleMapFromGoogle();
	});
}

function createAppleMap() {
	var el = getAppleMapElement();
	if(!el || typeof mapkit === 'undefined') {
		return;
	}
	showAppleMapStage();
	bindAppleMapKitErrors();
	if(!appleMap) {
		var appleMapOptions = {
			mapType: mapkit.Map.MapTypes.Standard,
			showsMapTypeControl: false,
			showsZoomControl: false,
			showsCompass: mapkit.FeatureVisibility.Hidden,
			showsScale: mapkit.FeatureVisibility.Hidden,
			isRotationEnabled: false,
			isScrollEnabled: false,
			isZoomEnabled: false,
			isUserInteractionEnabled: false
		};
		if(typeof mapkit.Padding === 'function') {
			appleMapOptions.padding = new mapkit.Padding(0, 8, 8, 8);
		}
		appleMap = new mapkit.Map(el, appleMapOptions);
		syncAppleMapAppearance();
	}
	requestAnimationFrame(function() {
		syncAppleMapFromGoogle();
	});
}

function initAppleMapKit(onReady) {
	if(onReady) {
		appleMapkitWaiters.push(onReady);
	}

	function flush(ok) {
		var waiters = appleMapkitWaiters;
		appleMapkitWaiters = [];
		var i;
		for(i = 0; i < waiters.length; i++) {
			waiters[i](ok);
		}
	}

	if(typeof mapkit !== 'undefined' && appleMapkitReady) {
		createAppleMap();
		flush(true);
		return;
	}
	if(!hasAppleMapsToken()) {
		flush(false);
		return;
	}
	if(appleMapkitLoading) {
		return;
	}

	function start() {
		try {
			bindAppleMapKitErrors();
			if(!appleMapkitReady) {
				mapkit.init({
					authorizationCallback: function(done) {
						done(getAppleMapsToken());
					}
				});
				appleMapkitReady = true;
			}
			createAppleMap();
			flush(true);
		}
		catch(error) {
			appleMapkitReady = false;
			if(typeof showNotification === 'function') {
				showNotification('Apple Maps failed to start');
			}
			flush(false);
		}
	}

	if(typeof mapkit !== 'undefined') {
		start();
		return;
	}

	appleMapkitLoading = true;
	var script = document.createElement('script');
	script.src = MAPKIT_SCRIPT_URL;
	script.crossOrigin = 'anonymous';
	script.onload = function() {
		appleMapkitLoading = false;
		start();
	};
	script.onerror = function() {
		appleMapkitLoading = false;
		if(typeof showNotification === 'function') {
			showNotification('Apple Maps failed to load');
		}
		flush(false);
	};
	document.head.appendChild(script);
}

function activateAppleMapLayer() {
	initAppleMapKit(function(ok) {
		if(getCurrentMapLayer() !== MAP_LAYER_APPLE) {
			return;
		}
		if(!ok) {
			if(typeof showNotification === 'function') {
				showNotification('Add apple_maps_token to enable Apple Maps');
			}
			setMapLayer(getDefaultMapLayer());
			return;
		}
		showAppleMapStage();
		map.setMapTypeId(MAP_LAYER_APPLE);
		if(typeof map.setOptions === 'function') {
			map.setOptions({backgroundColor: 'transparent', styles: []});
		}
		syncAppleMapFromGoogle();
		requestAnimationFrame(function() {
			syncAppleMapFromGoogle();
		});
	});
}

function setRasterMapType(id, name, template, maxZoom) {
	map.mapTypes.set(id, new google.maps.ImageMapType({
		getTileUrl: function(coord, zoom) {
			return rasterTileUrl(template, coord, zoom);
		},
		tileSize: new google.maps.Size(256, 256),
		name: name,
		maxZoom: maxZoom,
		alt: name
	}));
}

function initOsmMapType() {
	if(rasterMapTypesInitialized || typeof map !== 'object' || !map || typeof google === 'undefined') {
		return;
	}

	setRasterMapType(MAP_LAYER_OSM, 'OpenStreetMap', OSM_TILE_URL, 19);
	setBlankMapType(MAP_LAYER_APPLE, 'Apple Maps');
	setRasterMapType(MAP_LAYER_ESRI, 'Esri', ESRI_TILE_URL, 19);
	setRasterMapType(MAP_LAYER_MICROSOFT, 'Microsoft Maps', MICROSOFT_TILE_URL, 19);
	rasterMapTypesInitialized = true;
}

function getCurrentMapLayer() {
	if(document.body.classList.contains('osm')) {
		return MAP_LAYER_OSM;
	}
	if(document.body.classList.contains('apple')) {
		return MAP_LAYER_APPLE;
	}
	if(document.body.classList.contains('esri')) {
		return MAP_LAYER_ESRI;
	}
	if(document.body.classList.contains('microsoft')) {
		return MAP_LAYER_MICROSOFT;
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
	var attributions = document.querySelectorAll('.map_attribution');
	var layer = getCurrentMapLayer();
	var i;
	for(i = 0; i < attributions.length; i++) {
	if(attributions[i].getAttribute('data-map-layer') === layer) {
			attributions[i].classList.remove('hide');
		}
		else {
			attributions[i].classList.add('hide');
		}
	}
}

function clearMapViewClasses() {
	document.body.classList.remove.apply(document.body.classList, MAP_VIEW_CLASSES);
}

function setMapLayer(layer) {
	if(!isMapLayerEnabled(layer)) {
		layer = getDefaultMapLayer();
	}
	initOsmMapType();
	clearMapViewClasses();
	if(layer !== MAP_LAYER_APPLE) {
		hideAppleMapStage();
	}

	if(layer === MAP_LAYER_SATELLITE) {
		document.body.classList.add('satellite');
		map.setMapTypeId(google.maps.MapTypeId.SATELLITE);
	}
	else if(layer === MAP_LAYER_OSM) {
		document.body.classList.add('osm');
		map.setMapTypeId(MAP_LAYER_OSM);
	}
	else if(layer === MAP_LAYER_APPLE) {
		document.body.classList.add('apple');
		activateAppleMapLayer();
	}
	else if(layer === MAP_LAYER_ESRI) {
		document.body.classList.add('esri');
		map.setMapTypeId(MAP_LAYER_ESRI);
	}
	else if(layer === MAP_LAYER_MICROSOFT) {
		document.body.classList.add('microsoft');
		map.setMapTypeId(MAP_LAYER_MICROSOFT);
	}
	else {
		document.body.classList.add('map');
		map.setMapTypeId(google.maps.MapTypeId.ROADMAP);
	}

	syncOsmAttribution();
	if(typeof syncAppModeBackground === 'function') {
		syncAppModeBackground();
	}
	syncMapChromeTooltips();
}

function isMapViewActive() {
	var i;
	for(i = 0; i < MAP_VIEW_CLASSES.length; i++) {
		if(document.body.classList.contains(MAP_VIEW_CLASSES[i])) {
			return true;
		}
	}
	return false;
}

function ensureMapViewForLocation() {
	if(document.body.classList.contains('decode')) {
		document.body.classList.remove('decode');
	}
	if(!isMapViewActive() || !isMapLayerEnabled(getCurrentMapLayer())) {
		setMapLayer(getDefaultMapLayer());
	}
}

var MAP_SOURCE_STORAGE_KEY = 'wolo-map-source';
var MAP_SOURCE_GOOGLE = 'google';
var MAP_SOURCE_OSM = 'osm';
var MAP_SOURCE_APPLE = 'apple';
var MAP_SOURCE_ESRI = 'esri';
var MAP_SOURCE_MICROSOFT = 'microsoft';
var MAP_SOURCE_IDS = [MAP_SOURCE_GOOGLE, MAP_SOURCE_OSM, MAP_SOURCE_APPLE, MAP_SOURCE_ESRI, MAP_SOURCE_MICROSOFT];
var MAP_SOURCE_LABELS = {
	google: 'Google Maps',
	osm: 'OpenStreetMap',
	apple: 'Apple Maps',
	esri: 'Esri',
	microsoft: 'Microsoft Maps'
};
var MAP_SOURCE_STATE_DEFAULT = 'default';
var MAP_SOURCE_STATE_ON = 'on';
var MAP_SOURCE_STATE_OFF = 'off';
var MAP_SOURCE_PREF_DEFAULTS = {
	google: MAP_SOURCE_STATE_DEFAULT,
	osm: MAP_SOURCE_STATE_ON,
	apple: MAP_SOURCE_STATE_OFF,
	esri: MAP_SOURCE_STATE_ON,
	microsoft: MAP_SOURCE_STATE_ON
};
var mapSourcePrefs = {
	google: MAP_SOURCE_STATE_DEFAULT,
	osm: MAP_SOURCE_STATE_ON,
	apple: MAP_SOURCE_STATE_OFF,
	esri: MAP_SOURCE_STATE_ON,
	microsoft: MAP_SOURCE_STATE_ON
};

function normalizeMapSourceState(state) {
	if(state === MAP_SOURCE_STATE_DEFAULT || state === MAP_SOURCE_STATE_ON || state === MAP_SOURCE_STATE_OFF) {
		return state;
	}
	return null;
}

function copyMapSourcePrefs(prefs) {
	var next = {};
	var i;
	var id;
	for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
		id = MAP_SOURCE_IDS[i];
		next[id] = prefs && prefs[id] ? prefs[id] : MAP_SOURCE_PREF_DEFAULTS[id];
	}
	return next;
}

function getEnabledMapSources(prefs) {
	var enabled = [];
	var i;
	var id;
	for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
		id = MAP_SOURCE_IDS[i];
		if(prefs[id] !== MAP_SOURCE_STATE_OFF) {
			enabled.push(id);
		}
	}
	return enabled;
}

function normalizeMapSourcePrefs(prefs) {
	var next = copyMapSourcePrefs(prefs);
	var i;
	var id;
	var enabled;
	var defaultCount = 0;
	var seenDefault = false;

	for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
		id = MAP_SOURCE_IDS[i];
		if(!normalizeMapSourceState(next[id])) {
			next[id] = MAP_SOURCE_PREF_DEFAULTS[id];
		}
		if(next[id] === MAP_SOURCE_STATE_DEFAULT) {
			defaultCount++;
		}
	}

	enabled = getEnabledMapSources(next);
	if(next.apple !== MAP_SOURCE_STATE_OFF && !hasAppleMapsToken()) {
		if(next.apple === MAP_SOURCE_STATE_DEFAULT) {
			next.apple = MAP_SOURCE_STATE_OFF;
			enabled = getEnabledMapSources(next);
			if(enabled.length) {
				next[enabled[0]] = MAP_SOURCE_STATE_DEFAULT;
			}
		}
		else {
			next.apple = MAP_SOURCE_STATE_OFF;
		}
	}

	enabled = getEnabledMapSources(next);
	if(!enabled.length) {
		return copyMapSourcePrefs(MAP_SOURCE_PREF_DEFAULTS);
	}
	if(defaultCount === 0) {
		next[enabled[0]] = MAP_SOURCE_STATE_DEFAULT;
	}
	else if(defaultCount > 1) {
		for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
			id = MAP_SOURCE_IDS[i];
			if(next[id] === MAP_SOURCE_STATE_DEFAULT) {
				if(seenDefault) {
					next[id] = MAP_SOURCE_STATE_ON;
				}
				else {
					seenDefault = true;
				}
			}
		}
	}

	return next;
}

function readStoredMapSourcePrefs() {
	try {
		return JSON.parse(localStorage.getItem(MAP_SOURCE_STORAGE_KEY));
	}
	catch(e) {
		return null;
	}
}

function persistMapSourcePrefs() {
	try {
		localStorage.setItem(MAP_SOURCE_STORAGE_KEY, JSON.stringify(mapSourcePrefs));
	}
	catch(e) {}
}

function isMapSourceEnabled(source) {
	return mapSourcePrefs[source] !== MAP_SOURCE_STATE_OFF;
}

function isMapLayerEnabled(layer) {
	if(layer === MAP_LAYER_OSM) {
		return isMapSourceEnabled(MAP_SOURCE_OSM);
	}
	if(layer === MAP_LAYER_APPLE) {
		return isMapSourceEnabled(MAP_SOURCE_APPLE) && hasAppleMapsToken();
	}
	if(layer === MAP_LAYER_ESRI) {
		return isMapSourceEnabled(MAP_SOURCE_ESRI);
	}
	if(layer === MAP_LAYER_MICROSOFT) {
		return isMapSourceEnabled(MAP_SOURCE_MICROSOFT);
	}
	if(layer === MAP_LAYER_ROADMAP || layer === MAP_LAYER_SATELLITE) {
		return isMapSourceEnabled(MAP_SOURCE_GOOGLE);
	}
	return false;
}

function sourceDefaultLayer(source) {
	if(source === MAP_SOURCE_OSM) {
		return MAP_LAYER_OSM;
	}
	if(source === MAP_SOURCE_APPLE) {
		return MAP_LAYER_APPLE;
	}
	if(source === MAP_SOURCE_ESRI) {
		return MAP_LAYER_ESRI;
	}
	if(source === MAP_SOURCE_MICROSOFT) {
		return MAP_LAYER_MICROSOFT;
	}
	return MAP_LAYER_ROADMAP;
}

function getDefaultMapLayer() {
	var i;
	var id;
	var layer;
	for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
		id = MAP_SOURCE_IDS[i];
		if(mapSourcePrefs[id] === MAP_SOURCE_STATE_DEFAULT) {
			layer = sourceDefaultLayer(id);
			if(isMapLayerEnabled(layer)) {
				return layer;
			}
		}
	}
	if(isMapSourceEnabled(MAP_SOURCE_GOOGLE)) {
		return MAP_LAYER_ROADMAP;
	}
	if(isMapLayerEnabled(MAP_LAYER_OSM)) {
		return MAP_LAYER_OSM;
	}
	if(isMapLayerEnabled(MAP_LAYER_ESRI)) {
		return MAP_LAYER_ESRI;
	}
	if(isMapLayerEnabled(MAP_LAYER_MICROSOFT)) {
		return MAP_LAYER_MICROSOFT;
	}
	if(isMapLayerEnabled(MAP_LAYER_APPLE)) {
		return MAP_LAYER_APPLE;
	}
	return MAP_LAYER_ROADMAP;
}

function getDefaultMapSourceLabel() {
	var i;
	var id;
	for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
		id = MAP_SOURCE_IDS[i];
		if(mapSourcePrefs[id] === MAP_SOURCE_STATE_DEFAULT) {
			return MAP_SOURCE_LABELS[id];
		}
	}
	return MAP_SOURCE_LABELS.google;
}

function getMapLayerCycle() {
	var layers = [];
	if(isMapSourceEnabled(MAP_SOURCE_GOOGLE)) {
		layers.push(MAP_LAYER_ROADMAP, MAP_LAYER_SATELLITE);
	}
	if(isMapSourceEnabled(MAP_SOURCE_OSM)) {
		layers.push(MAP_LAYER_OSM);
	}
	if(isMapLayerEnabled(MAP_LAYER_APPLE)) {
		layers.push(MAP_LAYER_APPLE);
	}
	if(isMapLayerEnabled(MAP_LAYER_ESRI)) {
		layers.push(MAP_LAYER_ESRI);
	}
	if(isMapLayerEnabled(MAP_LAYER_MICROSOFT)) {
		layers.push(MAP_LAYER_MICROSOFT);
	}
	if(!layers.length) {
		layers.push(getDefaultMapLayer());
	}
	return layers;
}

function getNextMapLayer(current) {
	var layers = getMapLayerCycle();
	var index = layers.indexOf(current);
	if(index < 0) {
		return getDefaultMapLayer();
	}
	return layers[(index + 1) % layers.length];
}

function setControlTooltip(el, label) {
	if(!el || !label) {
		return;
	}
	el.setAttribute('aria-label', label);
	el.setAttribute('title', label);
}

function getMapLayerLabel(layer) {
	if(layer === MAP_LAYER_SATELLITE) {
		return 'Satellite map';
	}
	if(layer === MAP_LAYER_OSM) {
		return MAP_SOURCE_LABELS.osm;
	}
	if(layer === MAP_LAYER_APPLE) {
		return MAP_SOURCE_LABELS.apple;
	}
	if(layer === MAP_LAYER_ESRI) {
		return MAP_SOURCE_LABELS.esri;
	}
	if(layer === MAP_LAYER_MICROSOFT) {
		return MAP_SOURCE_LABELS.microsoft;
	}
	return MAP_SOURCE_LABELS.google;
}

function fillMissingControlTooltips() {
	var nodes = document.querySelectorAll('button[aria-label], .control[aria-label], [role="switch"][aria-label]');
	var i;
	var label;
	for(i = 0; i < nodes.length; i++) {
		label = nodes[i].getAttribute('aria-label');
		if(label && !nodes[i].getAttribute('title')) {
			nodes[i].setAttribute('title', label);
		}
	}
}

function syncMapChromeTooltips() {
	var decodeView = document.body.classList.contains('decode');
	var defaultLabel = getDefaultMapSourceLabel();
	var nextLabel = getMapLayerLabel(getNextMapLayer(getCurrentMapLayer() || getDefaultMapLayer()));
	setControlTooltip(document.getElementById('decode_map_view_button'), defaultLabel + ' view');
	setControlTooltip(document.getElementById('map_type_button'), 'Switch to ' + nextLabel);
	setControlTooltip(
		document.getElementById('action_menu_map'),
		decodeView
			? (isMapLayerEnabled(MAP_LAYER_SATELLITE) ? 'Satellite map view' : defaultLabel + ' view')
			: 'Switch to ' + nextLabel
	);
	setControlTooltip(document.getElementById('action_menu_decode'), decodeView ? defaultLabel + ' view' : 'Wolo Code input');
	setControlTooltip(document.getElementById('action_menu_info'), 'Info');
	setControlTooltip(document.getElementById('action_menu_toggle'), 'Actions');
	setControlTooltip(document.getElementById('location_button'), 'Locate');
	setControlTooltip(document.getElementById('account'), 'Account');
	setControlTooltip(document.getElementById('decode_button'), 'Go');
	setControlTooltip(document.getElementById('decode_input_button'), 'Go');
	setControlTooltip(document.getElementById('decode_city_ip'), 'Use IP city');
	setControlTooltip(document.getElementById('decode_city_geolocation'), 'Use geolocation city');
	setControlTooltip(document.getElementById('decode_city_history_toggle'), 'Choose previous city');
}

function syncMapSourceControls() {
	var toggles = document.querySelectorAll('.map-source-toggle');
	var defaults = document.querySelectorAll('.map-source-default');
	var i;
	var source;
	var enabled;
	var selected;
	var label;
	var id;

	for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
		id = MAP_SOURCE_IDS[i];
		document.body.classList.toggle('map-source-default-' + id, mapSourcePrefs[id] === MAP_SOURCE_STATE_DEFAULT);
		document.body.classList.toggle('map-source-' + id + '-off', !isMapSourceEnabled(id));
	}
	document.body.classList.toggle('map-source-single', getMapLayerCycle().length < 2);

	syncMapChromeTooltips();

	for(i = 0; i < toggles.length; i++) {
		source = toggles[i].getAttribute('data-map-source');
		enabled = isMapSourceEnabled(source);
		label = MAP_SOURCE_LABELS[source] || source;
		toggles[i].classList.toggle('map-source-toggle-on', enabled);
		toggles[i].setAttribute('aria-checked', enabled ? 'true' : 'false');
		setControlTooltip(toggles[i], (enabled ? 'Disable ' : 'Enable ') + label);
	}

	for(i = 0; i < defaults.length; i++) {
		source = defaults[i].getAttribute('data-map-source');
		enabled = isMapSourceEnabled(source);
		selected = mapSourcePrefs[source] === MAP_SOURCE_STATE_DEFAULT;
		label = MAP_SOURCE_LABELS[source] || source;
		defaults[i].disabled = !enabled;
		defaults[i].classList.toggle('map-source-default-active', selected);
		defaults[i].setAttribute('aria-pressed', selected ? 'true' : 'false');
		setControlTooltip(defaults[i], selected ? label + ' is the default map' : 'Set ' + label + ' as default');
	}
}

function applyMapSourceToMap() {
	if(typeof map !== 'object' || !map || document.body.classList.contains('decode')) {
		return;
	}
	if(isMapViewActive() && !isMapLayerEnabled(getCurrentMapLayer())) {
		setMapLayer(getDefaultMapLayer());
	}
}

function setMapSourceState(source, state, persist) {
	var next;
	var enabled;
	var i;
	var id;

	if(MAP_SOURCE_IDS.indexOf(source) < 0) {
		return;
	}
	state = normalizeMapSourceState(state);
	if(!state) {
		return;
	}
	if(source === MAP_SOURCE_APPLE && (state === MAP_SOURCE_STATE_ON || state === MAP_SOURCE_STATE_DEFAULT) && !hasAppleMapsToken()) {
		if(typeof showNotification === 'function') {
			showNotification('Add apple_maps_token to enable Apple Maps');
		}
		return;
	}
	if(state === MAP_SOURCE_STATE_DEFAULT && mapSourcePrefs[source] === MAP_SOURCE_STATE_OFF) {
		return;
	}
	if(mapSourcePrefs[source] === state || (state === MAP_SOURCE_STATE_ON && mapSourcePrefs[source] === MAP_SOURCE_STATE_DEFAULT)) {
		return;
	}

	next = copyMapSourcePrefs(mapSourcePrefs);
	if(state === MAP_SOURCE_STATE_OFF) {
		enabled = getEnabledMapSources(next).filter(function(id) {
			return id !== source;
		});
		if(!enabled.length) {
			if(typeof showNotification === 'function') {
				showNotification('Keep at least one map source enabled');
			}
			return;
		}
		next[source] = MAP_SOURCE_STATE_OFF;
		if(mapSourcePrefs[source] === MAP_SOURCE_STATE_DEFAULT) {
			next[enabled[0]] = MAP_SOURCE_STATE_DEFAULT;
		}
	}
	else if(state === MAP_SOURCE_STATE_DEFAULT) {
		for(i = 0; i < MAP_SOURCE_IDS.length; i++) {
			id = MAP_SOURCE_IDS[i];
			if(id === source) {
				next[id] = MAP_SOURCE_STATE_DEFAULT;
			}
			else if(next[id] === MAP_SOURCE_STATE_DEFAULT) {
				next[id] = MAP_SOURCE_STATE_ON;
			}
		}
	}
	else {
		next[source] = MAP_SOURCE_STATE_ON;
	}

	mapSourcePrefs = normalizeMapSourcePrefs(next);
	syncMapSourceControls();
	if(persist !== false) {
		persistMapSourcePrefs();
	}
	applyMapSourceToMap();
}

function initMapSource() {
	var toggles = document.querySelectorAll('.map-source-toggle');
	var defaults = document.querySelectorAll('.map-source-default');
	var i;

	mapSourcePrefs = normalizeMapSourcePrefs(readStoredMapSourcePrefs());
	fillMissingControlTooltips();
	syncMapSourceControls();

	for(i = 0; i < toggles.length; i++) {
		toggles[i].addEventListener('click', function() {
			var source = this.getAttribute('data-map-source');
			setMapSourceState(source, isMapSourceEnabled(source) ? MAP_SOURCE_STATE_OFF : MAP_SOURCE_STATE_ON, true);
		});
	}

	for(i = 0; i < defaults.length; i++) {
		defaults[i].addEventListener('click', function() {
			setMapSourceState(this.getAttribute('data-map-source'), MAP_SOURCE_STATE_DEFAULT, true);
		});
	}
}
