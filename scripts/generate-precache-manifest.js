#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const publicDir = path.join(repoRoot, 'public');
const rootDir = path.join(repoRoot, 'Root');
const outputPath = path.join(rootDir, 'precache-manifest.json');

const DEFAULT_ASSETS = [
	'/',
	'/index.html',
	'/root.js',
	'/console.js',
	'/geofire.min.js',
	'/html2canvas.min.js',
	'/sw.js',
	'/precache-manifest.json',
	'/manifest.json',
	'/favicon.svg',
	'/favicon.ico',
	'/apple-touch-icon.png',
	'/offline-data/WordList.json',
	'/launcher-icon-0-75x.png',
	'/launcher-icon-1x.png',
	'/launcher-icon-1-5x.png',
	'/launcher-icon-2x.png',
	'/launcher-icon-3x.png',
	'/launcher-icon-4x.png'
];

const HASHED_BUNDLE_PATTERN = /(?:src|href)=['"](\/(?:root|console)-[a-zA-Z0-9_-]+\.min\.(?:js|css))['"]/g;

function readText(filePath) {
	try {
		return fs.readFileSync(filePath, 'utf8');
	} catch (error) {
		return '';
	}
}

function collectHashedBundles(html) {
	const assets = [];
	let match;
	while ((match = HASHED_BUNDLE_PATTERN.exec(html)) !== null) {
		assets.push(match[1]);
	}
	return assets;
}

function collectPublicAssets() {
	if (!fs.existsSync(publicDir)) {
		return [];
	}

	const assets = [];
	const walk = (dir, prefix) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walk(fullPath, prefix + '/' + entry.name);
				continue;
			}
			const ext = path.extname(entry.name).toLowerCase();
			if (!['.js', '.css', '.html', '.json', '.svg', '.png', '.ico', '.woff', '.woff2'].includes(ext)) {
				continue;
			}
			const relative = prefix + '/' + entry.name;
			assets.push(relative.replace(/\/+/g, '/'));
		}
	};
	walk(publicDir, '');
	return assets;
}

function uniqueSorted(items) {
	return Array.from(new Set(items.filter(Boolean))).sort();
}

function main() {
	const assets = [...DEFAULT_ASSETS];
	const indexHtml = readText(path.join(publicDir, 'index.html'));
	assets.push(...collectHashedBundles(indexHtml));

	for (const file of fs.readdirSync(publicDir)) {
		if (/^root-.*\.min\.js$/.test(file) || /^console-.*\.min\.js$/.test(file)) {
			assets.push('/' + file);
		}
		if (/^root-.*\.min\.css$/.test(file) || /^console-.*\.min\.css$/.test(file)) {
			assets.push('/' + file);
		}
	}

	assets.push(...collectPublicAssets());

	const manifest = {
		version: process.env.WOLO_SW_CACHE_VERSION || 'wolo-offline-v1',
		generatedAt: new Date().toISOString(),
		assets: uniqueSorted(assets)
	};

	fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n');
	console.log('Wrote ' + outputPath + ' with ' + manifest.assets.length + ' assets');
}

main();
