'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

test('OSM high zoom falls back when tiles are missing', () => {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	const focusJs = read('Root/JS/Component/Root/Focus.js');
	assert.match(mapLayers, /OSM_NATIVE_MAX_ZOOM = 19/);
	assert.match(mapLayers, /OSM_MAP_DATA_UNAVAILABLE_MESSAGE = 'Map data not yet available'/);
	assert.match(mapLayers, /function getOsmFallbackZoom/);
	assert.match(mapLayers, /function scheduleOsmZoomFallback/);
	assert.match(mapLayers, /function watchOsmZoomFallback/);
	assert.match(mapLayers, /bindOsmTileNode/);
	assert.match(mapLayers, /zoom > OSM_NATIVE_MAX_ZOOM/);
	assert.match(focusJs, /getActiveMapTypeMaxZoom/);
	assert.match(focusJs, /OSM_NATIVE_MAX_ZOOM/);
	assert.doesNotMatch(focusJs, /notifyOsmMapDataUnavailable/);
	assert.match(mapLayers, /if\(tilesMissing\)\s*notifyOsmMapDataUnavailable/);
});

test('OSM and raster tiles do not steal map click or drag', () => {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const clickHandler = read('Root/JS/ClickHandler.js');
	const rootCss = read('Root/CSS/Component/Root/Base/Root.css');
	assert.match(mapLayers, /function disableRasterTileGestures/);
	assert.match(mapLayers, /pointerEvents = 'none'/);
	assert.match(mapLayers, /disableRasterTileGestures\(tile\)/);
	assert.match(mapJs, /function isIgnorableMapClick/);
	assert.match(mapJs, /gmp-internal-camera-control/);
	assert.match(mapJs, /markMapDragClickGuard/);
	assert.match(clickHandler, /isIgnorableMapClick/);
	assert.match(rootCss, /right:\s*88px\s*!important/);
	assert.doesNotMatch(rootCss, /gmp-internal-camera-control \{[\s\S]*transform:\s*translate/);
});

function loadOsmZoomFallbackApi() {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	const start = mapLayers.indexOf('function getOsmFallbackZoom(');
	const end = mapLayers.indexOf('function getActiveMapTypeMaxZoom(');
	const sandbox = {
		OSM_ZOOM_FALLBACK_MIN: 1
	};
	vm.createContext(sandbox);
	vm.runInContext(mapLayers.slice(start, end), sandbox);
	return sandbox;
}

test('getOsmFallbackZoom steps back to native max or previous zoom', () => {
	const api = loadOsmZoomFallbackApi();
	assert.equal(api.getOsmFallbackZoom(24, 19, false), 19);
	assert.equal(api.getOsmFallbackZoom(19, 19, false), 19);
	assert.equal(api.getOsmFallbackZoom(19, 19, true), 18);
	assert.equal(api.getOsmFallbackZoom(1, 19, true), 1);
});

test('ensureMapViewForLocation leaves decode view for map layers', () => {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	assert.match(mapLayers, /function ensureMapViewForLocation/);
	assert.match(mapLayers, /classList\.contains\('decode'\)/);
	assert.match(mapLayers, /classList\.remove\('decode'\)/);
});

test('map view keeps Place Search Input ready for typing', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	const overlayJs = read('Root/JS/Component/Root/Overlay.js');
	const clickHandler = read('Root/JS/ClickHandler.js');
	assert.match(mapJs, /function shouldKeepMapSearchFocused/);
	assert.match(mapJs, /function focusMapSearchInput/);
	assert.match(mapJs, /function scheduleFocusMapSearchInput/);
	assert.match(mapJs, /document\.addEventListener\('keydown', onMapSearchGlobalKeydown\)/);
	assert.match(mapJs, /blurMapSearchInput\(\)/);
	assert.match(mapLayers, /scheduleFocusMapSearchInput\(\)/);
	assert.match(overlayJs, /scheduleFocusMapSearchInput/);
	assert.match(clickHandler, /scheduleFocusMapSearchInput/);
	assert.doesNotMatch(clickHandler, /getElementById\('pac-input'\)\.blur\(\)/);
});

function loadMapSearchFocusApi(options) {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const start = mapJs.indexOf('function isMapSearchTypingTarget(');
	const end = mapJs.indexOf('function initMap(');
	const pacInput = {
		id: 'pac-input',
		tagName: 'INPUT',
		isContentEditable: false,
		focusCalls: 0,
		focus: function() {
			this.focusCalls += 1;
			sandbox.document.activeElement = this;
		}
	};
	const otherInput = {
		id: 'other',
		tagName: 'INPUT',
		isContentEditable: false
	};
	const bodyClasses = new Set(options.bodyClasses || ['map']);
	const sandbox = {
		document: {
			body: {
				classList: {
					contains: function(name) {
						return bodyClasses.has(name);
					}
				}
			},
			documentElement: {},
			activeElement: null,
			getElementById: function(id) {
				return id === 'pac-input' ? pacInput : null;
			}
		},
		isMapViewActive: function() {
			return options.mapView !== false;
		},
		getVisibleOverlayDialog: function() {
			return options.overlay || null;
		}
	};
	if(options.active === 'other')
		sandbox.document.activeElement = otherInput;
	else if(options.active === 'body')
		sandbox.document.activeElement = sandbox.document.body;
	else
		sandbox.document.activeElement = pacInput;
	vm.createContext(sandbox);
	vm.runInContext(mapJs.slice(start, end), sandbox);
	sandbox.pacInput = pacInput;
	return sandbox;
}

