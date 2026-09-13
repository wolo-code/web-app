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
	assert.match(infoLinks, /indiapost\.gov\.in\/digipin/);
	assert.match(infoLinks, /renderMailLink\('ujjwal', 'wolo\.codes'/);
	assert.match(infoLinks, /Mail_link\.php/);
	assert.doesNotMatch(infoLinks, /mailto:/);
	assert.doesNotMatch(infoLinks, /ujjwal@wolo/);
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
	assert.match(rootCss, /\.map_attribution \{[\s\S]*left:\s*70px/);
	assert.match(rootCss, /@media \(max-width:\s*662px\) \{[\s\S]*\.map_attribution \{[\s\S]*left:\s*66px/);
	assert.doesNotMatch(rootCss, /#action_menu\.open\) \.map_attribution/);
	assert.match(narrowCss, /\.map_attribution \{[\s\S]*left:\s*66px/);
	assert.match(narrowCss, /max-width:\s*calc\(50vw - 120px\)/);
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
	assert.match(index, /id='decode_button'[\s\S]*title='Go'/);
	assert.match(index, /id='action_menu_info'[\s\S]*title='Info'/);
	assert.match(index, /id='account'[\s\S]*title='Account'/);
});

test('Wolo Code Input View has first-launch icon captions', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	const guideJs = read('Root/JS/Component/Root/DecodeIconGuide.js');
	const infoFull = read('Root/HTML/Fragment/Info_full.php');
	const infoJs = read('Root/JS/Component/Root/Info.js');
	const decodeCss = read('Root/CSS/Component/Root/Base/Decode.css');
	const decodeNarrowCss = read('Root/CSS/Component/Root/Base/Decode_narrow.css');
	assert.match(index, /class='decode_icon_caption'[\s\S]*IP city/);
	assert.match(index, /class='decode_icon_caption'[\s\S]*GPS city/);
	assert.match(index, /class='decode_icon_caption'[\s\S]*Previous/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Account/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Info/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Locate/);
	assert.match(index, /class='decode_icon_caption decode_chrome_caption'[\s\S]*Map/);
	assert.match(index, /id='decode_icon_guide_scrim'/);
	assert.match(guideJs, /DECODE_ICON_GUIDE_MAX_LAUNCHES = 2/);
	assert.match(guideJs, /DECODE_ICON_GUIDE_HOLD_MS = 3000/);
	assert.match(guideJs, /DECODE_ICON_GUIDE_DISMISS_GRACE_MS/);
	assert.match(guideJs, /wolo-decode-icon-guide-launches/);
	assert.match(guideJs, /fadeDecodeIconGuide/);
	assert.match(guideJs, /decodeIconGuideConsumed = true/);
	assert.match(guideJs, /recordDecodeIconGuideLaunch/);
	assert.match(guideJs, /function requestDecodeIconGuide/);
	assert.match(infoFull, /id='info_show_icon_labels'/);
	assert.match(infoJs, /function showInfoIconGuide/);
	assert.match(decodeCss, /rgba\(0,\s*0,\s*0,\s*0\.8\)/);
	assert.match(decodeCss, /\.decode\.decode-icon-guide \.decode_icon_caption/);
	assert.match(decodeNarrowCss, /max-width:\s*662px/);
});

test('unexpected error dialog uses equal-width actions without an info toggle', () => {
	const exceptionHtml = read('Root/HTML/Fragment/Exception.html');
	const baseScript = read('Root/JS/Base/Script.js');
	const dialogCss = read('Root/CSS/Base/Message_dialog.css');
	assert.match(exceptionHtml, /Oops an error occured!/);
	assert.match(exceptionHtml, /includeSVG\('', 'Warning'\)/);
	assert.match(exceptionHtml, /id='exception_message_title'/);
	assert.match(exceptionHtml, /You may contact our support team\./);
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
	assert.match(dialogCss, /#exception_message \.hide/);
	assert.match(dialogCss, /min\(42rem,\s*calc\(100vw - 24px\)\)/);
	assert.match(dialogCss, /#exception_message_title/);
});
