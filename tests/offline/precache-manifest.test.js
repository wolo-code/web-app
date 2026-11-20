'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
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
	assert.ok(manifest.assets.includes('/tesseract/tesseract.min.js'));
	assert.ok(manifest.assets.includes('/tesseract/worker.min.js'));
	assert.ok(manifest.assets.includes('/tesseract/tesseract-core.wasm.min.js'));
	assert.ok(manifest.assets.includes('/tesseract/lang/eng.traineddata.gz'));
});

test('precache manifest generator discovers hashed bundles from public index', () => {
	const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wolo-precache-'));
 const temporaryManifest = path.join(publicDir, 'manifest-output.json');
	fs.mkdirSync(publicDir, { recursive: true });
	const indexPath = path.join(publicDir, 'index.html');
	const bundleName = 'root-deadbeef.min.js';
	fs.writeFileSync(indexPath, `<!doctype html><script src="/${bundleName}"></script>`);
	fs.writeFileSync(path.join(publicDir, bundleName), 'console.log("bundle");');

	const result = spawnSync(process.execPath, ['scripts/generate-precache-manifest.js', '--public-dir', publicDir, '--output', temporaryManifest], {
		cwd: repoRoot,
		encoding: 'utf8'
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);

	const generated = JSON.parse(fs.readFileSync(temporaryManifest, 'utf8'));
	assert.ok(generated.assets.includes('/' + bundleName));

	fs.rmSync(publicDir, { recursive: true, force: true });
});

test('precache generator publishes directory index JSON at the flat .json URL', () => {
	const publicDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wolo-json-alias-'));
	const temporaryManifest = path.join(publicDir, 'manifest-output.json');
	const paper = { title: 'Technical Paper', content: '<p>Paper</p>' };
	fs.mkdirSync(path.join(publicDir, 'paper'), { recursive: true });
	fs.mkdirSync(path.join(publicDir, 'menu'), { recursive: true });
	fs.mkdirSync(path.join(publicDir, 'about'), { recursive: true });
	fs.writeFileSync(path.join(publicDir, 'index.html'), '<!doctype html>');
	fs.writeFileSync(path.join(publicDir, 'paper', 'index.json'), JSON.stringify(paper));
	fs.writeFileSync(path.join(publicDir, 'menu', 'index.json'), JSON.stringify({ title: 'Menu' }));
	fs.writeFileSync(path.join(publicDir, 'menu.json'), '<!DOCTYPE html><html></html>');
	fs.writeFileSync(path.join(publicDir, 'about', 'index.json'), JSON.stringify({ title: 'Directory' }));
	fs.writeFileSync(path.join(publicDir, 'about.json'), JSON.stringify({ title: 'Flat' }));
	fs.mkdirSync(path.join(publicDir, 'labels'), { recursive: true });
	fs.writeFileSync(path.join(publicDir, 'labels', 'index.json'), '<!doctype html>');

	const result = spawnSync(process.execPath, [
		'scripts/generate-precache-manifest.js',
		'--public-dir', publicDir,
		'--output', temporaryManifest
	], {
		cwd: repoRoot,
		encoding: 'utf8'
	});
	assert.equal(result.status, 0, result.stderr || result.stdout);

	assert.deepEqual(JSON.parse(fs.readFileSync(path.join(publicDir, 'paper.json'), 'utf8')), paper);
	assert.equal(JSON.parse(fs.readFileSync(path.join(publicDir, 'menu.json'), 'utf8')).title, 'Menu');
	assert.equal(JSON.parse(fs.readFileSync(path.join(publicDir, 'about.json'), 'utf8')).title, 'Flat');
	assert.equal(fs.existsSync(path.join(publicDir, 'labels.json')), false);
	const generated = JSON.parse(fs.readFileSync(temporaryManifest, 'utf8'));
	assert.ok(generated.assets.includes('/paper.json'));

	fs.rmSync(publicDir, { recursive: true, force: true });
});
