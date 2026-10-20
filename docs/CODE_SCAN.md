# Wolo Code scanner algorithm

The scanner reads printed Wolo Code labels locally in the browser. Camera frames and gallery photos follow the same algorithm; no images are sent to a server.

## Required extraction order

1. **Identify two independent physical rectangles:** the inner Wolo Code Region (city plus three words), and the outer Card Region separating the complete card from its background. Detect boundaries from pixels before interpreting OCR. The initial dashed scan frame is only an alignment guide: it neither clips the recognition image nor counts as either detected rectangle. Do not estimate borders from the words or impose a fixed aspect ratio. If the outer card cannot be detected, the inner code can still be reviewed; outside text stays blank for optional manual entry.
2. **Read exactly three Wolo Code words from inside that box.** Use a single horizontal row, in left-to-right order. All word boxes must be fully contained in the same detected rectangle. Normalize separators and case, and apply Wolo dictionary correction only to these three words. Reject incomplete rows, rows with extra words, and low-confidence code words.
3. **Read the city above those three words, still inside the same rectangle.** Use the nearest OCR row above the word row. Preserve the city spelling rather than correcting it against the Wolo dictionary. Multiword cities and cities wider than the word row are supported. Never append the title, segment or street address to the city.
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
- Border detection finds paired horizontal strokes, verifies both vertical sides and their corner connections, and tolerates rounded corners. It uses image pixels, independently of OCR. It does not fabricate a container when no printed boundary is found.
- `CodeScan.js` routes live frames, manual capture, gallery photos and full-image rescans through `recognizeCodeScanCanvas()`. This detects borders first and attaches them as `result.data.labelContainers` to the OCR result. Text-only matching is not a fallback in scanner flows.
- The border working image is at most 1200 pixels on its longest side. Border coordinates are mapped back using the actual working dimensions. OCR and the editable preview retain native image dimensions.
- OCR uses sparse-text segmentation. Per-word confidence below 55 rejects a code row; low-confidence text elsewhere does not veto a clear code. Unreadable city text leaves an editable blank city.
- Surrounding cards with an inner rectangle are excluded as code boxes, so a card cannot rescue words that spill out of the code region. Choose the enclosing card with close side margins and its complete vertical extent. With multiple code candidates, prefer the word row nearest the current image focus, then relative row height, exact dictionary matches and the smaller inner box. Zoom/pan changes focus, never crops detection to the guide.
- A successful match contains `words`, `code`, `cityWordCount`, and `metadata: { title, segment, address_line_1, address_line_2, address }`. The region keys include `card`, `container` (inner box), `city`, `code`, `title`, `segment`, `address_line_1`, `address_line_2`, and combined `address`. Missing optional values are empty strings/null regions. `address` joins the nonempty address parts with `\n\n`, line 1 first.
- Title and Segment use up to two nearby rows above the code box, anywhere within the detected card. Optional metadata requires word confidence of at least 70. One readable header row is a title. Branding and URL rows are excluded. Address rows below the box are grouped by paragraph gaps; wrapped rows in each paragraph are joined with spaces. Two legacy physical rows without a blank separator become line 1 and line 2; a longer unbroken paragraph remains line 1 rather than inventing a split.
- Optional metadata is bounded by the card, not the narrower code box. When no card is found, unrelated background text is never used as metadata.

## Capture, review and reframing

Both Scan buttons open the same scanner. Manual shutter, Gallery and Typing remain available. Auto-capture requires three consecutive matches with the same city/code and code-box IoU of at least 0.55. A detected printed container is required for recognition; no text aspect-ratio gate is applied.

Review preserves the full photo. City and all three words are editable; Use Code requires three valid dictionary words. The Address icon between Use Code and Cancel toggles a collapsed optional editor with separate Title, Segment, Address line 1 and Address line 2 fields. Address line 1 appears first, with paragraph spacing before line 2; each part can wrap. The button exposes `aria-expanded` and `aria-controls`; hidden fields are outside keyboard navigation. No optional field is required for Use Code.

Manual edits, including intentionally cleared fields, survive rescanning the same code on the same card. A different code or card, Rescan, Cancel, or closing the scanner resets them. Use Code carries the current details into the decoded location, label and save editors after cleanup of the previous location; it does not save automatically. Cancel discards the scan.

Zoom and pan request full-source recognition after 350 ms of inactivity, ignoring stale results. The guide and its size have no effect on detected boundaries. Holding the shutter for 500 ms displays the purple whole-card, blue inner-box, gold city and green word outlines; release hides them. Overlays use viewport/image coordinates independently of the guide. Auto-capture scales all regions from the live frame to the full-resolution capture; manual capture rereads the full-resolution image.

## Verification

Run `npm test` from `Web/app/project`, or run the focused scanner tests:

```powershell
node --test tests/offline/code-scan-*.test.js
```

Tests cover rectangular and rounded borders at different proportions, a missing border side, the supplied screenshot's actual pixels, the Ram/Main door city regression, code and city containment, separate nearby labels, dictionary correction, confidence, missing metadata, metadata punctuation, native gallery resolution, two address paragraphs, optional editor expansion, edit preservation, metadata decode handoff, full-image rescans and guide-independent live recognition. The screenshot fixture stores losslessly compressed RGBA pixels with dimensions in `tests/fixtures/scanner-label.json`; parser regression boxes are transcribed from that image.

Manual verification: open the local app, scan or select a label, verify the city and words, reframe with the full card visible anywhere in the image, expand/collapse Address details and edit the four fields, then use or cancel the code. Check the supplied example returns Bengaluru with mail / nebula / flower. Tiny optional text can remain unreadable at screenshot resolution.

The current pixel detector targets complete, approximately axis-aligned borders. Faint, heavily blurred, rotated, perspective-skewed or partly cropped borders may need reframing or manual entry; no automatic perspective rectification is claimed.
