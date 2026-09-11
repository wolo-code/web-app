# App Features

Use this file as a feature-level map of the Wolo Code root app. Pair it with `APP_SECTIONS.md` for screen/state naming.

## Reliability And Offline

| Feature | Current implementation signal | Notes |
| --- | --- | --- |
| Service worker shell | `Root/sw.js`, `Root/precache-manifest.json`, `sw_init.js` | Precaches baked assets, serves the app shell offline, and caches Google Maps, OSM, Apple Maps, Esri, and Microsoft Maps tiles for recently viewed areas. Same-origin CSS/JS/SVG use network-first with cache fallback so a normal refresh does not keep a stale hard-refresh bypass. |
| Offline word/city data | `OfflineStore.js`, `Database.js`, `City.js`, `/offline-data/WordList.json` | Word list and previously loaded cities are snapshotted in IndexedDB for encode/decode without Firebase. |
| Offline save queue | `OfflineQueue.js`, `Account.js`, `#offline_queue_badge` | Address saves queue when offline or on network failure and flush after reconnect. |
| Offline UX | `OfflineStatus.js`, `#offline_status_banner` | Banner and toasts explain when sign-in, geocoding, or uncached city lookup needs network. See `docs/offline.md`. |

## Navigation And View Modes

| Feature | Current implementation signal | Notes |
| --- | --- | --- |
| Decode View | `body.decode`, `#decode_interface_overlay`, `#decode_input` | Plain Wolo Code entry state. Users can type or paste a Wolo Code before switching into the map flow. In dark mode, the bottom-left Action Menu, center Locate Button, and right Terrain Map View Button share the same circular disc. |
| Map View | `body.map`, `#map`, `#pac-input` | Interactive Google Maps state for search, location selection, encoding, and viewing decoded places. |
| Satellite View | `body.satellite`, Google Maps `SATELLITE` map type | Visual variant of Map View. |
| OSM View | `body.osm`, OSM tiles on `#map` | OpenStreetMap tiles when that source is enabled. |
| Apple Maps View | `body.apple`, MapKit JS `#apple_map` under transparent Google `#map` | Apple Maps source. Requires `apple_maps_token` (MapKit JS JWT). MapKit JS draws Apple tiles through a transparent Google overlay; Google Maps stays for clicks, markers, search, geocoding, and city add. During pan, Apple tiles follow with a CSS transform and only recommit MapKit’s camera on idle, zoom, or a large pan so dragging stays in sync. Google’s logo and map-data credit are hidden on OSM, Apple, Esri, and Microsoft views. OSM/Esri/Microsoft/Apple source attribution sits bottom-left after a small gap from the Action Menu and stays visible while that menu is open. Off until that token is set. |
| Esri View | `body.esri`, Esri World Street Map tiles on `#map` | Esri street tiles when that source is enabled. |
| Microsoft Maps View | `body.microsoft`, Bing tiles on `#map` | Microsoft/Bing road tiles when that source is enabled. |
| Map Source Prefs | `Map_source_selector.php`, `initMapSource()`, `wolo-map-source` | Account and login profile menus show Google Maps, OSM, Apple Maps, Esri, and Microsoft Maps each with an enable/disable toggle beside the label and a set-default star that is active only while that source is enabled. At least one source stays enabled. The default source is used when opening map from Wolo Code Input View. |
| Action Menu | `#action_menu`, `toggleActionMenu()` | Bottom-left expandable control for secondary actions. |
| Map Type Toggle | `#action_menu_map`, `#map_type_button`, `toggleMapViewType()`, `getNextMapLayer()` | Cycles enabled layers (Google terrain/satellite, OSM, Apple Maps, Esri, and Microsoft Maps). From Decode View, the Action Menu map-type action opens Satellite View when Google Maps is enabled. Hidden when only one layer remains. Chrome controls expose native `title` tooltips; map-type labels follow the next enabled source. |
| Wolo Code Input Toggle | `#action_menu_decode`, `toggleDecodeView()` | Replaces the previous mail action in the Action Menu. Toggles in place between the map icon and `Wolo-code.svg`; from Decode View, it opens the affixed default map source. |
| Info Entry | `#action_menu_info`, `showInfoFromActionMenu()` | Opens the app information flow from the Action Menu. |

## Wolo Code Workflows

