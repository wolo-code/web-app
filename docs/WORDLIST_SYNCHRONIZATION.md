# Canonical Wordlist & Synchronization Architecture

This document outlines the architecture for the 1,024-word Base-1024 dictionary used across Wolo Code and WCode, eliminating dictionary drift across apps and platforms.

## Single Source of Truth (`wordlist.wcodes.org`)

The canonical wordlist is managed and version-controlled in the dedicated upstream repository:
- **Repository**: [`wcodes-org/wordlist`](https://github.com/wcodes-org/wordlist)
- **Deployment**: Hosted via **Cloudflare Pages** at [**`https://wordlist.wcodes.org`**](https://wordlist.wcodes.org)
- **Zero Cost & Global Edge**: Leverages Cloudflare Pages and Edge CDN with `Access-Control-Allow-Origin: *` CORS headers and edge caching.

### Canonical Endpoints
- `GET /wordlist.json` &rarr; Clean array of 1,024 words (`["act", "actor", ...]`)
- `GET /wordlist.js` &rarr; Universal standalone browser SDK exposing `window.WCodeDictionary`
- `GET /wordlist.txt` &rarr; Plain newline-delimited list for CLI / asset ingestion
- `GET /Wordlist.tsv` &rarr; Master categorized TSV with metadata and emojis
- `GET /Wordlist-black.tsv` &rarr; Blacklisted / discarded words table

---

## Wolo Pipeline Integration

Wolo Code is an offline-first PWA that requires the dictionary locally in IndexedDB and Service Worker cache.

### Build-Time Pipeline Sync
Before baking the app during `project/render-native.ps1` (dev or prod):
1. **Runner**: Calls `app/project/scripts/sync-wordlist.js`.
2. **Fetch**: Pulls `https://wordlist.wcodes.org/wordlist.json`.
3. **Backward Compatibility Preservation**: Validates the 1,024-word count and retains any secondary alias entries in Wolo's nested format:
   ```json
   [
       ["canonicalWord", "legacyAlias1"]
   ]
   ```
4. **Target Updates**: Synchronizes the three offline data files in lockstep:
   - `app/project/Database/WordList.json`
   - `app/project/Root/Files/offline-data/WordList.json`
   - `app/project/Root/offline-data/WordList.json`
5. **Offline Fallback**: If offline during a local bake, `render-native.ps1` catches the network error, prints a warning, and builds using the existing cached `WordList.json`.

---

## Runtime Immediate Background Revalidation

To ensure dictionary updates propagate to existing active client browsers immediately without waiting for a re-bake:
- **Instant Boot**: On app launch, `initOfflineWordList()` in `OfflineStore.js` boots synchronously from the local IndexedDB snapshot (0ms latency, zero offline blocking).
- **Non-blocking Background Check**: Immediately kicks off `syncCanonicalWordListInBackground()`, which queries `https://wordlist.wcodes.org/wordlist.json` with `{ cache: 'no-cache' }`.
- **Hot Swap**: If a change is detected at the Cloudflare edge, it updates the in-memory `wordList` and writes the new snapshot directly to IndexedDB.
- **Replaces Realtime Database**: Replaces the retired Firebase RTDB `/WordList` subscription with a standard, free HTTP conditional edge fetch, eliminating permanent WebSocket listener overhead and RTDB bandwidth costs.

---

## Backward Compatibility Model in Wolo

Wolo's runtime decoder in `Root/JS/Component/Root/Code/WordList.js` supports aliases within each slot:
- **Encoding**: Uses `curList[index] = subList[0]` (the primary canonical word).
- **Decoding**: Scans `wordList[index].indexOf(word)` across all aliases in that slot.
- If a word is retired in the future, adding it as a secondary element in its corresponding slot allows legacy codes to continue decoding indefinitely without breaking.
