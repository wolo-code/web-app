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

test('map view toggle cycles roadmap, satellite, and osm', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	assert.match(mapJs, /setMapLayer\(MAP_LAYER_OSM\)/);
	assert.match(mapJs, /setMapLayer\(MAP_LAYER_ROADMAP\)/);
	assert.match(mapJs, /setMapLayer\(MAP_LAYER_SATELLITE\)/);
});

test('decode flow recognizes DIGIPIN input', () => {
	const mapJs = read('Root/JS/Component/Root/Map.js');
	assert.match(mapJs, /execDecodeDigipin/);
	assert.match(mapJs, /digipin\.looksLikeDigipin/);
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
