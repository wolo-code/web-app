'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');
const { incrementBuildTsv, incrementBuildFile } = require('../../scripts/increment-build-number.js');

test('increments an existing build row', () => {
	const result = incrementBuildTsv('version\t1.1.1\nbuild\t7\n');
	assert.equal(result.build, 8);
	assert.equal(result.text, 'version\t1.1.1\nbuild\t8\n');
});

test('inserts build after version when missing', () => {
	const result = incrementBuildTsv('version\t1.1.1\nauthor\tWolo\n');
	assert.equal(result.build, 1);
	assert.equal(result.text, 'version\t1.1.1\nbuild\t1\nauthor\tWolo\n');
});

test('preserves CRLF in Vars.tsv', () => {
	const result = incrementBuildTsv('version\t1.1.1\r\nbuild\t1\r\n');
	assert.equal(result.build, 2);
	assert.equal(result.text, 'version\t1.1.1\r\nbuild\t2\r\n');
});

test('writes the next build to a file', () => {
	const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wolo-build-'));
	const filePath = path.join(dir, 'Vars.tsv');
	fs.writeFileSync(filePath, 'version\t1.1.1\nbuild\t3\n');
	assert.equal(incrementBuildFile(filePath), 4);
	assert.equal(fs.readFileSync(filePath, 'utf8'), 'version\t1.1.1\nbuild\t4\n');
});

test('Vars.tsv has a numeric build row', () => {
	const vars = fs.readFileSync(path.join(repoRoot, 'Root', 'Config', 'Vars.tsv'), 'utf8');
	const match = vars.match(/^build\t(\d+)\s*$/m);
	assert.ok(match, 'Vars.tsv must define build');
	assert.ok(Number.parseInt(match[1], 10) >= 1);
});

test('Info fragments show formatted version plus build', () => {
	const info = fs.readFileSync(path.join(repoRoot, 'Root', 'HTML', 'Fragment', 'Info.php'), 'utf8');
	const links = fs.readFileSync(path.join(repoRoot, 'Root', 'HTML', 'Fragment', 'Info_links.php'), 'utf8');
	const config = fs.readFileSync(path.join(repoRoot, 'Root', 'Framework', 'API', 'Config.php'), 'utf8');
	assert.match(config, /function formatAppVersion/);
	assert.match(info, /formatAppVersion\(\$config\)/);
	assert.match(links, /formatAppVersion\(\$config\)/);
});