| Feature | Current implementation signal | Notes |
| --- | --- | --- |
| Encode Location | `encode()`, map click listener, `focus___()` | Selecting a map position generates the corresponding Wolo Code. |
| Decode Wolo Code | `decode()`, `beginDecode()`, `decode_input_from_form()`, `showInvalidCodeDialog()` | A typed Wolo Code, DIGIPIN, or plus code resolves to a place and can jump back to the map. DIGIPIN and plus-code jumps keep the Address Panel open. Unrecognized input opens a popup with edge-aligned Edit code and Search map actions instead of a notification toast. Wolo Code Input and Place Search Input use CSS `text-transform` to show DIGIPIN and plus-code values in uppercase (`:valid` against those patterns) and return to lowercase when the value no longer matches. |
| Decode input hint | `#notification_bottom`, `showDecodeInputAltTip()` | While the Wolo Code input is focused, a bottom notification notes that DIGIPIN and plus codes can also be entered, then fades out. |
| City Resolution | `getCityGpId()`, `getCityByIp()`, `decodeWithIpCity()`, `#decode_city_context`, city chooser fragments | Codes can include city context, reuse a previous city, infer city from IP, or ask the user to choose a matching city. Initial load never requests browser geolocation; it defaults to the previous city when available, otherwise the IP city. IP-derived city hints are validated before display and briefly retried when the first response has no usable city. |
| Suggestions | `suggestWrapper`, `#map_input_suggestion_result`, `#decode_input_suggestion_result` | Search and decode inputs share suggestion UI with different sizing behavior. |
| Default Try Prompt | `#notification_top`, `tryDefaultCity()` | Top notification offers a starter city example. |

## Map And Location

| Feature | Current implementation signal | Notes |
| --- | --- | --- |
| Search Place Input | `#pac-input`, Google Places-style controls | Search input is shown in Map View. |
| Current Location | `#location_button`, locate permission dialog | Location control can request permission, locate the user, and optionally remember "do not ask again". |
| Decode City Source | `#decode_city_geolocation`, `#decode_city_ip`, `#decode_city_history_toggle`, `#decode_city_history_message` | Wolo Code Input View exposes more widely spaced city-source controls above the city name for coarse geolocation on click, IP city, and previously used city history in a popup list. The IP globe sits padded inside the 39px circular control. The geolocation locate glyph keeps that same 39px circular disc and draws a smaller currentColor target (ring, ticks, and center dot) inside it. All three source controls share the same 39px circular disc. The selected source paints those icons with the primary accent, while inactive sources stay muted. Hovered, active, or opening controls grow the full circular button with a smooth animation, then shrink when the state changes. Geolocation clears the current city label, shows `loading...`, and then fills the city from the reverse-geocoded locality; unsupported, invalid, or non-gesture geolocation attempts return through the normal city lookup failure path. |
| Address Display | `#address_text`, `showAddress`, `copyAddress()` | The Address Panel is theme-aware (light/dark card and text). It shows the resolved street address plus labeled DIGIPIN (when in India) and plus code rows in both India and other regions. Code labels stay left; DIGIPIN and plus code values align right. Plus codes are encoded locally when reverse geocoding omits them. Tapping a code copies it; DIGIPIN copies in uppercase. Drag-selecting text copies only the selection, keeps the highlight, and notifies `Selected text copied`. Navigating with a DIGIPIN or plus code keeps the panel open; a new Locate action hides it. DIGIPIN is not shown on the map info window. Bottom-center info cards (`#notification_bottom`, `#accuracy_container`, `#address_text`) share `#map_bottom_stack` so variable-height cards stack with an 8px gap above Locate/footer chrome. The map pans by that stack height so the Wolo Code InfoWindow clears the same band. |
| External Navigation | `External.php`, `external_proceed_external()`, `external_proceed_internal()` | External app/link flow can either continue outward or stay inside the web app. |
| Redirect Handling | `Redirect.php`, `redirectCancel()` | Redirect flow has cancel/loading states. |

## Sharing, QR, And Export

| Feature | Current implementation signal | Notes |
| --- | --- | --- |
| Share Wolo Code | `shareWCode()`, `handleShareWCode()` | Uses native share when available and falls back to copy messaging. |
| Copy Variants | `copyWcodeFull()`, `copyWcodeCode()`, `copyWcodeLink()`, `copyWcodeJumpLink()` | Supports copying full code, short code, link, and jump link variants. |
| QR Label | `QR.php`, `showQR()`, `toggleQRpreview()` | Builds a printable/shareable Wolo Code label with title, segment, code, address, and app URL. |
| QR Download | `qr_download`, `downloadQR()` | Downloads QR/label output. |
| QR Print | `qr_print`, `printQR()` | Opens print-oriented QR label mode. |
| Save From QR | `onQRDialogSave()` | Long-press save path can persist title, segment, and address from the QR dialog. |

