# Wolo Code scanner algorithm

The scanner reads printed Wolo Code labels locally in the browser. Camera frames and gallery photos share the frame detector and code matcher. Live camera scans start with the code box, while gallery scans first read the full image.

## Target algorithm for four-corner labels

This sequence specifies the requested recognition behavior for labels printed with four L-shaped corner anchors. The current implementation is described below.

1. **Find the four corner anchors before OCR.** Detect L-shaped marks from image pixels. Group one top-left, top-right, bottom-right, and bottom-left mark into a candidate Wolo Code Region using the orientation and intersection of each mark’s two arms. Accept only a convex, consistently ordered quadrilateral with four distinct, compatible marks. If several labels are visible, try the complete candidates nearest the viewfinder focus first and keep their text and geometry independent. If a corner is missing or the geometry is ambiguous, wait for a better frame or let the user reframe.
2. **Straighten the label.** Compute a perspective transform from the four anchor intersections to the corners of a rectangle. Warp the image around that rectangle so the rectified image includes the code frame plus the title and address areas above and below it. Use the Card Region to bound those areas when its boundary is visible. Keep the original image for review and use the inverse transform to place detected regions back over it.
3. **Read the three Wolo Code words.** OCR the interior of the straightened Wolo Code Region. Find a single row of exactly three words, in left-to-right order. Use the Wolo word list as the only source of accepted words. Prefer exact matches and accept an OCR correction only when it has one sufficiently confident dictionary match. Reject a candidate with an ambiguous, unreadable, or extra word.
4. **Read the city above the words.** Search for the nearest readable row above the accepted words, within the same Wolo Code Region. Match the complete row against the city list, including multiword names, and return the canonical spelling from the matched city record. Prefer an exact normalized match. If OCR produces several plausible cities or no confident match, leave the city unresolved for review. Keep the three recognized words available.
5. **Read Title and Segment above the frame.** In the rectified band above the top edge, read the first label row as Title and the second as Segment. A single readable row fills Title. Keep both fields optional and exclude branding and unrelated text.
6. **Read Address line 1 and Address line 2 below the frame.** In the rectified band below the bottom edge, read the first address group as Address line 1 and the second as Address line 2. Use visible gaps between groups and keep wrapped rows together. A single address group fills line 1. When the outer card edge is unclear, limit both metadata bands to the immediate label area. Leave missing or uncertain fields blank.

The recognition result contains the three canonical words, the matched city record when available, the four optional metadata fields, and their regions in source-image coordinates. Live capture can use this result for its stability checks. Releasing a Shutter Button hold freezes the inspected frame and keeps its outlines visible. If the words are unreadable, the scanner runs still-image OCR on that frame. A short tap reads a fresh frame.

### Acceptance examples

- An angled or perspective-skewed photo with four visible anchors produces the same code as a straight-on photo of the label.
- The example below yields `mail nebula flower` and the canonical city `Bengaluru`. `Ram` and `Main door` populate Title and Segment. Address text below the frame stays in its own two fields.
- Three visible anchors are insufficient for the four-corner transform. A complete frame with an unreadable city or address still yields its three valid Wolo words for review.

## Current extraction order

1. **Detect physical boundaries.** The pixel detector looks for approximately axis-aligned rectangular or rounded borders and groups of four L-shaped corner marks. It returns axis-aligned boxes for the inner Wolo Code Region and any enclosing Card Region. Live recognition considers only landscape code frames in the camera orientation. A fresh still taken with the Shutter Button can try rotated crops and map the resulting word regions back to the original image. The dashed scan frame serves as an alignment guide, and the inner code can still be reviewed when the outer card edge is missing.
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
- Border detection groups four matching L-shaped corner anchors and rejects near-square anchor groups. It also recognizes continuous rectangular and rounded legacy borders. It uses image pixels independently of OCR.
- `CodeScan.js` routes live frames, manual capture, gallery photos and full-image rescans through `recognizeCodeScanCanvas()`. This detects borders first and attaches them as `result.data.labelContainers` to the OCR result. Text-only matching is not a fallback in scanner flows.
- The border working image is at most 1200 pixels on its longest side. Border coordinates are mapped back using the actual working dimensions. OCR and the editable preview retain native image dimensions.
- Live OCR prioritizes the nearest complete anchor frame and reads the cropped interior at bounded resolution. It tries up to two frames and skips OCR on frames with no eligible box. Gallery photos and fresh stills use sparse-text segmentation before retrying inside the box if needed. Per-word confidence below 55 rejects a code row; low-confidence text elsewhere does not veto a clear code. Unreadable city text leaves an editable blank city. After the code is read, capture, gallery, and rescan scale the card bands above and below the code box and read them as text blocks, filling only title, segment, and address fields the sparse pass left blank. When no outer card is printed, capture, gallery, and rescan still read the bands immediately above and below the code box, not the whole page, for blank title, segment, and address.
- Surrounding cards with an inner rectangle are excluded as code boxes, so a card cannot rescue words that spill out of the code region. Choose the enclosing card with close side margins and its complete vertical extent. With multiple code candidates, prefer the word row nearest the current image focus, then relative row height, exact dictionary matches and the smaller inner box. Zoom/pan changes focus, never crops detection to the guide.
- A successful match contains `words`, `code`, `cityWordCount`, and `metadata: { title, segment, address_line_1, address_line_2, address }`. The region keys include `card`, `container` (inner box), `city`, `code`, `title`, `segment`, `address_line_1`, `address_line_2`, and combined `address`. Missing optional values are empty strings/null regions. `address` joins the nonempty address parts with `\n\n`, line 1 first.
- Title and Segment use up to two nearby rows above the code box, anywhere within the detected card. Optional metadata requires word confidence of at least 70. One readable header row is a title. Branding and URL rows are excluded. Address rows below the box are grouped by paragraph gaps; wrapped rows in each paragraph are joined with spaces. Two legacy physical rows without a blank separator become line 1 and line 2; a longer unbroken paragraph remains line 1 rather than inventing a split.
- Optional metadata is bounded by the card, not the narrower code box. When no card is found, unrelated background text is never used as metadata.