test('shouldKeepMapSearchFocused skips decode, overlays, and other fields', () => {
	assert.equal(loadMapSearchFocusApi({}).shouldKeepMapSearchFocused(), true);
	assert.equal(loadMapSearchFocusApi({mapView: false}).shouldKeepMapSearchFocused(), false);
	assert.equal(loadMapSearchFocusApi({bodyClasses: ['map', 'decode']}).shouldKeepMapSearchFocused(), false);
	assert.equal(loadMapSearchFocusApi({bodyClasses: ['map', 'decode-icon-guide']}).shouldKeepMapSearchFocused(), false);
	assert.equal(loadMapSearchFocusApi({overlay: {}}).shouldKeepMapSearchFocused(), false);
	assert.equal(loadMapSearchFocusApi({active: 'other'}).shouldKeepMapSearchFocused(), false);
});

test('focusMapSearchInput focuses the search field in map view', () => {
	const api = loadMapSearchFocusApi({active: 'body'});
	assert.equal(api.focusMapSearchInput(), true);
	assert.equal(api.pacInput.focusCalls, 1);
	assert.equal(api.document.activeElement, api.pacInput);
});


test('locate and map-type toggle leave Wolo Code input view', () => {
	const locateJs = read('Root/JS/Base/Locate.js');
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	assert.match(locateJs, /ensureMapViewForLocation/);
	assert.match(mapJs, /if\(document\.body\.classList\.contains\('decode'\)\) \{\s*activateMapType\(\);/);
	assert.match(mapLayers, /clearMapViewClasses\(\);\s*document\.body\.classList\.remove\('decode'\);/);
});

test('map view toggle cycles enabled map layers', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	assert.match(mapJs, /getNextMapLayer\(getCurrentMapLayer\(\)\)/);
	assert.match(mapJs, /getDefaultMapLayer\(\)/);
	assert.match(mapJs, /setMapLayer\(MAP_LAYER_SATELLITE\)/);
	assert.match(mapLayers, /function getNextMapLayer/);
	assert.match(mapLayers, /MAP_LAYER_OSM/);
});

test('map source constants are declared before pref helpers and layer setters', () => {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	const constantsPos = mapLayers.indexOf('var MAP_SOURCE_IDS');
	const copyPrefsPos = mapLayers.indexOf('function copyMapSourcePrefs');
	const setLayerPos = mapLayers.indexOf('function setMapLayer');
	assert.ok(constantsPos > -1);
	assert.ok(copyPrefsPos > -1);
	assert.ok(setLayerPos > -1);
	assert.ok(constantsPos < copyPrefsPos);
	assert.ok(constantsPos < setLayerPos);
});

test('initLoad is triggered after component scripts define map sources', () => {
	const rootScript = read('Root/JS/Script.js');
	const componentScript = read('Root/JS/Component/Root/Script.js');
	assert.doesNotMatch(rootScript, /typeof initLoad[^;]*initLoad\(\)/);
	assert.match(componentScript, /typeof initLoad[^;]*initLoad\(\)/);
});

function loadMapSourcePrefsApi(overrides) {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	const start = mapLayers.indexOf('function getMapSourceIds()');
	const end = mapLayers.indexOf('function readStoredMapSourcePrefs()');
	const sandbox = {
		MAP_SOURCE_GOOGLE: 'google',
		MAP_SOURCE_OSM: 'osm',
		MAP_SOURCE_APPLE: 'apple',
		MAP_SOURCE_ESRI: 'esri',
		MAP_SOURCE_MICROSOFT: 'microsoft',
		MAP_SOURCE_IDS: [ 'google', 'osm', 'apple', 'esri', 'microsoft' ],
		MAP_SOURCE_STATE_DEFAULT: 'default',
		MAP_SOURCE_STATE_ON: 'on',
		MAP_SOURCE_STATE_OFF: 'off',
		MAP_SOURCE_PREF_DEFAULTS: {
			google: 'default',
			osm: 'on',
			apple: 'off',
			esri: 'on',
			microsoft: 'on'
		},
		hasAppleMapsToken: function() {
			return false;
		}
	};
	Object.assign(sandbox, overrides);
	vm.createContext(sandbox);
	vm.runInContext(mapLayers.slice(start, end), sandbox);
	return sandbox;
}

