# Wolo Code scanner algorithm

The scanner reads printed Wolo Code labels locally in the browser. Live camera frames and Gallery photos share the frame detector and code matcher. Each starts by reading the interior of a detected code box.

## Target algorithm for four-corner labels

This sequence specifies the requested recognition behavior for labels printed with four L-shaped corner anchors. The current implementation is described below.

1. **Find the four corner anchors before OCR.** Detect L-shaped marks from image pixels. Group one top-left, top-right, bottom-right, and bottom-left mark into a candidate Wolo Code Region using the orientation and intersection of each mark’s two arms. Accept only a convex, consistently ordered quadrilateral with four distinct, compatible marks. If several labels are visible, try the complete candidates nearest the viewfinder focus first and keep their text and geometry independent. If a corner is missing or the geometry is ambiguous, wait for a better frame or let the user reframe.
2. **Straighten the label.** Compute a perspective transform from the four anchor intersections to the corners of a rectangle. Warp the image around that rectangle so the rectified image includes the code frame plus the title and address areas above and below it. Use the Card Region to bound those areas when its boundary is visible. Keep the original image for review and use the inverse transform to place detected regions back over it.
3. **Read the three Wolo Code words.** OCR the interior of the straightened Wolo Code Region. Find a single row of exactly three words, in left-to-right order. Use the Wolo word list as the only source of accepted words. Prefer exact matches and accept an OCR correction only when it has one sufficiently confident dictionary match. Reject a candidate with an ambiguous, unreadable, or extra word.
4. **Read the city above the words.** Search for the nearest readable row above the accepted words, within the same Wolo Code Region. Match the complete row against the city list, including multiword names, and return the canonical spelling from the matched city record. Prefer an exact normalized match. If OCR produces several plausible cities or no confident match, leave the city unresolved for review. Keep the three recognized words available.
5. **Read Title and Segment above the frame.** In the rectified band above the top edge, read the first label row as Title and the second as Segment. A single readable row fills Title. Keep both fields optional and exclude branding and unrelated text.
6. **Read Address line 1 and Address line 2 below the frame.** In the rectified band below the bottom edge, read the first address group as Address line 1 and the second as Address line 2. Use visible gaps between groups and keep wrapped rows together. A single address group fills line 1. When the outer card edge is unclear, limit both metadata bands to the immediate label area. Leave missing or uncertain fields blank.

The recognition result contains the three canonical words, the matched city record when available, the four optional metadata fields, and their regions in source-image coordinates. Live capture can use this result for its stability checks.

### Acceptance examples

- An angled or perspective-skewed photo with four visible anchors produces the same code as a straight-on photo of the label.
- The example below yields `mail nebula flower` and the canonical city `Bengaluru`. `Ram` and `Main door` populate Title and Segment. Address text below the frame stays in its own two fields.
- Three visible anchors are insufficient for the four-corner transform. A complete frame with an unreadable city or address still yields its three valid Wolo words for review.

## Current extraction order

1. **Detect physical boundaries.** The pixel detector looks for rectangular or rounded borders and groups of four L-shaped corner marks. If the first read misses, the scanner can estimate a small camera tilt and retry on a straightened copy. It maps the resulting bounds back to the source image. Live recognition considers landscape code frames. The dashed Scan Frame serves as an alignment guide. Pair each eligible code box with an enclosing straight or rounded Card Region when one is detected. A standard label is a portrait card with a smaller landscape code box inside it. When a close-up clips the outer card, search the full visible camera viewport for a complete inner code border or all four printed markers. The inner box alone can supply the city and words.
2. **Read exactly three Wolo Code words from inside that box.** Use a single horizontal row, in left-to-right order. All word boxes must be fully contained in the same detected rectangle. Normalize separators and case, and apply Wolo dictionary correction only to these three words. Reject incomplete rows, rows with extra words, and low-confidence code words.
3. **Read the city above those three words, still inside the same rectangle.** Use the nearest reliable OCR row above the word row. The scanner passes that spelling to review, and city lookup runs when the reviewed code is used or saved. Multiword cities and cities wider than the word row are supported.
4. **Optionally read Title and Segment on separate rows above the inner box, and Address line 1 followed by Address line 2 below it.** All outside text must still lie inside the outer card. Address parts preferably form two paragraphs separated by an empty line; wrapped rows within a paragraph remain in that part. Their absence or low confidence must not prevent reviewing the three words.

For the supplied example:

| Field | Expected value |
| --- | --- |
| City | Bengaluru |
| Word 1 | mail |
| Word 2 | nebula |
| Word 3 | flower |
| Optional title | Ram |
| Optional segment | Main door |
| Optional address | Printed street-address lines below the rounded box |

`Ram Main door Bengaluru` is never a valid city extraction for this label.

The layout is:

```text
+---------------- Whole card ----------------+
| Title                                     |
| Segment                                   |
| +------------- Wolo Code Region --------+ |
| | City                                 | |
| | word 1  word 2  word 3                | |
| +--------------------------------------+ |
| Address line 1 (may wrap)                  |
|                                           |
| Address line 2 (may wrap)                  |
+-------------------------------------------+
```

