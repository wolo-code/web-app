# Wolo Code scanner algorithm

The scanner reads printed Wolo Code labels locally in the browser. Camera frames and gallery photos follow the same algorithm; no images are sent to a server.

## Required extraction order

1. **Identify the rectangle or rounded rectangle in the image.** This is the printed box enclosing the city and three Wolo words. Detect its actual boundary before interpreting OCR. The dashed scan guide, page edge, title and address are distinct from this box. Do not estimate the box from the words or impose a golden or 3:1 aspect ratio.
2. **Read exactly three Wolo Code words from inside that box.** Use a single horizontal row, in left-to-right order. All word boxes must be fully contained in the same detected rectangle. Normalize separators and case, and apply Wolo dictionary correction only to these three words. Reject incomplete rows, rows with extra words, and low-confidence code words.
3. **Read the city above those three words, still inside the same rectangle.** Use the nearest OCR row above the word row. Preserve the city spelling rather than correcting it against the Wolo dictionary. Multiword cities and cities wider than the word row are supported. Never append the title, section or street address to the city.
4. **Optionally read the title and section above the rectangle, and the address below it, when readable.** Keep these fields separate from the city and code. Their absence or low confidence must not prevent reviewing the three words.

For the supplied example:

| Field | Expected value |
| --- | --- |
| City | Bengaluru |
| Word 1 | mail |
| Word 2 | nebula |
| Word 3 | flower |
| Optional title | Ram |
| Optional section (also called segment) | Main door |
| Optional address | Printed street-address lines below the rounded box |

`Ram Main door Bengaluru` is never a valid city extraction for this label.

## Implementation

- `Root/JS/Component/Root/CodeScanOcrMatch.js` exposes `detectLabelRectangles(imageData, width, height)` and `matchOcrRegionsToWoloCode(result, includesFn, canonicalWords)`.
- Border detection finds paired horizontal strokes, verifies both vertical sides and their corner connections, and tolerates rounded corners. It uses image pixels, independently of OCR. It does not fabricate a container when no printed boundary is found.
- `CodeScan.js` routes live frames, manual capture, gallery photos and framed rescans through `recognizeCodeScanCanvas()`. This detects borders first and attaches them as `result.data.labelContainers` to the OCR result. Text-only matching is not a fallback in scanner flows.
- The border working image is at most 1200 pixels on its longest side. Border coordinates are mapped back using the actual working dimensions. OCR and the editable preview retain native image dimensions.
- OCR uses sparse-text segmentation. Per-word confidence below 55 rejects a code row; low-confidence text elsewhere does not veto a clear code. Unreadable city text leaves an editable blank city.
- Each detected box is matched independently. Among candidates, the larger relative code-row height wins, then exact dictionary matches, then the smaller enclosing box. This favors the inner printed code box over an enclosing page or card.
- A successful match contains `words`, `code`, `cityWordCount`, `metadata: { title, section, address }`, and `regions: { container, city, code, title, section, address }`. Absent metadata uses empty strings and absent optional regions use null. Address lines retain newlines; metadata retains OCR punctuation and case.
- Optional metadata uses horizontally contained text: up to two nearby rows above the box (within 75% of box height), and a contiguous address block below it (within one box height). Branding and URL rows are excluded. One readable header row is treated as a title. Metadata is retained in `codeScanState.reviewMatch`; current editable review and decode fields remain city plus three words.

## Capture, review and reframing

Both Scan buttons open the same scanner. Manual shutter, Gallery and Typing remain available. Auto-capture requires three consecutive matches with the same city/code and code-box IoU of at least 0.55. A detected printed container is required for recognition; no text aspect-ratio gate is applied.

Review preserves the full photo. City and all three words are editable; Use Code requires three valid dictionary words and invokes the existing decode flow only when pressed. Cancel closes without decoding. Zoom and pan rerun framed recognition after 350 ms of inactivity, ignoring stale results. Keep the complete printed rectangle inside the frame when adjusting the image; optional metadata outside the frame can remain blank. Region coordinates, including optional metadata regions, follow native-image capture and crop transformations. Holding the shutter for 500 ms displays blue container, gold city and green word outlines; release hides them.

## Verification

Run `npm test` from `Web/app/project`, or run the focused scanner tests:

```powershell
node --test tests/offline/code-scan-*.test.js
```

Tests cover rectangular and rounded borders at different proportions, a missing border side, the supplied screenshot's actual pixels, the Ram/Main door city regression, code and city containment, separate nearby labels, dictionary correction, confidence, missing metadata, metadata punctuation, native gallery resolution, and crop coordinate mapping. The screenshot fixture stores losslessly compressed RGBA pixels with dimensions in `tests/fixtures/scanner-label.json`; parser regression boxes are transcribed from that image.

Manual verification: open the local app, scan or select a label, verify the city and words, reframe with the full border visible, then use or cancel the code. Check the supplied example returns Bengaluru with mail / nebula / flower. Tiny optional text can remain unreadable at screenshot resolution.

The current pixel detector targets complete, approximately axis-aligned borders. Faint, heavily blurred, rotated, perspective-skewed or partly cropped borders may need reframing or manual entry; no automatic perspective rectification is claimed.
