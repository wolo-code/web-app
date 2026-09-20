# On-device Wolo Code label scanning

The web app can read printed Wolo Code labels (city + three words) from the device camera. OCR runs entirely in the browser; no image frames are uploaded.

## Where to find it

- **Decode view:** tap **Scan** in the city-source row (next to IP city / GPS city / Previous).
- **Map view:** tap **Scan** next to the search bar (beside Previous).

## Sequence checklist (iOS parity)

1. **Entry** — open the full-screen overlay scanner from the code-input or map camera/scan control (`#decode_code_scan_button`, `#map_code_scan_button`).
2. **Live** — rear-camera preview with throttled on-device OCR for **guidance only** (candidate highlight + “Wolo Code found” cue). Segmented modes: **Fixed 3:1** (default) vs **General**. Changing mode clears stability and stays on live preview.
3. **Capture once** via:
   - Always-visible **manual shutter** (`#code_scan_capture`, white circle), or
   - **Auto-capture** after **3 consecutive stable frames** with the same candidate text and bounding-box IoU ≥ 0.55. **Fixed** also requires a continuous ~3:1 label border (20% aspect tolerance) with edge contrast in the guide region (best-effort on web). **General** can auto-capture on stable text without a border requirement.
4. **Latch** — after one capture (`hasCaptured`), live OCR stops and never streams continuous video OCR into `#decode_input` / `#pac-input`.
5. **Review** — frozen still of the capture; editable `city word word word`; city chooser datalist (recognized city, recent decode history, IP/GPS city when available); live decode validity (`#code_scan_review_validity`). Extra printed names/addresses are stripped; city + three Wolo words are matched against the 1024-word list with fuzzy correction (`CodeScanOcrMatch.js`).
6. **Use Code** (`#code_scan_use_code`, enabled only when preview is valid) → fill `#decode_input` or `#pac-input` and call `decode_input_from_form()` / `decode_input_from_map()`, then dismiss. **Rescan** (`#code_scan_rescan`) clears review text, restarts live preview, and **keeps the current mode**. **Cancel** (`#code_scan_close`, `#code_scan_cancel`, **Type instead**) dismisses without applying.

**Use photo instead** follows the same capture → review → **Use Code** path (no auto-decode-only shortcut).

## Hard rules

- Explicit shutter control is always shown on live preview.
- Live OCR may track/highlight candidates only; the final path is **capture → editable review → explicit Use Code**.
- Photo fallback lands in **Review**, not auto-decode-only.

## How to verify manually

1. Open [wolo.codes](https://wolo.codes) on a phone (Android Chrome is the primary target; iOS Safari is best-effort).
2. Tap **Scan** from decode view or map view and allow camera access.
3. Confirm the shutter button is visible on live preview.
4. Point at a printed label; status should show guidance (“Wolo Code found”, “Hold steady…”) without filling the main decode field.
5. Tap shutter (or hold steady for auto-capture in General mode).
6. On review, edit city + three words; confirm **Use Code** stays disabled until three valid words are entered.
7. Tap **Use Code** → map decodes. Tap **Rescan** → live preview returns with the same Fixed/General mode.
8. Tap **Cancel** or close → overlay dismisses with no decode applied.
9. **Use photo instead** → review screen → **Use Code** (same as camera path).
10. Confirm no image uploads during scanning.

### Without a physical label

```
Bengaluru
cat apple tomato
```

You can also generate a label from the app (Label / QR dialog) and scan the three words printed in the center.

## Fallbacks

- **Camera denied or unavailable:** **Use photo instead** (review step) or **Type instead**.
- **Unsupported browser:** same photo/type fallbacks.
- **Low-confidence OCR:** try **General** mode, better lighting, or **Use photo instead**; edit fields manually on review.

## Technical notes

- OCR engine: [Tesseract.js](https://github.com/naptha/tesseract.js) v5.1.1, self-hosted under `/tesseract/` (`tesseract.min.js`, `worker.min.js`, `tesseract-core.wasm.min.js`, and `lang/eng.traineddata.gz`). Lazy-loaded when Scan is opened; assets are precached by the service worker for offline use. Bake copies them via `Config/URL.tsv` Path column (`tesseract/`, `tesseract/lang/`).
- Matching: `CodeScanOcrMatch.js` normalizes OCR text, fuzzy-matches tokens, extracts match bounding boxes, and exposes review helpers (`splitMatchForReview`, `buildCodeFromReview`, `validateReviewWords`, `bboxIoU`, `isFixedBorderReady`).
- UI states: `CodeScan.js` phases are `live` → `processing` → `review`; `hasCaptured` latches after the first capture. Constants: `CODE_SCAN_STABLE_MATCHES = 3`, `CODE_SCAN_BBOX_IOU_MIN = 0.55`.
- Decode hooks: **Use Code** fills `#decode_input` / `#pac-input` and calls the existing `decode_input_from_form()` / `decode_input_from_map()` paths. No parallel decode parser is introduced.
- Outbound label QR (`QR.js`, `qrcode.min.js`) is generate-only and is not used for inbound scanning.
