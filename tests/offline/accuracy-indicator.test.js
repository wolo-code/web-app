'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..', '..');

function read(filePath) {
	return fs.readFileSync(path.join(repoRoot, filePath), 'utf8');
}

test('accuracy strip keeps a fixed layout and flattened proceed control', () => {
	const css = read('Root/CSS/Component/Root/Base/Accuracy.css');
	const html = read('Root/HTML/Fragment/Accuracy.php');

	assert.match(css, /#accuracy_container > div \{[\s\S]*display:\s*inline-flex/);
	assert.match(css, /#accuracy_container > div \{[\s\S]*align-items:\s*center/);
	assert.match(css, /#accuracy_container > div \{[\s\S]*height:\s*32px/);
	assert.match(css, /#accuracy_container\.highlight > div \{\s*background-color:\s*#FFFFFF;\s*\}/);
	assert.doesNotMatch(css, /#accuracy_container\.highlight > div \{[^}]*padding-right/);
	assert.match(css, /#accuracy_meter \{[\s\S]*width:\s*3ch/);
	assert.match(css, /#accuracy_meter_unit \{[\s\S]*padding-left:\s*0\.25em/);
	assert.match(css, /#accuracy_container #proceed_container\.hide \{[\s\S]*visibility:\s*hidden/);
	assert.match(css, /#accuracy_container #proceed_container\.hide \{[\s\S]*display:\s*inline-flex\s*!important/);
	assert.match(css, /#proceed_button \{[\s\S]*box-shadow:\s*none/);
	assert.match(css, /#proceed_button \{[\s\S]*background:\s*transparent/);
	assert.match(css, /#proceed_button \{[\s\S]*height:\s*100%/);
	assert.match(css, /#proceed_label \{[\s\S]*top:\s*0/);
	assert.match(html, /class='proceed_label_icon'/);
	assert.doesNotMatch(html, /id='proceed_label_icon'/);
});
