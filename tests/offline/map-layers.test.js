'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

test('map layer module defines OSM tile endpoint and layer helpers', () => {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	assert.match(mapLayers, /MAP_LAYER_OSM/);
	assert.match(mapLayers, /tile\.openstreetmap\.org/);
	assert.match(mapLayers, /function setMapLayer/);
});

test('ensureMapViewForLocation leaves decode view for map layers', () => {
	const mapLayers = read('Root/JS/Component/Root/MapLayers.js');
	assert.match(mapLayers, /function ensureMapViewForLocation/);
	assert.match(mapLayers, /classList\.contains\('decode'\)/);
	assert.match(mapLayers, /classList\.remove\('decode'\)/);
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
	assert.match(mapLayers, /arcgisonline\.com/);
	assert.match(mapLayers, /virtualearth\.net/);
	assert.match(selector, /data-map-source='google'/);
	assert.match(selector, /data-map-source='osm'/);
	assert.match(selector, /data-map-source='apple'/);
	assert.match(selector, /data-map-source='esri'/);
	assert.match(selector, /data-map-source='microsoft'/);
	assert.match(selector, /map-source-toggle/);
	assert.match(selector, /map-source-default/);
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
	assert.match(utilJs, /function looksLikePlusCode/);
	assert.match(utilJs, /syncDecodeInputCaseSource/);
});

test('decode and map inputs uppercase DIGIPIN and plus-code values with CSS', () => {
	const index = read('Root/HTML/Component/Root/Index.php');
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
	assert.match(dialogCss, /column-gap:\s*16px/);
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
});

test('root index exposes OSM, Apple, Esri, and Microsoft map icons and attribution', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	assert.match(index, /map_type_icon_osm/);
	assert.match(index, /map_type_icon_apple/);
	assert.match(index, /map_type_icon_esri/);
	assert.match(index, /map_type_icon_microsoft/);
	assert.match(index, /osm_attribution/);
	assert.match(index, /id='apple_map'/);
	assert.match(index, /id='map_stage'/);
	assert.match(index, /esri_attribution/);
	assert.match(index, /microsoft_attribution/);
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
	const index = read('Root/HTML/Component/Root/Index.php');
	assert.match(index, /id='location_button'[\s\S]*title='Locate'/);
	assert.match(index, /id='decode_button'[\s\S]*title='Go'/);
	assert.match(index, /id='action_menu_toggle'[\s\S]*title='Actions'/);
	assert.match(index, /id='account'[\s\S]*title='Account'/);
});
