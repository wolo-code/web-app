# Wolo Code Format & Layout Specification

This document details the expected format, typography, and visual layout of a printed and scanned Wolo Code, as well as the geometric rules used by the camera scanner.

---

## 1. What is a Wolo Code?

A Wolo Code represents an exact geographic coordinate using **three words** drawn from a fixed 1024-word dictionary, scoped within a **city context**:

```
\ CityName WordOne WordTwo WordThree /
```

- **City Context**: Identifies the city or urban boundary (e.g. `Bengaluru`, `London`, `Tokyo`).
- **Three Words**: Exactly three lowercase words selected from the 1024-word list (e.g. `camera action hero`).
- **Delimiters**: Backslash `\` on the left and forward slash `/` on the right indicate the code boundary in text and display.

---

## 2. Printed Label Layout

When a Wolo Code is printed or exported as a physical label (via the app's Label generator in `QR.php`), it follows a standardized layout:

```
+-------------------------------------------------------------+
|  [Logo] Wolo                                                |
|  Title: Home / Segment: Main Gate                           |
|                                                             |
|  +-------------------------------------------------------+  |
|  |  \ Bengaluru                                          |  |
|  |                                                       |  |
|  |  camera  action  hero  /                              |  |  <-- ~3:1 to 4:1 Aspect Ratio
|  +-------------------------------------------------------+  |
|                                                             |
|  Address: 123 Sample St, Indiranagar                        |
|  www.wolo.codes                             [ QR Code ]     |
+-------------------------------------------------------------+
```

### Key Layout Rules:
1. **City and Words on Separate Lines**:
   - The city context sits on its own line (e.g., `\ Bengaluru`).
   - The **three Wolo words always sit on their own dedicated horizontal line** (e.g., `camera action hero /`).
2. **Prominence & Typography**:
   - The three words use a large, high-contrast, bold font (`font-size: xx-large; font-weight: bold;`).
   - The words are spaced evenly on a single line.
3. **Aspect Ratio of the Three-Word Line**:
   - A typical 3-word line contains 15 to 25 characters (including spaces).
   - At standard typographic proportions (line height ~1em, character width ~0.55em), the printed line forms a horizontal rectangle with an **aspect ratio of roughly 3:1 to 4:1** (width : height).

---

## 3. Camera Scanner Viewfinder & Detection Rules

The scanner UI in `Code_scan.php` and `CodeScan.js` is optimized specifically for this 3-word line layout:

### Viewfinder Elements

| Element | Appearance | Purpose |
| :--- | :--- | :--- |
| **Fixed Guide** (`#code_scan_fixed_guide`) | `2px dashed rgba(105, 183, 207, 0.9)` with 3:1 aspect ratio and dark backdrop mask | Guides the user to frame the 3-word line horizontally in the center of the camera preview. |
| **Dynamic Line** (`#code_scan_candidate_highlight`) | `2px solid #7fd4a0` with soft glow | Dynamic candidate bounding box that highlights the detected 3-word line. |

### Detection & Aspect Ratio Matching:
1. **Targeting the 3 Words**:
   - OCR recognizes all visible text in the viewfinder.
   - Any recognized city tokens (which are on their own line) are separated; the candidate bounding box is calculated **strictly from the 3 Wolo words**.
2. **Aspect Ratio Gating**:
   - In **Fixed 3:1** mode, the dynamic line appears **only when the detected 3-word candidate bounding box is close to the 3:1 ratio** (`CODE_SCAN_FIXED_ASPECT = 3`, tolerance = 0.35, accepting ratios between ~1.95:1 and ~4.05:1).
   - If the candidate text is vertical, square, or distorted, the dynamic line stays hidden.
3. **Coordinate Mapping**:
   - The dynamic rectangle is rendered within `#code_scan_fixed_guide`.
   - Because the guide has a true 3:1 aspect ratio on screen, the dynamic rectangle maintains the identical horizontal aspect ratio without vertical distortion or swapped axes.
4. **Auto-Capture Criteria**:
   - The candidate text matches across 3 consecutive frames (`CODE_SCAN_STABLE_MATCHES = 3`).
   - The bounding box IoU exceeds 0.55 (`CODE_SCAN_BBOX_IOU_MIN = 0.55`).
   - In Fixed mode, the candidate ratio is verified near 3:1 before capture latches.

---

## 4. Review, Crop & Zoom, and Decode Mapping

Once an image is captured via the camera or selected from device storage / camera roll:

1. **Frozen Viewport & Source Retention**:
   - The original high-resolution capture or photo is preserved in memory.
   - The dashed 3:1 guide stays centered over the viewport as an interactive framing viewfinder.
2. **Crop & Zoom Controls Toolbar**:
   - **Zoom In (`+`) / Zoom Out (`-`)**: Step zoom by 25% increments (from 100% up to 400%).
   - **Zoom Level**: Real-time percentage display (`100%` - `400%`).
   - **Touch Gestures & Mouse Drag**:
     - 1-finger touch or mouse drag pans the image under the dashed crop guide.
     - 2-finger pinch gesture smoothly zooms the image.
     - Mouse wheel zooms in and out.
   - **Reset**: Restores 100% zoom, recenters pan, and restores the original uncropped image.
   - **Crop & Scan**: Computes the exact high-resolution sub-rectangle bounded by the 3:1 dashed guide, crops the pixels, and re-runs on-device Tesseract OCR to refresh the review fields.
3. **Review Dialog Fields**:
   - **City**: Auto-filled if recognized on the label, with fallback datalist choices from history and geolocation.
   - **Word 1, Word 2, Word 3**: Distributed into three individual input fields in a 3-column grid for easy verification and typo correction.
4. **Validity Check**: All three words must belong to the 1024-word dictionary before **Use Code** enables.
5. **Decode Execution**:
   - From form: sets `#decode_input` to `\ city word1 word2 word3 /` and triggers `decode_input_from_form()`.
   - From map: sets `#pac-input` to `city word1 word2 word3` and triggers `decode_input_from_map()`.

---

## 5. UI Placement Summary

- **Decode View (`body.decode`)**:
  - The camera scan button (`#decode_code_scan_button`) is centered horizontally and vertically in the open rectangular area below `#decode_input_container` and above the bottom chrome.
  - The map Locate button (`#location_button`) remains docked at bottom-center of the screen chrome.
  - The city-source controls above the input box provide IP City, GPS City, and Previous City history.
- **Map View (`body.map`)**:
  - Map search is performed via Place Search Input (`#pac-input`) with adjacent Previous City history (`#map_city_history_toggle`).