## Implementation

- `Root/JS/Component/Root/CodeScanOcrMatch.js` exposes `detectLabelRectangles(imageData, width, height)` and `matchOcrRegionsToWoloCode(result, includesFn, canonicalWords)`.
- The detector scans for edges once and looks for continuous straight or rounded rectangles first. A two-pixel gradient also detects softer edges after camera focus or downsampling. If a portrait rectangle contains the current focus, grouping the four L-shaped corner markers starts inside that card using the same edge data. A fully contained landscape code region can pair with a portrait card even when the side margins are narrow. If the card-scoped search or OCR misses, the scanner searches the rest of the image using the same edge data. It rejects near-square marker groups and still accepts continuous inner code borders.
- `CodeScan.js` routes live frames, Gallery photos and visible review crops through `recognizeCodeScanCanvas()`. This detects borders first and attaches them as `result.data.labelContainers` to the OCR result. Text-only matching is not a fallback in scanner flows.
- The border working image is at most 1200 pixels on its longest side. Border coordinates are mapped back using the actual working dimensions. OCR crops are sampled from the native-resolution source, which is also retained for the editable preview.
- Live OCR reads the cropped interiors of up to two eligible boxes. A confirmation read tries the previously matched region first. Otherwise, when a portrait card contains the viewfinder center, OCR prioritizes eligible code boxes near that card’s center. Gallery photos and zoom or pan rescans read up to four cropped boxes. If block OCR misses, sparse-text OCR first reads the interiors of up to two eligible code boxes. A final sparse-text retry can read the enclosing Card Region, with code and city matched inside their code box. Per-word confidence below 55 rejects a code row. Unreadable city text leaves an editable blank city. After the code is read, capture, Gallery, and rescan can read the bands above and below the box to fill blank optional details. With no enclosing card, these bands cover the immediate label area.
- Surrounding cards with an inner rectangle are excluded as code boxes, so a card cannot rescue words that spill out of the code region. Choose the enclosing card with close side margins and its complete vertical extent. With multiple code candidates, prefer the word row nearest the current image focus, then relative row height, exact dictionary matches and the smaller inner box. In review, the focus is the center of the visible photo crop.
- A successful match contains `words`, `code`, `cityWordCount`, and `metadata: { title, segment, address_line_1, address_line_2, address }`. The region keys include `card`, `container` (inner box), `city`, `code`, `title`, `segment`, `address_line_1`, `address_line_2`, and combined `address`. Missing optional values are empty strings/null regions. `address` joins the nonempty address parts with `\n\n`, line 1 first.
- Title and Segment use up to two nearby rows above the code box, anywhere within the detected card. Optional metadata requires word confidence of at least 70. One readable header row is a title. Branding and URL rows are excluded. OCR skips blank rows before assigning Address line 1 or Address line 2. Address rows below the box are grouped by paragraph gaps, and wrapped rows in each paragraph are joined with spaces. Two legacy physical rows without a blank separator become line 1 and line 2; a longer unbroken paragraph remains line 1 rather than inventing a split.
- Optional metadata is bounded by the card, not the narrower code box. When no card is found, unrelated background text is never used as metadata.

## Capture, review and reframing

Both Scan buttons open the same scanner. Live recognition captures the label automatically. Gallery and Typing are available below the Viewfinder. Flashlight joins them when the active camera supports continuous light and switches off when the camera is released. The live video fills the Viewfinder with a centered crop while preserving the camera's aspect ratio. Intrinsic video resize events update the aspect ratio when orientation changes. Releasing a stream replaces its video element so the next stream starts with fresh rendering geometry. Capture and OCR use the corresponding centered crop at the current zoom. The visible app can preload the OCR worker during page idle, except when the browser reports data saving or a 2G connection. An unused worker is released after 30 seconds. Opening the dialog reuses the preload or starts the worker alongside camera setup. Gallery starts the worker before opening the picker, reuses an idle or loading worker, and decodes the selected image in parallel. Gallery uses a local object URL where supported and releases it after the pixels reach the preview. The preview and OCR retain native pixels with one backing copy for reframing. The bundled English model retains the same LSTM network and dictionaries and omits the unused legacy components (2.95 MB compressed, previously 10.9 MB). Each OCR request includes its own page segmentation mode.

### When live OCR opens Label Edit View

- One high-confidence frame opens review immediately. The three code words must be exact dictionary matches. With a readable city row, each code and city word must score at least 85. Without a readable city row, each code word must score at least 90 and the city field opens blank.
- For other valid reads, the scanner waits for two camera frames with the same three code words in the same order and at least 0.55 intersection over union between their detected code boxes. It schedules the next frame after 70 ms while a candidate is pending. One missed read is allowed. A second miss clears the candidate, and a different code or box starts a new candidate.
- If just one matching frame has a city, review keeps it. If both frames report different cities, review leaves City blank. Gallery and Typing open review through their own flows without live-frame confirmation.