## Account And Saved Data

| Feature | Current implementation signal | Notes |
| --- | --- | --- |
| Firebase Auth | `firebase.auth()`, `signedIn()` | Handles redirect result, current user state, display name, email, and profile image. |
| Account Dialog | `Account_Dialog.php`, `showAccountDialog()`, `hideAccountDialog()` | Lets signed-in users inspect account details, set appearance and map source prefs, and access saved address controls. Appearance theme buttons show System/Light/Dark labels on hover and focus. |
| Logout | `account_dialog_logout`, `onLogout()` | Account dialog includes logout behavior. |
| Saved Addresses | `loadSaveList()`, `saveAddress()` | Inferred from handlers: users can load and save address records when signed in. |

## Support Dialogs And System States

| Feature | Current implementation signal | Notes |
| --- | --- | --- |
| Info Dialog | `Info.php`, `Info_intro.php`, `Info_full.php`, `Info_links.php` | Explains Wolo Code usage and links. |
| No City Dialog | `NoCity.php`, `noCity_add()`, `noCity_cancel()` | Handles unsupported or missing city cases. |
| Choose City Dialogs | `ChooseCity_by_name.php`, `ChooseCity_by_periphery.php` | Handles ambiguous city matches by name or location perimeter. |
| Unrecognized Code Dialog | `Invalid_code.php`, `showInvalidCodeDialog()` | Explains that the input is not a Wolo Code, DIGIPIN, or plus code. The typed value is centered in a theme-aware teal. Matching primary-accent Edit code and Search map buttons sit on the left and right edges with a minimum gap and reverse-play / play icons. |
| Locate Permission Dialog | `LocateRight.php` | User-facing location permission request flow. |
| Incompatible Browser Dialog | `Incompatible_browser.html` | Allows the app to warn and optionally continue when browser support is insufficient. |
| Notifications | `#notification_top`, `#notification_bottom`, `showNotification()` | Lightweight messaging for examples, copy results, decode input hints, and status. Bottom notifications share `#map_bottom_stack` with the Address Panel and Location Accuracy Indicator so they stack above those cards instead of overlapping them, and they fade out when dismissed. Overlay dialogs and `#notification_top` stay outside that dock. |

## Icon Resources

| Icon | Purpose |
| --- | --- |
| `Map-terrain.svg` | Roadmap/Terrain map-type action icon. |
| `Map-satellite.svg` | Satellite map-type action icon. |
| `Map-osm.svg` | OpenStreetMap map-type action icon. |
| `Map-apple.svg` | Apple Maps map-type action icon. |
| `Map-esri.svg` | Esri map-type action icon. |
| `Map-microsoft.svg` | Microsoft Maps map-type action icon. |
| `Wolo-code.svg` | Plain Wolo Code input action icon. |
| `More.svg` | Action Menu launcher. |
| `Info.svg` | Info action. |
| `Location.svg` | Current-location action on the map. |
| `Location-source.svg` | Geolocation city-source action on Wolo Code Input View; selected state uses the primary accent. |
| `Globe.svg` | IP-derived city source action; selected state uses the primary accent. |
| `Hamburger.svg` | Previous-city popup action. |
| `Proceed.svg` | Submit/proceed action for map and decode inputs, and Search map in the unrecognized-code dialog. |
| `Reverse.svg` | Left-facing play triangle for Edit code in the unrecognized-code dialog. |

## Implementation Notes

- `toggleMapType()` remains as the legacy three-state cycle used by older flows: Decode View, Map View, and Satellite View.
- `toggleMapViewType()` is the newer map-only toggle used by the visible map type controls; it skips disabled map sources.
- `activateMapType()` opens the affixed default map source (Google terrain, OSM, Apple Maps, Esri, or Microsoft Maps).
- Apple Maps uses MapKit JS (`#apple_map`) for tiles only. Google Maps stays on top as a transparent interaction layer for clicks, markers, Places search, geocoding, and city add. Pan follows with `scheduleAppleMapFollow()`; MapKit region updates use `setRegionAnimated(..., false)`.
- `activateSatelliteMapType()` is used when the Decode View Action Menu satellite icon needs to enter Satellite View directly, and falls back to the default source when Google Maps is disabled.
- `toggleDecodeView()` is the newer view toggle used by the Action Menu Wolo Code input control.
- Toggle icons are rendered as paired inline SVG resources, stacked in one fixed-size slot, and switched by `body.decode` and `body.satellite` state classes.
