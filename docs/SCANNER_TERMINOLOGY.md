# Wolo Scanner Terminology

## Recommended Names

Call the overall process **Spatial Wolo Code Recognition**: recognizing a Wolo Code using both the text and its position within a label.

| Term | Meaning | Current overlay |
| --- | --- | --- |
| **Label Region** | The enclosing region containing the city and the three Wolo words. Prefer a golden-ratio shape where the layout permits. | Blue |
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

1. **Three-word localization:** identify a row of three Wolo dictionary words and calculate its bounding box.
2. **Label region estimation:** infer an enclosing Label Region around that row, preferably with a width-to-height ratio of approximately 1.618:1.
3. **City extraction:** read OCR words above the Three-Word Region that lie inside the Label Region. Preserve city text rather than correcting it against the Wolo dictionary.
4. **Code assembly:** combine the city, when present, with the three Wolo words.
5. **Review:** populate the editable fields before the user applies the code.

The current Label Region is **inferred from text geometry**. Call this **label region estimation**, not **label border detection**. Border detection would mean locating an actual printed boundary in the image.

## Supporting Terms

| Term | Meaning |
| --- | --- |
| **Scan Frame** | The dashed guide defining the area the user frames for recognition. It is distinct from the inferred Label Region. |
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
