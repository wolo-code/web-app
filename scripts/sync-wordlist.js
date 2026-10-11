#!/usr/bin/env node
'use strict';

/**
 * Synchronizes Wolo's offline WordList.json from the canonical source:
 * https://wordlist.wcodes.org/wordlist.json
 *
 * Preserves Wolo's backward-compatible alias schema: [ [primaryWord, ...aliases], ... ]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const WORDLIST_URL = 'https://wordlist.wcodes.org/wordlist.json';
const appRepoRoot = path.resolve(__dirname, '..');

const TARGET_FILES = [
  path.join(appRepoRoot, 'Database', 'WordList.json'),
  path.join(appRepoRoot, 'Root', 'Files', 'offline-data', 'WordList.json'),
  path.join(appRepoRoot, 'Root', 'offline-data', 'WordList.json')
];

function fetchWordlist(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        return reject(new Error(`Failed to fetch ${url}: HTTP status ${res.statusCode}`));
      }
      let rawData = '';
      res.on('data', chunk => rawData += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(rawData));
        } catch (err) {
          reject(new Error(`Failed to parse wordlist JSON: ${err.message}`));
        }
      });
    }).on('error', reject);
  });
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
  console.log(`[sync-wordlist] Fetching canonical wordlist from ${WORDLIST_URL}...`);
  const rawWords = await fetchWordlist(WORDLIST_URL);

  if (!Array.isArray(rawWords) || rawWords.length !== 1024) {
    throw new Error(`[sync-wordlist] Expected 1024 words, but got ${rawWords?.length}`);
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

  const woloWords = rawWords.map((word, index) => {
    const cleanWord = typeof word === 'string' ? word.trim().toLowerCase() : word[0];
    const existingEntry = existingDb[index];
    if (Array.isArray(existingEntry) && existingEntry.length > 1) {
      // Retain existing aliases while ensuring canonical word is primary
      const aliases = existingEntry.slice(1).filter(alias => alias !== cleanWord);
      return [cleanWord, ...aliases];
    }
    return [cleanWord];
  });

  const formattedJson = formatWoloWordList(woloWords);

  for (const targetPath of TARGET_FILES) {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(targetPath, formattedJson, 'utf8');
    console.log(`[sync-wordlist] Updated: ${targetPath}`);
  }

  console.log(`[sync-wordlist] Successfully synchronized 1,024 words across Wolo targets.`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
