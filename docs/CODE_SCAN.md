# On-device Wolo Code label scanning

The web app can read printed Wolo Code labels (city + three words) from the device camera. OCR runs entirely in the browser; no image frames are uploaded.

## Where to find it

- **Decode view:** tap **Scan** centered in the empty rectangular area below the input box.

See [Wolo Code Format & Layout](WOLO_CODE_FORMAT_AND_LAYOUT.md) for printed label specifications, typography, and aspect ratio detection rules.

## Sequence checklist (iOS parity)

1. **Entry** — open the full-screen overlay scanner from the code-input camera/scan control (`#decode_code_scan_button`).
2. **Live** — rear-camera preview with throttled on-device OCR for **guidance only** (candidate highlight + “Wolo Code found” cue) with a fixed ~3:1 border framing guide. Control bar flanks the manual shutter with **Gallery** (`#code_scan_use_photo`) and **Typing** (`#code_scan_type_instead`) icon buttons.
3. **Capture once** via:
   - Always-visible **manual shutter** (`#code_scan_capture`), or
   - **Auto-capture** after **3 consecutive stable frames** with the same candidate text, bounding-box IoU ≥ 0.55, and ~3:1 label border (20% aspect tolerance) with edge contrast in the guide region.
4. **Latch** — after one capture (`hasCaptured`), live OCR stops and never streams continuous video OCR into `#decode_input` / `#pac-input`.
5. **Review & Crop/Zoom** — frozen still of the capture; crop & zoom toolbar (`-`, zoom %, `+`, `Reset`, `Crop & Scan`); interactive pan (mouse drag / 1-finger touch) and zoom (mouse wheel / 2-finger pinch) under the 3:1 dashed guide; underlined editable `city word word word` inputs; city chooser datalist (recognized city, recent decode history, IP/GPS city when available). Extra printed names/addresses are stripped; city + three Wolo words are matched against the 1024-word list with fuzzy correction (`CodeScanOcrMatch.js`).
6. **Use Code** (`#code_scan_use_code`, on the right on narrow devices and on the left on full-width displays; enabled only when valid) → fill `#decode_input` or `#pac-input` and call `decode_input_from_form()` / `decode_input_from_map()`, then dismiss. **Rescan** (`#code_scan_rescan`) clears review fields and restarts live preview. Dismiss without applying via the dialog close button (`#code_scan_close`) or Typing icon (`#code_scan_type_instead`).

**Gallery photo picker** (`#code_scan_use_photo`) follows the same capture → review (with crop & zoom) → **Use Code** path (no auto-decode-only shortcut).

## Hard rules

- Explicit shutter control is always shown on live preview.
- Live OCR may track/highlight candidates only; the final path is **capture → editable review → explicit Use Code**.
- Photo fallback lands in **Review** (with crop & zoom toolbar), not auto-decode-only.
- Interactive crop frames strictly target the 3-word single line at ~3:1 aspect ratio.

## How to verify manually

1. Open [wolo.codes](https://wolo.codes) on a phone (Android Chrome is the primary target; iOS Safari is best-effort).
2. Tap **Scan** from decode view and allow camera access.
3. Confirm the shutter button is visible on live preview.
4. Point at a printed label; status should show guidance (“Wolo Code found”, “Hold steady…”) without filling the main decode field.
5. Tap shutter (or hold steady for auto-capture).
6. In review preview, test crop & zoom:
   - Tap `+` or use pinch-to-zoom / wheel to zoom in to 150-200%.
   - Drag to frame the 3 words inside the dashed guide.
   - Tap **Crop & Scan** → confirms cropped recognition updates the 3 words.
   - Tap **Reset** → restores 100% zoom and uncropped original.
7. On review, edit city + three words; confirm **Use Code** stays disabled until three valid words are entered.
8. Tap **Use Code** → map decodes. Tap **Rescan** → live preview returns with the same Fixed/General mode.
9. Tap **Cancel** or close → overlay dismisses with no decode applied.
10. **Use photo instead** → test crop and zoom on chosen photo → review screen → **Use Code** (same as camera path).
11. Confirm no image uploads during scanning.

### Without a physical label

```
Bengaluru
cat apple tomato
```

You can also generate a label from the app (Label / QR dialog) and scan the three words printed in the center.

## Fallbacks

- **Camera denied or unavailable:** **Gallery** photo picker (`#code_scan_use_photo`) or **Typing** (`#code_scan_type_instead`) icon button.
- **Unsupported browser:** same gallery/typing fallbacks.
- **Low-confidence OCR:** try better lighting, framing within the guide, or **Gallery** photo picker; edit fields manually on review.

## Technical notes

- OCR engine: [Tesseract.js](https://github.com/naptha/tesseract.js) v5.1.1, self-hosted under `/tesseract/` (`tesseract.min.js`, `worker.min.js`, `tesseract-core.wasm.min.js`, and `lang/eng.traineddata.gz`). Lazy-loaded when Scan is opened; assets are precached by the service worker for offline use. Bake copies them via `Config/URL.tsv` Path column (`tesseract/`, `tesseract/lang/`).
- Matching: `CodeScanOcrMatch.js` normalizes OCR text, fuzzy-matches tokens, extracts match bounding boxes, and exposes review helpers (`splitMatchForReview`, `buildCodeFromReview`, `validateReviewWords`, `bboxIoU`, `isFixedBorderReady`).
- UI states: `CodeScan.js` phases are `live` → `processing` → `review`; `hasCaptured` latches after the first capture. Constants: `CODE_SCAN_STABLE_MATCHES = 3`, `CODE_SCAN_BBOX_IOU_MIN = 0.55`.
- Decode hooks: **Use Code** fills `#decode_input` / `#pac-input` and calls the existing `decode_input_from_form()` / `decode_input_from_map()` paths. No parallel decode parser is introduced.
- Outbound label QR (`QR.js`, `qrcode.min.js`) is generate-only and is not used for inbound scanning.
