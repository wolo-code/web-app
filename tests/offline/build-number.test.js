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

test('Info corner version is restored and credits modal omits version details', () => {
	const info = fs.readFileSync(path.join(repoRoot, 'Root', 'HTML', 'Fragment', 'Info.php'), 'utf8');
	const links = fs.readFileSync(path.join(repoRoot, 'Root', 'HTML', 'Fragment', 'Info_links.php'), 'utf8');
	const infoJs = fs.readFileSync(path.join(repoRoot, 'Root', 'JS', 'Component', 'Root', 'Info.js'), 'utf8');
	const rootJs = fs.readFileSync(path.join(repoRoot, 'Root', 'JS', 'Component', 'Root', 'Script.js'), 'utf8');
	const infoCss = fs.readFileSync(path.join(repoRoot, 'Root', 'CSS', 'Component', 'Root', 'Base', 'Info.css'), 'utf8');
	assert.match(info, /info_version_indicator/);
	assert.match(info, /\$appVersionShortLabel/);
	assert.match(info, /info_version_under/);
	assert.match(info, /info_version_stamp_utc/);
	assert.match(info, /info_version_stamp_elapsed/);
	assert.match(info, /info_version_local/);
	assert.match(info, /info_version_width/);
	assert.doesNotMatch(info, /aria-label='Version'/);
	assert.match(infoJs, /function fillInfoVersionStamps/);
	assert.match(infoJs, /function formatInfoTimestamp/);
	assert.match(infoJs, /function formatInfoElapsed/);
	assert.match(infoCss, /#info_version_indicator:hover \.info_version_width/);
	assert.match(infoCss, /#info_version_indicator:hover \.info_version_stamp_utc/);
	assert.match(infoCss, /#info_version_indicator\[aria-expanded='true'\] \.info_version_width/);
	assert.match(infoCss, /#info_version_indicator\[aria-expanded='true'\] \.info_version_local/);
	assert.match(infoCss, /#info_version_indicator \.info_version_under:hover \.info_version_stamp_elapsed/);
	assert.doesNotMatch(infoCss, /#info_version_indicator:hover \.info_version_local/);
	assert.doesNotMatch(links, /software_info/);
	assert.doesNotMatch(links, /info_version_value/);
	assert.doesNotMatch(links, /updated-timestamp/);
	assert.match(infoJs, /function toggleInfoVersionDisplay/);
	assert.match(rootJs, /info_version_indicator/);
	assert.doesNotMatch(rootJs, /info_version_value/);
	assert.match(info, /id='info_show_icon_labels'/);
	assert.match(info, /show guide/);
	assert.match(infoCss, /#info_links:not\(\.hide\)\s*~\s*#info_show_icon_labels/);
	assert.match(infoCss, /#info_message:has\(#info_links:not\(\.hide\)\)\s*#info_version_indicator/);
});