When the previous read found a Card Region, the detector first searches that crop with 15% padding per side, clipped to the frame. It uses the same working scale as full-frame detection. This search runs only if the padded crop covers at most half the frame. Both a fresh card boundary and an overlapping code box must be detected. If either check fails, the detector searches the full frame and prioritizes the code box with the greatest overlap. OCR reads the code box on either path. After a missed read, the next confirmation starts with full-frame detection. The scanner retains the full-resolution frame for the selected match. A detected printed container is required for recognition.

### Review controls

Label Edit View shows "Please verify the code below" on a theme-aware frosted Scanner Status Message after a successful read. Review preserves the full photo. City and all three words are editable and share the same underline. The Bottom Controls Panel keeps Save on the left, Address Details in the center, and Go on the right while the fields scroll. Save and Go sit 24 px in from the dialog edges. Go uses a white disc with a teal arrow and requires three valid dictionary words to open the reviewed address. Close dismisses the scanner. The modal grows vertically with its contents up to the viewport height with a gap above and below to reveal its extent, then scrolls internally. Address Details toggles optional Title and Segment fields above the city and words, and Address line 1 and Address line 2 below them. Address line 1 appears first, with paragraph spacing before line 2. Each part can wrap. The button exposes `aria-expanded` and `aria-controls`. Hidden fields are outside keyboard navigation. No optional field is required for Go. Save bookmarks the reviewed city, code, and optional fields while keeping the scanner open and the map location in place. It requires a title and a resolved city, uses the selected city when the city field is blank, and follows the existing local/cloud/offline bookmark behavior. City lookup failure leaves the scanner available for corrections.

Manual edits, including intentionally cleared fields, survive rescanning the same code on the same card. A different code or card, Rescan, or closing the scanner resets them. Use address carries the current details into the decoded location, label and save editors after cleanup of the previous location; it does not save automatically. If address details were expanded, decoding opens the Address Panel immediately with the recognized or edited text and preserves it after reverse geocoding. Collapsed details retain the normal closed panel behavior. Closing the scanner discards the scan.

Zoom and pan intersect the Viewfinder with the photo, then run detection, code OCR and optional detail OCR on that native-resolution crop after 350 ms of inactivity. Outdated results are ignored. Region Inspection maps crop coordinates back to the original photo. Holding the Scan Button for 500 ms opens the Scan Debug Log with Region Inspection. The log reports elapsed times for camera startup, border detection, OCR and each processed frame. With reduced motion enabled, the Scan Frame uses a bright solid border. A dashed blue outline shows the best eligible landscape code frame before a match. Once the code matches, the dialog shows the solid blue code-box, gold city and green word outlines. Region Inspection can outline a portrait Card Region in purple while the inner frame is still unresolved. When the code is read, the purple outline identifies the card paired with the matched code box. All detected region outlines have square corners. The outlines stay visible on automatic capture. Detected outlines use source-image coordinates independently of the guide.

## Distance and framing

A field report found faster recognition with the camera farther from the label than up close. This comparison has no device timings yet. The scanner first needs all four printed sides or anchors in the visible video crop. At close range, the crop can cut off a side and the camera may still be focusing. Either can lead to repeated reads. These are possible causes and need confirmation on a physical device.

When comparing distances, use the same label and lighting, keep the whole printed code region visible, and record time to Label Edit View. Check Region Inspection for the blue code box and purple Card Region when a close scan stalls. Repeat each distance with the worker already loaded to distinguish camera and OCR performance from startup.

## Verification

Run `npm test` from `Web/app/project`, or run the focused scanner tests:

```powershell
node --test tests/offline/code-scan-*.test.js
```

Tests cover paired inner and outer straight or rounded borders, sparse-text recovery limited to the card crop, portrait Card Region outlines, rectangular and rounded borders at different proportions, a missing border side, the supplied screenshot's actual pixels, the Ram/Main door city regression, code and city containment, separate nearby labels, dictionary correction, confidence, missing metadata, metadata punctuation, native gallery resolution, two address paragraphs, optional editor expansion, edit preservation, metadata decode handoff, visible-crop rescans, flashlight controls and guide-independent live recognition. The screenshot fixture stores losslessly compressed RGBA pixels with dimensions in `tests/fixtures/scanner-label.json`; parser regression boxes are transcribed from that image.

Manual verification: open the local app, scan or select a label, verify the city and words, reframe with the full card visible anywhere in the image, expand/collapse Address details and edit the four fields, then use or cancel the code. Check the supplied example returns Bengaluru with mail / nebula / flower. Tiny optional text can remain unreadable at screenshot resolution.

On an iPhone, open the scanner in portrait and check that the live picture reaches both side edges of the Viewfinder. Rotate to landscape and back, then close and reopen the scanner in portrait. During each check, confirm that the preview fills the Viewfinder and the captured crop matches what was visible.

The current detector handles complete borders with small camera tilt. Strong tilt, perspective distortion, blur, and partial framing may still require reframing. Four-point perspective rectification remains part of the target algorithm.

After live OCR confirms a match, review opens with the city and words. The same worker can then read optional detail bands from the full-resolution frame in the background and fill blank fields while preserving edits. Address Details starts collapsed. Manual edits and the chosen expanded state survive re-reading the same card.
