#!/usr/bin/env node
'use strict';

/**
 * Synchronizes Wolo's offline WordList.json from the canonical source:
 * https://wordlist.wcodes.org/wordlist.json (+ aliases.json from v4)
 *
 * Preserves Wolo's backward-compatible alias schema: [ [primaryWord, ...aliases], ... ]
 * Accepts the canonical list as a plain array (v3) or { version, words } (v4+).
 * Retired words (aliases.json) and every word a slot held before stay as aliases,
 * so older codes keep decoding; the first entry is always the current word.
 *
 * WORDLIST_SOURCE overrides the source: a base URL or a local checkout of
 * wcodes-org/wordlist (e.g. D:\WCode\Wordlist\Project).
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { mergeCanonicalWordList, normalizeCanonicalWordList } = require('../Root/JS/Component/Root/Code/WordList.js');

const WORDLIST_BASE = process.env.WORDLIST_SOURCE || 'https://wordlist.wcodes.org';
const appRepoRoot = path.resolve(__dirname, '..');

const TARGET_FILES = [
  path.join(appRepoRoot, 'Database', 'WordList.json'),
  path.join(appRepoRoot, 'Root', 'Files', 'offline-data', 'WordList.json'),
  path.join(appRepoRoot, 'Root', 'offline-data', 'WordList.json')
];

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        return reject(new Error(`Failed to fetch ${url}: HTTP status ${res.statusCode}`));
      }
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (err) {
          reject(new Error(`Failed to parse ${url}: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
}

function readSource(name) {
  if (/^https?:\/\//i.test(WORDLIST_BASE)) {
    return fetchJson(WORDLIST_BASE.replace(/\/+$/, '') + '/' + name);
  }
  return Promise.resolve(JSON.parse(fs.readFileSync(path.join(WORDLIST_BASE, name), 'utf8')));
}

function formatWoloWordList(woloWords) {
  const lines = ['[', '\t'];
  for (let i = 0; i < woloWords.length; i++) {
    const entry = woloWords[i];
    const itemStr = '\t' + JSON.stringify(entry) + (i === woloWords.length - 1 ? '' : ',');
    lines.push(itemStr);
  }
  lines.push(']');
  return lines.join('\n') + '\n';
}

async function main() {
  console.log(`[sync-wordlist] Reading canonical wordlist from ${WORDLIST_BASE}...`);
  const raw = await readSource('wordlist.json');
  const canon = normalizeCanonicalWordList(raw);
  if (!canon) {
    throw new Error('[sync-wordlist] Expected 1024 words (plain array or { version, words })');
  }
  // From v4 on, retired words must be known, or old codes using them would stop decoding.
  const aliases = canon.version >= 4 ? await readSource('aliases.json') : null;
  if (canon.version >= 4 && (!aliases || aliases.version !== canon.version || typeof aliases.retired !== 'object')) {
    throw new Error(`[sync-wordlist] aliases.json missing or not version ${canon.version}`);
  }

  // Preserve existing aliases if present in Database/WordList.json
  const mainDbPath = TARGET_FILES[0];
  let existingDb = [];
  try {
    if (fs.existsSync(mainDbPath)) {
      existingDb = JSON.parse(fs.readFileSync(mainDbPath, 'utf8'));
    }
  } catch (e) {
    existingDb = [];
  }

  const woloWords = mergeCanonicalWordList(canon, aliases, existingDb);
  const formattedJson = formatWoloWordList(woloWords);

  for (const targetPath of TARGET_FILES) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, formattedJson, 'utf8');
    console.log(`[sync-wordlist] Updated: ${targetPath}`);
  }

  const aliasCount = woloWords.reduce((n, slot) => n + slot.length - 1, 0);
  console.log(`[sync-wordlist] Synchronized wordlist v${canon.version}: 1,024 words, ${aliasCount} legacy aliases.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