test('copyMapSourcePrefs and normalizeMapSourcePrefs handle missing MAP_SOURCE_IDS', () => {
	const api = loadMapSourcePrefsApi({ MAP_SOURCE_IDS: undefined });
	const copied = api.copyMapSourcePrefs({ google: 'off', osm: 'default' });
	assert.equal(copied.google, 'off');
	assert.equal(copied.osm, 'default');
	assert.equal(copied.esri, 'on');
	const normalized = api.normalizeMapSourcePrefs({ google: 'off', osm: 'off', apple: 'off', esri: 'off', microsoft: 'off' });
	assert.equal(normalized.google, 'default');
	assert.equal(normalized.osm, 'on');
});

test('normalizeMapSourcePrefs keeps a single default source', () => {
	const api = loadMapSourcePrefsApi();
	const normalized = api.normalizeMapSourcePrefs({
		google: 'default',
		osm: 'default',
		apple: 'off',
		esri: 'on',
		microsoft: 'on'
	});
	assert.equal(normalized.google, 'default');
	assert.equal(normalized.osm, 'on');
});

test('profile menu can affix google, osm, apple, esri, and microsoft map sources', () => {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	const selector = read('Root/HTML/Fragment/Map_source_selector.php');
	const account = read('Root/HTML/Fragment/Account_dialog.php');
	const auth = read('Root/HTML/Fragment/Authentication.php');
	assert.match(mapLayers, /MAP_SOURCE_STORAGE_KEY/);
	assert.match(mapLayers, /function setMapSourceState/);
	assert.match(mapLayers, /function initMapSource/);
	assert.match(mapLayers, /MAP_LAYER_APPLE/);
	assert.match(mapLayers, /MAP_LAYER_ESRI/);
	assert.match(mapLayers, /MAP_LAYER_MICROSOFT/);
	assert.match(mapLayers, /MAPKIT_SCRIPT_URL/);
	assert.match(mapLayers, /cdn\.apple-mapkit\.com/);
	assert.match(mapLayers, /function activateAppleMapLayer/);
	assert.match(mapLayers, /showAppleMapStage\(\)/);
	assert.match(mapLayers, /function setControlTooltip/);
	assert.match(mapLayers, /function syncMapChromeTooltips/);
	assert.match(mapLayers, /Google Satellite view/);
	assert.match(mapLayers, /function syncMapTypeSwitcherIcons/);
	assert.match(mapLayers, /data-map-next/);
	assert.match(mapLayers, /arcgisonline\.com/);
	assert.match(mapLayers, /virtualearth\.net/);
	assert.match(selector, /data-map-source='google'/);
	assert.match(selector, /data-map-source='osm'/);
	assert.match(selector, /data-map-source='apple'/);
	assert.match(selector, /data-map-source='esri'/);
	assert.match(selector, /data-map-source='microsoft'/);
	assert.match(selector, /map-source-toggle/);
	assert.match(selector, /map-source-default/);
	assert.match(mapLayers, /map-source-row-default/);
	assert.match(mapLayers, /MAP_SOURCE_STATE_DEFAULT/);
	assert.match(mapLayers, /MAP_SOURCE_STATE_ON/);
	assert.match(mapLayers, /MAP_SOURCE_STATE_OFF/);
	assert.match(account, /Map_source_selector\.php/);
	assert.match(auth, /Map_source_selector\.php/);
});

test('decode flow recognizes DIGIPIN and plus-code input', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const utilJs = read('Root/JS/Component/Root/Util.js');
	assert.match(mapJs, /execDecodeDigipin/);
	assert.match(mapJs, /digipin\.looksLikeDigipin/);
	assert.match(mapJs, /execDecodePlusCode/);
	assert.match(mapJs, /steerToDecodedCoordinate/);
	assert.match(mapJs, /keepAddressPanelOpen/);
	assert.match(mapJs, /showAddress/);
	assert.match(mapJs, /showInvalidCodeDialog/);
	assert.match(mapJs, /searchMapWithQuery/);
	assert.match(mapJs, /keepAddressPanelOpen = true/);
	assert.match(mapJs, /showAddress\(\)/);
	assert.match(utilJs, /function looksLikePlusCode/);
	assert.match(utilJs, /syncDecodeInputCaseSource/);
});

