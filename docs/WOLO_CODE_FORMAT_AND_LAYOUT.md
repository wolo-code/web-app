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

The normative algorithm is documented in [CODE_SCAN.md](CODE_SCAN.md). The scanner separately detects the inner rectangle or rounded rectangle enclosing the city and words, and the whole card against the background. It then reads exactly three Wolo words inside the box, followed by the nearest city row above them inside that same box. Readable Title and Segment above the inner box and address paragraphs below it are optional metadata bounded by the whole card. Line 1 precedes line 2 with an empty paragraph between; the Address icon expands their editor.

The dashed scan guide only suggests alignment and uses a golden-ratio presentation layout. It is distinct from the detected physical label border. Recognition uses the full image; either detected rectangle may extend beyond the guide. No golden or 3:1 ratio is required of the detected box or word row.

Holding capture displays the purple whole-card outline, blue inner-box outline, gold city outline and green word outline. Coordinate mapping follows the original image through live capture, review zoom/pan and crop rescans. Auto-capture requires the same candidate on three consecutive frames and a code-box IoU of at least 0.55.

---

## 4. Review, Crop & Zoom, and Decode Mapping

Once an image is captured via the camera or selected from device storage / camera roll:

1. **Frozen Viewport & Source Retention**:
   - The original high-resolution capture or photo is preserved in memory.
   - The dashed scan guide stays centered over the viewport as an interactive framing viewfinder.
2. **Crop & Zoom Controls Toolbar**:
   - **Zoom In (`+`) / Zoom Out (`-`)**: Step zoom by 25% increments (from 100% up to 400%).
   - **Zoom Level**: Real-time percentage display (`100%` - `400%`).
   - **Touch Gestures & Mouse Drag**:
     - 1-finger touch or mouse drag pans the image under the dashed crop guide.
     - 2-finger pinch gesture smoothly zooms the image.
     - Mouse wheel zooms in and out.
   - **Reset**: Restores 100% zoom, recenters pan, and restores the original uncropped image.
   - **Crop & Scan**: Reruns on-device Tesseract OCR on the full original image. Pan and zoom change preferred candidate focus without clipping either rectangle to the guide.
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
