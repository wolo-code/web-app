# On-device Wolo Code label scanning

The web app can read printed Wolo Code labels (city + three words) from the device camera. OCR runs entirely in the browser; no image frames are uploaded.

## Where to find it

- **Decode view:** tap **Scan** in the city-source row (next to IP city / GPS city / Previous).
- **Map view:** tap **Scan** next to the search bar (beside Previous).

## How to verify manually

1. Open [wolo.codes](https://wolo.codes) on a phone (Android Chrome is the primary target; iOS Safari is best-effort).
2. Switch to the Wolo Code input view or stay on the map and tap **Scan**.
3. Allow camera access when prompted.
4. Point the rear camera at a printed label that shows a city and three Wolo words (no QR required).
5. Hold steady until the status shows a detected code twice; the app should decode to the map automatically.
6. Confirm the bottom notification area never mentions uploading images, and network traffic does not include image uploads during scanning.

### Without a physical label

Use any on-screen or printed sample with a valid code, for example:

```
Bengaluru
cat apple tomato
```

You can also generate a label from the app (Label / QR dialog) and scan the three words printed in the center.

## Fallbacks

- **Camera denied or unavailable:** the scan dialog explains the issue; close it and type or paste the code as before.
- **Unsupported browser:** same fallback — type or paste.
- **Low-confidence OCR:** keep the label flat, well lit, and centered; or type the code manually.

## Technical notes

- OCR engine: [Tesseract.js](https://github.com/naptha/tesseract.js) v5, lazy-loaded from jsDelivr when Scan is opened.
- Matching: `CodeScanOcrMatch.js` normalizes OCR text and matches tokens against the live 1024-word list (with light fuzzy correction), then calls the existing `beginDecode` flow.