test('decode and map inputs uppercase DIGIPIN and plus-code values with CSS', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	const decodeCss = read('Root/CSS/Component/Root/Base/Decode.css');
	const baseCss = read('Root/CSS/Base/Base.css');
	assert.match(index, /id='decode_input_case'/);
	assert.match(index, /id='pac-input'[\s\S]*pattern=/);
	assert.match(decodeCss, /#decode_input_case:valid/);
	assert.match(decodeCss, /text-transform:\s*uppercase/);
	assert.match(baseCss, /#pac-input:valid/);
	assert.match(baseCss, /text-transform:\s*uppercase/);
});

test('map infowindow omits DIGIPIN; address panel labels DIGIPIN and plus code', () => {
	const infoWindow = read('Root/JS/Component/Root/InfoWindow.js');
	const addressHtml = read('Root/HTML/Fragment/Address.php');
	assert.doesNotMatch(infoWindow, /infowindow_digipin/);
	assert.match(addressHtml, /address_text_digipin/);
	assert.match(addressHtml, /address_text_plus/);
	assert.match(addressHtml, />DIGIPIN</);
	assert.match(addressHtml, /Plus code/);
});

test('unrecognized-code dialog and decode input tip are wired', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	const fragment = read('Root/HTML/Fragment/Invalid_code.php');
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const notificationJs = read('Root/JS/Notification.js');
	assert.match(index, /Invalid_code\.php/);
	assert.match(mapJs, /showDecodeInputAltTip/);
	assert.match(mapJs, /DECODE_INPUT_ALT_TIP_MESSAGE/);
	assert.match(notificationJs, /fadeOutNotification/);
	assert.match(fragment, /class="invalid_code_actions"/);
	assert.match(fragment, /invalid_code_correct/);
	assert.match(fragment, /invalid_code_search/);
	assert.match(fragment, /Edit code/);
	assert.match(fragment, /Search map/);
	assert.match(fragment, /includeSVG\('', 'Reverse'\)/);
	assert.match(fragment, /includeSVG\('', 'Proceed'\)/);
	assert.doesNotMatch(fragment, /button_highlight/);
	assert.doesNotMatch(fragment, /Either correct the code/);
	const dialogCss = read('Root/CSS/Base/Message_dialog.css');
	const themeCss = read('Root/CSS/Component/Root/Base/Theme.css');
	assert.match(dialogCss, /#invalid_code_query_wrap/);
	assert.match(dialogCss, /text-align:\s*center/);
	assert.match(dialogCss, /#invalid_code_message \.message_dialog_body \{[\s\S]*?padding:\s*8px 20px 20px/);
	assert.match(dialogCss, /invalid_code_actions button \{[\s\S]*?background:\s*#69B7CF/);
	assert.match(themeCss, /html\.dark-mode #invalid_code_message #invalid_code_query/);
	assert.match(themeCss, /html\.dark-mode #invalid_code_message \.invalid_code_actions button \{[\s\S]*?background:\s*#69B7CF/);
});

test('info links include OSM, Esri, Microsoft, and DIGIPIN attribution', () => {
	const infoLinks = read('Root/HTML/Fragment/Info_links.php');
	assert.match(infoLinks, /openstreetmap\.org\/copyright/);
	assert.match(infoLinks, /esri\.com/);
	assert.match(infoLinks, /microsoft\.com\/maps/);
	assert.match(infoLinks, /apple\.com\/maps/);
	assert.match(infoLinks, /google\.com\/maps/);
	assert.match(infoLinks, /indiapost\.gov\.in\/digipin/);
	assert.match(infoLinks, /renderMailLink\('support', 'wolo\.codes'/);
	assert.match(infoLinks, /Mail_link\.php/);
	assert.doesNotMatch(infoLinks, /mailto:/);
	assert.doesNotMatch(infoLinks, /ujjwal@wolo/);
	assert.doesNotMatch(infoLinks, /software_info/);
	assert.doesNotMatch(infoLinks, /info_version_value/);
	assert.doesNotMatch(infoLinks, /updated-timestamp/);
});

test('root index exposes OSM, Apple, Esri, and Microsoft map icons and attribution', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	const decodeCss = read('Root/CSS/Component/Root/Base/Decode.css');
	assert.match(index, /map_type_icon_osm/);
	assert.match(index, /map_type_icon_apple/);
	assert.match(index, /map_type_icon_esri/);
	assert.match(index, /map_type_icon_microsoft/);
	assert.match(decodeCss, /#map_type_button\[data-map-next='satellite'\]/);
	assert.match(decodeCss, /#action_menu_map\[data-map-next='osm'\]/);
	assert.match(index, /osm_attribution/);
	assert.match(index, /id='apple_map'/);
	assert.match(index, /id='map_stage'/);
	assert.match(index, /esri_attribution/);
	assert.match(index, /microsoft_attribution/);
	const decodeMapButton = index.match(/id='decode_map_view_button'[\s\S]*?<\/button>/)[0];
	assert.match(decodeMapButton, /Map-terrain/);
	assert.doesNotMatch(decodeMapButton, /Map-osm|Map-apple|Map-esri|Map-microsoft|Map-satellite/);
	assert.doesNotMatch(decodeCss, /#decode_map_view_button \.map_type_icon_/);
});

test('apple maps follows google camera without animated region snaps', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	assert.match(mapJs, /scheduleAppleMapFollow/);
	assert.match(mapLayers, /function scheduleAppleMapFollow/);
	assert.match(mapLayers, /function followAppleMapFromGoogle/);
	assert.match(mapLayers, /setRegionAnimated/);
	assert.match(mapLayers, /googleLatLngToContainerPixel/);
});

test('map source attribution sits after a gap from the action menu', () => {
	const rootCss = read('Root/CSS/Component/Root/Base/Root.css');
	const narrowCss = read('Root/CSS/Component/Root/Base/Root_narrow.css');
	const baseCss = read('Root/CSS/Base/Base.css');
	assert.match(rootCss, /\.map_attribution \{[\s\S]*left:\s*3px/);
	assert.match(rootCss, /@media \(max-width:\s*662px\) \{[\s\S]*\.map_attribution \{[\s\S]*left:\s*117px/);
	assert.doesNotMatch(rootCss, /#action_menu\.open\) \.map_attribution/);
	assert.match(narrowCss, /\.map_attribution \{[\s\S]*left:\s*117px/);
	assert.match(narrowCss, /max-width:\s*calc\(50vw - 145px\)/);
	assert.match(baseCss, /body\.apple #map_stage::after/);
});

test('theme selector shows labels on hover', () => {
	const themeHtml = read('Root/HTML/Fragment/Theme_selector.php');
	const themeCss = read('Root/CSS/Component/Root/Base/Theme.css');
	assert.match(themeHtml, /theme-option-label/);
	assert.match(themeCss, /\.theme-option:hover \.theme-option-label/);
	assert.match(themeCss, /\.theme-option:hover \.theme-option-icon/);
	assert.match(themeCss, /height:\s*18px/);
	assert.match(themeCss, /\.theme-option-active \.theme-option-label \{[\s\S]*color:\s*#69B7CF/);
	assert.match(themeCss, /\.map-source-row-default \.map-source-label \{[\s\S]*color:\s*#69B7CF/);
});

test('non-Google map views hide Google branding and keep Apple Maps transparent', () => {
	const baseCss = read('Root/CSS/Base/Base.css');
	assert.match(baseCss, /body\.osm #map \.gm-style-cc/);
	assert.match(baseCss, /body\.apple #map \.gm-style-cc/);
	assert.match(baseCss, /a\[href\^="https:\/\/maps\.google\.com\/maps"\]/);
	assert.match(baseCss, /body\.apple #map/);
	assert.match(baseCss, /background:\s*transparent\s*!important/);
});

test('chrome controls include native tooltips', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	assert.match(index, /id='location_button'[\s\S]*title='Locate'/);
	assert.match(index, /id='map_search_cluster'/);
	assert.match(index, /id='map_city_history_toggle'/);
	assert.match(index, /id='map_search_bar'/);
	assert.match(index, /id='decode_button'[\s\S]*title='Go'/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Search/);
	assert.match(index, /id='decode_button'[\s\S]*Go/);
	assert.match(index, /id='action_menu_info'[\s\S]*title='Info'/);
	assert.match(index, /id='account'[\s\S]*title='Account'/);
});

test('Wolo Code Input View has first-launch icon captions', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	const guideJs = read('Root/JS/Component/Root/DecodeIconGuide.js');
	const infoPhp = read('Root/HTML/Fragment/Info.php');
	const scriptJs = read('Root/JS/Component/Root/Script.js');
	const mapJs = read('Root/JS/Component/Root/Map.js');
	const decodeCss = read('Root/CSS/Component/Root/Base/Decode.css');
	const decodeNarrowCss = read('Root/CSS/Component/Root/Base/Decode_narrow.css');
	const infoCss = read('Root/CSS/Component/Root/Base/Info.css');
	const rootCss = read('Root/CSS/Component/Root/Base/Root.css');
	const themeCss = read('Root/CSS/Component/Root/Base/Theme.css');
	assert.match(index, /class='decode_icon_caption'[\s\S]*IP city/);
	assert.match(index, /class='decode_icon_caption'[\s\S]*GPS city/);
	assert.match(index, /class='decode_icon_caption'[\s\S]*Previous/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Account/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Info/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Locate/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Map/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Wolo Code/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Switch map/);
	assert.match(index, /id='map_camera_label'[\s\S]*D-pad/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Search/);
	assert.match(index, /id='decode_button'[\s\S]*Go/);
	assert.match(index, /id='decode_icon_guide_scrim'/);
	assert.match(index, /includeSVG\('', 'World-map'\)/);
	assert.match(index, /includeSVG\('', 'Wolo-infocard-sample'\)/);
	assert.match(index, /id='map_icon_guide_infocard'/);
	assert.match(index, /class='map_icon_guide_callout_title'/);
	assert.match(index, /class='map_icon_guide_callout_desc'/);
	const varsTsv = read('Root/Config/Vars.tsv');
	const basePhp = read('Root/HTML/Template/Base.php');
	const overlayJs = read('Root/JS/Component/Root/Overlay.js');
	const infoJs = read('Root/JS/Component/Root/Info.js');
	const baseJs = read('Root/JS/Base/Base.js');
	assert.match(varsTsv, /^icon_guide_timeout\t4\s*$/m);
	assert.match(basePhp, /WOLO_ICON_GUIDE_TIMEOUT_MS/);
	assert.match(basePhp, /icon_guide_timeout/);
	assert.match(guideJs, /DECODE_ICON_GUIDE_MAX_LAUNCHES = 2/);
	assert.match(guideJs, /function getDecodeIconGuideHoldMs/);
	assert.match(guideJs, /WOLO_ICON_GUIDE_TIMEOUT_MS/);
	assert.match(guideJs, /function markDecodeIconGuideAwaitingIntro/);
	assert.match(guideJs, /function shouldHoldDecodeIconGuide/);
	assert.match(guideJs, /DECODE_ICON_GUIDE_DISMISS_GRACE_MS/);
	assert.match(baseJs, /markDecodeIconGuideAwaitingIntro/);
	assert.match(infoJs, /clearDecodeIconGuideAwaitingIntro/);
	assert.match(overlayJs, /info_intro/);
	assert.match(guideJs, /wolo-decode-icon-guide-launches/);
	assert.match(guideJs, /wolo-map-icon-guide-launches/);
	assert.match(guideJs, /fadeDecodeIconGuide/);
	assert.match(guideJs, /decodeIconGuideConsumed = true/);
	assert.match(guideJs, /mapIconGuideConsumed = true/);
	assert.match(guideJs, /recordDecodeIconGuideLaunch/);
	assert.match(guideJs, /recordMapIconGuideVisit/);
	assert.match(guideJs, /shouldShowMapIconGuide/);
	assert.match(guideJs, /MAP_ICON_GUIDE_REPLAY_HINT/);
	assert.match(guideJs, /function mapInfocardCalloutTarget/);
	assert.match(guideJs, /MAP_INFOCARD_CALLOUT_END_GAP/);
	assert.match(guideJs, /function requestDecodeIconGuide/);
	assert.doesNotMatch(guideJs, /toggleDecodeView/);
	assert.match(infoPhp, /id='info_show_icon_labels'/);
	assert.match(scriptJs, /function showInfoIconGuide/);
	assert.match(decodeCss, /rgba\(0,\s*0,\s*0,\s*0\.8\)/);
	assert.match(decodeCss, /html\.dark-mode body\.decode-icon-guide:not\(\.osm\)/);
	assert.match(decodeCss, /#map_icon_guide_dim \{[\s\S]*--app-background-wcode/);
	assert.match(mapJs, /map_search_cluster/);
	assert.match(mapJs, /ControlPosition\.TOP_LEFT\]\.push\(searchCluster\)/);
	assert.match(decodeCss, /#map_search_cluster/);
	assert.match(decodeCss, /#map_search_bar/);
	assert.match(decodeCss, /#map_camera_label/);
	assert.match(guideJs, /function layoutMapCameraCaption/);
	assert.match(guideJs, /gmp-internal-camera-control/);
	assert.match(index, /id='map_search_cluster'/);
	assert.match(index, /id='map_city_history_toggle'/);
	const cityJs = read('Root/JS/Component/Root/City.js');
	assert.match(cityJs, /function getDecodeCityHistoryToggles/);
	assert.match(cityJs, /function focusSelectedDecodeCityOnMap/);
	assert.match(scriptJs, /map_city_history_toggle/);
	assert.match(guideJs, /function layoutMapSearchCaptions/);
	assert.match(guideJs, /function raiseMapSearchBarForGuide/);
	assert.match(guideJs, /document\.body\.appendChild\(bar\)/);
	assert.match(guideJs, /style:\s*bar\.getAttribute\('style'\)/);
	assert.match(guideJs, /bar\.setAttribute\('style', home\.style\)/);
	assert.doesNotMatch(guideJs, /bar\.style\.removeProperty\('top'\)/);
	assert.match(guideJs, /function pinGuideCaptionBeside/);
	assert.match(guideJs, /map_icon_guide_dim/);
	assert.match(guideJs, /function layoutMapInfocardGuide/);
	assert.match(guideJs, /drawMapInfocardCalloutLine/);
	assert.doesNotMatch(guideJs, /closest\('#map_stage'\)/);
	assert.doesNotMatch(guideJs, /observe\(mapEl/);
	assert.doesNotMatch(infoCss, /#info_show_icon_labels:hover[\s\S]{0,80}text-decoration:\s*underline/);
	assert.match(decodeCss, /#action_menu_decode \.decode_chrome_caption \{[\s\S]*left:\s*calc\(100% \+ 8px\)/);
	assert.match(decodeCss, /#map_icon_guide_dim/);
	assert.match(decodeCss, /map_icon_guide_world_land/);
	assert.match(decodeCss, /body:not\(\.decode\)\.decode-icon-guide #decode_icon_guide_scrim \.map_icon_guide_world/);
	assert.match(decodeCss, /#map_icon_guide_infocard/);
	assert.match(decodeCss, /\.map_icon_guide_callout_title/);
	assert.match(decodeCss, /\.map_icon_guide_callout_desc/);
	assert.match(decodeCss, /body:not\(\.decode\)\.decode-icon-guide #map_search_cluster/);
	assert.match(decodeCss, /body:not\(\.decode\)\.decode-icon-guide #map_search_bar/);
	assert.match(decodeCss, /body:not\(\.decode\)\.decode-icon-guide #pac-input \{\s*opacity:\s*1;\s*\}/);
	assert.match(decodeCss, /body\.decode-icon-guide #pac-input,\s*body\.decode-icon-guide #decode_input \{\s*caret-color:\s*transparent;\s*\}/);
	assert.match(mapJs, /classList\.contains\('decode-icon-guide'\)/);
	assert.match(guideJs, /function blurInputsForIconGuide/);
	assert.match(guideJs, /blurInputsForIconGuide\(\)/);
	assert.match(guideJs, /scheduleFocusMapSearchInput/);
	assert.doesNotMatch(decodeCss, /body:not\(\.decode\)\.decode-icon-guide #pac-input \{[^}]*background-color:\s*#fff/);
	assert.doesNotMatch(decodeCss, /0 0 0 1px #69B7CF/);
	assert.match(decodeCss, /body:not\(\.decode\)\.decode-icon-guide #decode_button \{[\s\S]*background-color:\s*#fff[\s\S]*#69B7CF/);
	assert.match(themeCss, /html\.dark-mode body:not\(\.decode\)\.decode-icon-guide #decode_button \{[\s\S]*background-color:\s*#222244/);
	assert.doesNotMatch(themeCss, /html\.dark-mode body:not\(\.decode\)\.decode-icon-guide #pac-input \{[\s\S]*background-color:\s*#fff/);
	assert.match(decodeCss, /body\.osm\.decode-icon-guide:not\(\.decode\) #decode_icon_guide_scrim/);
	assert.match(decodeCss, /body\.osm\.decode-icon-guide:not\(\.decode\) #map_icon_guide_dim/);
	assert.match(decodeCss, /--app-background-wcode/);
	assert.match(decodeCss, /#location_button \{[\s\S]*width:\s*39px/);
	assert.doesNotMatch(rootCss, /body:not\(\.decode\) #action_menu_info/);
	assert.match(rootCss, /body:not\(\.decode\) #action_menu_decode \{[\s\S]*left:\s*51px/);
	assert.match(decodeNarrowCss, /max-width:\s*662px/);
});

test('Map Guide restores Google search positioning on wide and narrow layouts', () => {
	const guideJs = read('Root/JS/Component/Root/DecodeIconGuide.js');
	for(const originalStyle of [
		'position: absolute; left: 0px; top: 0px;',
		'position: absolute; left: 0px; top: 64px;'
	]) {
		let currentStyle = 'position: fixed; left: 12px; top: 90px; margin: 0px; z-index: 202;';
		const parent = {
			insertBefore(node) { node.parentNode = this; },
			appendChild(node) { node.parentNode = this; }
		};
		const bar = {
			parentNode: {},
			removeAttribute(name) { if(name === 'style') currentStyle = null; },
			setAttribute(name, value) { if(name === 'style') currentStyle = value; }
		};
		const context = {
			document: { getElementById: id => id === 'map_search_cluster' ? bar : null },
			window: {}
		};
		vm.runInNewContext(guideJs, context);
		context.decodeIconGuideSearchHome = { parent, next: null, style: originalStyle };
		context.restoreMapSearchBarStacking();
		assert.equal(bar.parentNode, parent);
		assert.equal(currentStyle, originalStyle);
	}
});

test('unexpected error dialog uses equal-width actions without an info toggle', () => {
	const exceptionHtml = read('Root/HTML/Fragment/Exception.html');
	const baseScript = read('Root/JS/Base/Script.js');
	const dialogCss = read('Root/CSS/Base/Message_dialog.css');
	assert.match(exceptionHtml, /Oops an error occured!/);
	assert.match(exceptionHtml, /includeSVG\('', 'Warning'\)/);
	assert.match(exceptionHtml, /id='exception_message_title'/);
	assert.match(exceptionHtml, /You may contact our support team\./);
	assert.match(exceptionHtml, /class='exception_support_copy hide'/);
	assert.match(exceptionHtml, /renderMailLink\('support', 'wolo\.codes'/);
	assert.match(exceptionHtml, /Wolo web app crash/);
	assert.match(exceptionHtml, /Mail_link\.php/);
	assert.doesNotMatch(exceptionHtml, /mailto:/);
	assert.doesNotMatch(exceptionHtml, /support@wolo/);
	assert.match(exceptionHtml, /id='exception_dev_controls'/);
	assert.doesNotMatch(exceptionHtml, /Unexpected Error/);
	assert.doesNotMatch(exceptionHtml, /id='exception_message_close'/);
	assert.doesNotMatch(exceptionHtml, /title='Press and hold/);
	assert.doesNotMatch(exceptionHtml, /id='exception_log_toggle'/);
	assert.doesNotMatch(exceptionHtml, />i</);
	assert.doesNotMatch(baseScript, /addLongpressListener\(toggle/);
	assert.doesNotMatch(baseScript, /exception_message_close/);
	assert.match(baseScript, /addLongpressListener\(title, function\(\) \{\}, showExceptionLog\)/);
	assert.match(baseScript, /exception_dev_controls/);
	assert.match(baseScript, /wolo_exception_reload_attempted/);
	assert.match(baseScript, /function setExceptionReloadAttempted/);
	assert.match(baseScript, /function clearExceptionReloadAttempt/);
	assert.match(baseScript, /syncExceptionSupportVisibility/);
	assert.match(baseScript, /setExceptionReloadAttempted\(\);/);
	assert.match(baseScript, /if\(!pendingExceptionLogs\.length\)\s+clearExceptionReloadAttempt\(\);/);
	const mailJs = read('Root/JS/Base/Mail.js');
	assert.match(mailJs, /function revealMailLink/);
	assert.match(mailJs, /function bindMailLinks/);
	const mailHelper = read('Root/HTML/Fragment/Mail_link.php');
	assert.match(mailHelper, /function renderMailLink/);
	assert.match(mailHelper, /data-u=/);
	assert.match(mailHelper, /mail-obf/);
	assert.doesNotMatch(mailHelper, /mailto:/);
	assert.match(dialogCss, /#exception_message \.message_dialog_control button/);
	assert.match(dialogCss, /#exception_prompt_controls/);
	assert.match(dialogCss, /flex-direction:\s*column/);
	assert.match(dialogCss, /\.exception_support_copy/);
	assert.match(dialogCss, /white-space:\s*nowrap/);
	assert.match(dialogCss, /#exception_message \.hide/);
	assert.match(dialogCss, /min\(36rem,\s*calc\(100vw - 24px\)\)/);
	assert.match(dialogCss, /min\(42rem,\s*calc\(100vw - 24px\)\)/);
	assert.match(dialogCss, /#exception_message_title/);
});

test('overlay backdrop click closes dialogs except the crash dialog', () => {
	const overlayJs = read('Root/JS/Component/Root/Overlay.js');
	const baseJs = read('Root/JS/Base/Base.js');
	const overlayCss = read('Root/CSS/Base/Overlay.css');
	const scriptJs = read('Root/JS/Component/Root/Script.js');
	const qrJs = read('Root/JS/Component/Root/QR.js');
	const infoJs = read('Root/JS/Component/Root/Info.js');
	const guideJs = read('Root/JS/Component/Root/DecodeIconGuide.js');
	assert.match(overlayJs, /function onOverlayBackdropClick/);
	assert.match(overlayJs, /function isInfoIntroActive/);
	assert.match(overlayJs, /function isBlockingOverlayDialog/);
	assert.match(overlayJs, /dialog\.id === 'exception_message'/);
	assert.match(overlayJs, /e\.id !== 'info_message'/);
	assert.match(overlayJs, /info_intro/);
	assert.match(infoJs, /intro.classList.add\('hide'\)/);
	assert.match(guideJs, /isInfoIntroActive/);
	assert.match(overlayCss, /#overlay\.overlay \{[\s\S]*z-index:\s*10000/);
	assert.match(overlayJs, /\.message_dialog_close:not\(\.message_dialog_leading_action\):not\(\.hide\)/);
	assert.match(overlayJs, /function unbindOverlayBackdropClick/);
	assert.match(infoJs, /info_intro_close_button/);
	assert.doesNotMatch(baseJs, /if\(set\)\s*\{\s*localStorage\.note_version/);
	assert.match(infoJs, /if\(fromIntroProceed[^\n]*\)\s*localStorage\.note_version = CURRENT_VERSION/);
	assert.match(overlayJs, /function bindOverlayBackdropClick/);
	assert.match(scriptJs, /typeof bindOverlayBackdropClick == 'function'/);
	assert.match(scriptJs, /typeof onOverlayBackdropClick == 'function'/);
	assert.doesNotMatch(scriptJs, /onQROverlayClick/);
	assert.doesNotMatch(qrJs, /onQROverlayClick/);
	assert.doesNotMatch(qrJs, /isQROverlayDismissTarget/);
	assert.match(overlayJs, /function hideOverlay[\s\S]*syncDecodeIconGuide/);
	assert.match(overlayJs, /function showOverlay[\s\S]*hideDecodeIconGuide/);
	assert.doesNotMatch(overlayJs, /function showOverlay[\s\S]*syncDecodeIconGuide/);
});
