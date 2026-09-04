'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const repoRoot = path.resolve(__dirname, '..', '..');
const manifestPath = path.join(repoRoot, 'Root', 'precache-manifest.json');

test('precache manifest includes core offline shell assets', () => {
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	assert.ok(Array.isArray(manifest.assets));
	assert.ok(manifest.assets.includes('/sw.js'));
	assert.ok(manifest.assets.includes('/root.js'));
	assert.ok(manifest.assets.includes('/offline-data/WordList.json'));
	assert.ok(manifest.assets.includes('/precache-manifest.json'));
});

test('precache manifest generator discovers hashed bundles from public index', () => {
	const publicDir = path.join(repoRoot, 'public');
	fs.mkdirSync(publicDir, { recursive: true });
	const indexPath = path.join(publicDir, 'index.html');
	const bundleName = 'root-deadbeef.min.js';
	fs.writeFileSync(indexPath, `<!doctype html><script src="/${bundleName}"></script>`);
	fs.writeFileSync(path.join(publicDir, bundleName), 'console.log("bundle");');

	const result = spawnSync(process.execPath, ['scripts/generate-precache-manifest.js'], {
		cwd: repoRoot,
		encoding: 'utf8'
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);

	const generated = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	assert.ok(generated.assets.includes('/' + bundleName));

	fs.rmSync(indexPath, { force: true });
	fs.rmSync(path.join(publicDir, bundleName), { force: true });
});