## Capture, review and reframing

Both Scan buttons open the same scanner. Manual shutter, Gallery and Typing remain available. Auto-capture opens review after one read with three exact dictionary words and a city row, all with OCR confidence of at least 85. Other valid reads need two consecutive matches with the same city/code and at least 0.55 intersection over union between their printed code boxes. It retains the full-resolution frame used for the final match. A tap on the Shutter Button takes a fresh frame immediately, including during live OCR, and reads the new image. A press in progress takes priority over automatic capture. A detected printed container is required for recognition. If full-image OCR misses the label, the worker reads the upscaled interior of up to four nearby candidate boxes in order of distance from the focus.

Review preserves the full photo. City and all three words are editable; the existing Go arrow opens the reviewed address and requires three valid dictionary words; there is no duplicate caret action. Cancel uses the shared Close icon in a circular button. The modal grows vertically with its contents up to the viewport height with a gap above and below to reveal its extent, then scrolls internally. The Address icon toggles optional Title and Segment fields above the city/words section and Address line 1 and Address line 2 fields below it, matching the printed card. Address line 1 appears first, with paragraph spacing before line 2; each part can wrap. The button exposes `aria-expanded` and `aria-controls`; hidden fields are outside keyboard navigation. No optional field is required for Use address. The bookmark Save action saves the reviewed city/code and current optional fields directly without closing the scanner or changing the map location. It requires a title and a resolved city, uses the selected city when the city field is blank, and follows the existing local/cloud/offline bookmark behavior. City lookup failure leaves the scanner available for corrections.

Manual edits, including intentionally cleared fields, survive rescanning the same code on the same card. A different code or card, Rescan, or closing the scanner resets them. Use address carries the current details into the decoded location, label and save editors after cleanup of the previous location; it does not save automatically. If address details were expanded, decoding opens the Address Panel immediately with the recognized or edited text and preserves it after reverse geocoding. Collapsed details retain the normal closed panel behavior. Closing the scanner discards the scan.

Zoom and pan request full-source recognition after 350 ms of inactivity, ignoring stale results. The guide and its size have no effect on detected boundaries. Holding the Shutter Button for 500 ms enters debug mode while held. A dashed blue outline shows the best eligible landscape code frame before a match. Once the code matches, the dialog shows the solid blue code-box, gold city and green word outlines. A purple whole-card outline appears when the card is landscape. All outlines have square corners. Release hides the outlines and uses the most recent successful detection and its full-resolution frame immediately, even if a later live read missed the code. If no code was found, live scanning continues. Overlays use viewport/image coordinates independently of the guide.

## Verification

Run `npm test` from `Web/app/project`, or run the focused scanner tests:

```powershell
node --test tests/offline/code-scan-*.test.js
```

Tests cover rectangular and rounded borders at different proportions, a missing border side, the supplied screenshot's actual pixels, the Ram/Main door city regression, code and city containment, separate nearby labels, dictionary correction, confidence, missing metadata, metadata punctuation, native gallery resolution, two address paragraphs, optional editor expansion, edit preservation, metadata decode handoff, full-image rescans and guide-independent live recognition. The screenshot fixture stores losslessly compressed RGBA pixels with dimensions in `tests/fixtures/scanner-label.json`; parser regression boxes are transcribed from that image.

Manual verification: open the local app, scan or select a label, verify the city and words, reframe with the full card visible anywhere in the image, expand/collapse Address details and edit the four fields, then use or cancel the code. Check the supplied example returns Bengaluru with mail / nebula / flower. Tiny optional text can remain unreadable at screenshot resolution.

The current detector handles complete, approximately axis-aligned borders. Fresh shutter stills can read labels turned by 90, 180, or 270 degrees. Strong tilt, perspective distortion, blur, and partial framing may still require reframing. Four-point perspective rectification remains part of the target algorithm.

An existing live match opens review immediately with its city and words. The same worker can then read optional detail bands from the full-resolution frame in the background and fill blank fields while preserving edits. Address details remain collapsed initially; the Address card icon can expand or collapse the fields. Manual edits and the chosen expanded state survive re-reading the same card. The redundant bottom-right Close action is removed.
