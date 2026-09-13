#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function detectNewline(text) {
	return text.includes('\r\n') ? '\r\n' : '\n';
}

function incrementBuildTsv(text) {
	const newline = detectNewline(text);
	const hadTrailingNewline = /\r?\n$/.test(text);
	const lines = text.split(/\r?\n/);
	if (lines.length && lines[lines.length - 1] === '') {
		lines.pop();
	}

	let found = false;
	let build = 1;
	const next = lines.map((line) => {
		if (!/^build\t/.test(line)) {
			return line;
		}
		found = true;
		const current = Number.parseInt(String(line.split('\t')[1] || '').trim(), 10);
		if (!Number.isFinite(current) || current < 0) {
			throw new Error('Invalid build number: ' + line);
		}
		build = current + 1;
		return 'build\t' + build;
	});

	if (!found) {
		build = 1;
		const versionIdx = next.findIndex((line) => /^version\t/.test(line));
		const insertAt = versionIdx >= 0 ? versionIdx + 1 : next.length;
		next.splice(insertAt, 0, 'build\t' + build);
	}

	let out = next.join(newline);
	if (hadTrailingNewline || text === '') {
		out += newline;
	}
	return { text: out, build };
}

function incrementBuildFile(filePath) {
	const resolved = path.resolve(filePath);
	const original = fs.readFileSync(resolved, 'utf8');
	const result = incrementBuildTsv(original);
	fs.writeFileSync(resolved, result.text);
	return result.build;
}

module.exports = {
	incrementBuildTsv,
	incrementBuildFile
};

if (require.main === module) {
	const varsPath = process.argv[2]
		? path.resolve(process.argv[2])
		: path.resolve(__dirname, '..', 'Root', 'Config', 'Vars.tsv');
	const build = incrementBuildFile(varsPath);
	console.log('Build number: ' + build);
}
