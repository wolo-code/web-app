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

test('map view toggle cycles roadmap, satellite, and osm', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	assert.match(mapJs, /setMapLayer\(MAP_LAYER_OSM\)/);
	assert.match(mapJs, /setMapLayer\(MAP_LAYER_ROADMAP\)/);
	assert.match(mapJs, /setMapLayer\(MAP_LAYER_SATELLITE\)/);
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
	assert.match(index, /Invalid_code\.php/);
	assert.match(index, /decode_input_alt_tip/);
	assert.match(fragment, /invalid_code_correct/);
	assert.match(fragment, /invalid_code_search/);
	assert.match(fragment, /includeSVG\('', 'Reverse'\)/);
	assert.match(fragment, /includeSVG\('', 'Proceed'\)/);
});

test('info links include OSM and DIGIPIN attribution', () => {
	const infoLinks = read('Root/HTML/Fragment/Info_links.php');
	assert.match(infoLinks, /openstreetmap\.org\/copyright/);
	assert.match(infoLinks, /indiapost\.gov\.in\/digipin/);
});

test('root index exposes OSM map icon and attribution element', () => {
	const index = read('root/HTML/Component/Root/Index.php');
	assert.match(index, /map_type_icon_osm/);
	assert.match(index, /osm_attribution/);
});
