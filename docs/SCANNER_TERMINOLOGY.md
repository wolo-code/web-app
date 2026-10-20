# Wolo Scanner Terminology

## Recommended Names

Call the overall process **Spatial Wolo Code Recognition**: recognizing a Wolo Code using both the text and its position within a label.

| Term | Meaning | Current overlay |
| --- | --- | --- |
| **Label Region / Wolo Code Region** | The enclosing region containing the city and the three Wolo words. Its actual printed rectangle or rounded rectangle is detected first. | Blue |
| **Card Region** | The whole card separated from its background, containing the inner Label Region and optional outside text. | Purple |
| **City Region** | The region containing city text above the three Wolo words and inside the Label Region. | Gold |
| **Three-Word Region** | The region containing exactly the three recognized Wolo dictionary words. | Green |

Use **region** when discussing the content or recognition algorithm. Use **bounding box** when discussing its rectangular coordinates, and **outline** when discussing its visible UI rendering.

For example: "Read the City Region above the Three-Word Region within the Label Region."

## Region Relationship

```text
Label Region
+-------------------------------------+
|                                     |
|       +---------------------+       |
|       | City Region         |       |
|       | New Delhi           |       |
|       +---------------------+       |
|                                     |
|  +-------------------------------+  |
|  | Three-Word Region             |  |
|  | bull / bun / bus              |  |
|  +-------------------------------+  |
|                                     |
+-------------------------------------+
```

The City Region is optional when no city text is recognized. The Three-Word Region is required for a recognized code candidate.

## Recognition Sequence

1. **Label border detection:** identify both the actual inner code rectangle and the outer card boundary in image pixels. The initial scan frame only guides alignment.
2. **Three-word extraction:** read exactly three Wolo dictionary words on one row inside that detected box.
3. **City extraction:** read the nearest city row above the words, fully inside the same box. Preserve city spelling.
4. **Optional metadata extraction:** read Title and Segment on separate rows above the inner box and two address paragraphs below it, all within the card, when readable, keeping them separate from the city and code.
5. **Review:** populate editable city and word fields before the user applies the code; expose optional fields behind the Address icon, line 1 before line 2 with blank-line spacing, and retain edits for the same card.

See [the scanner algorithm](CODE_SCAN.md) for rules, output fields and verification. The Label Region follows the detected physical border; it is not estimated from text geometry and has no enforced aspect ratio.

## Supporting Terms

| Term | Meaning |
| --- | --- |
| **Scan Frame** | The dashed alignment guide; recognition uses the full image and can find both rectangles beyond it. It is distinct from the detected Label Region. |
| **OCR Word Box** | The bounding box returned by OCR for an individual recognized word. |
| **Region of Interest (ROI)** | An image area selected for processing, such as the area inside the Scan Frame. |
| **Detection Padding** | Extra space added around a detected text bounding box. A 10% size increase adds 5% on each side before clipping at image edges. |
| **Code Candidate** | A recognized city-and-three-word combination awaiting stability checks or review. |
| **Stable Detection** | A code candidate that remains consistent across consecutive live OCR frames. |

## Implementation Vocabulary

Suggested names for future code and documentation:

| Concept | Suggested identifier | Current region key | Current overlay ID |
| --- | --- | --- | --- |
| Label Region | `labelRegion` / `labelBBox` | `regions.container` | `code_scan_container_highlight` |
| City Region | `cityRegion` / `cityBBox` | `regions.city` | `code_scan_city_highlight` |
| Three-Word Region | `threeWordRegion` / `threeWordBBox` | `regions.code` | `code_scan_candidate_highlight` |
| Scan Frame | `scanFrame` | Not a detected region | `code_scan_fixed_guide` |

These are terminology recommendations; existing implementation identifiers have not been renamed.

Avoid **Code Region** for the three-word rectangle: a complete Wolo Code may also include the city, so **Three-Word Region** is more precise. Prefer **Label Region** over **Container Rectangle** because it names the content rather than only the shape.
