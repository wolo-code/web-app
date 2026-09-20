# On-device Wolo Code label scanning

The web app can read printed Wolo Code labels (city + three words) from the device camera. OCR runs entirely in the browser; no image frames are uploaded.

## Where to find it

- **Decode view:** tap **Scan** in the city-source row (next to IP city / GPS city / Previous).
- **Map view:** tap **Scan** next to the search bar (beside Previous).

## Scan flow

1. **Live preview** — rear camera while the scan dialog is open; processing stays on-device.
2. **Detection mode** — **Fixed 3:1** (default) shows a label-shaped frame and reads the centered crop; **General** reads the full frame. Switching modes resets auto-capture stability; **Retake** keeps the current mode.
3. **Capture** — tap the shutter button, or hold steady until the scanner auto-captures when a valid code is stable. Live preview does not dump raw OCR text as the final result.
4. **Review** — edit the detected city (optional) and three Wolo words before decoding. Extra printed text (names, addresses) is stripped by the matcher; fields remain editable.
5. **Confirm** — fills `#decode_input` and calls `decode_input_from_form()` from Wolo Code Input View, or fills `#pac-input` and calls `decode_input_from_map()` from Map View.
6. **Retake** — returns to live preview in the same detection mode. **Type instead** and close still exit to manual entry.

**Use photo instead** follows the same capture → review → confirm path (no immediate auto-decode).

## How to verify manually

1. Open [wolo.codes](https://wolo.codes) on a phone (Android Chrome is the primary target; iOS Safari is best-effort).
2. Switch to the Wolo Code input view or stay on the map and tap **Scan**.
3. Allow camera access when prompted.
4. Point the rear camera at a printed label that shows a city and three Wolo words (no QR required).
5. Tap the shutter, or hold steady until auto-capture triggers.
6. On the review screen, confirm or edit city + three words, then tap **Confirm**. The app should decode to the map.
7. Tap **Retake** and confirm live preview resumes with the same detection mode.
8. Confirm the bottom notification area never mentions uploading images, and network traffic does not include image uploads during scanning.

### Without a physical label

Use any on-screen or printed sample with a valid code, for example:

```
Bengaluru
cat apple tomato
```

You can also generate a label from the app (Label / QR dialog) and scan the three words printed in the center.

## Fallbacks

- **Camera denied or unavailable:** use **Use photo instead** (still processed on-device, then review) or **Type instead**.
- **Unsupported browser:** same photo/type fallbacks.
- **Low-confidence OCR:** keep the label flat, well lit, and centered; try **General** mode or **Use photo instead**; or type the code manually on the review screen.

## Technical notes

- OCR engine: [Tesseract.js](https://github.com/naptha/tesseract.js) v5.1.1, self-hosted under `/tesseract/` (`tesseract.min.js`, `worker.min.js`, `tesseract-core.wasm.min.js`, and `lang/eng.traineddata.gz`). Lazy-loaded when Scan is opened; assets are precached by the service worker for offline use. Bake copies them via `Config/URL.tsv` Path column (`tesseract/`, `tesseract/lang/`).
- Matching: `CodeScanOcrMatch.js` normalizes OCR text, fuzzy-matches tokens against the live 1024-word list, and exposes review helpers (`splitMatchForReview`, `buildCodeFromReview`, `validateReviewWords`).
- UI states: `CodeScan.js` phases are `live` → `processing` → `review` → confirm decode. Shutter (`#code_scan_capture`), mode switch, and review fields live in `Code_scan.php`.
- Decode hooks: confirm fills `#decode_input` / `#pac-input` and calls the existing `decode_input_from_form()` / `decode_input_from_map()` paths. No parallel decode parser is introduced.
- Outbound label QR (`QR.js`, `qrcode.min.js`) is generate-only and is not used for inbound scanning.
