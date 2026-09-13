# App Section Names

Use these names consistently in code comments, tickets, copy docs, and design notes.

## View Names

| View | Use this name | Current implementation signal | Purpose |
| --- | --- | --- | --- |
| First-run cookie consent screen | Cookie Consent View | cookie/privacy copy inside `#overlay` | First visit state shown before the app accepts anonymous cookies and third-party service usage. |
| Wolo Code input page | Wolo Code Input View | `body.decode`, `#decode_interface_overlay`, `#decode_input` | Entry state for typing, pasting, or resolving a Wolo Code before moving into the map flow. |
| Terrain map page | Terrain Map View | `body.map`, Google Maps `ROADMAP`, `#map`, `#pac-input` | Primary map interaction state for searching places, selecting points, encoding locations, and viewing decoded results on the standard Google map. |
| Google Satellite map page | Google Satellite View | `body.satellite`, Google Maps `SATELLITE`, `#map`, `#pac-input` | Imagery-based map interaction state for the same location workflows when satellite context is useful. |
| OpenStreetMap page | OSM Map View | `body.osm`, OSM tiles, `#map`, `#pac-input` | Map interaction state using OpenStreetMap tiles when that source is enabled or affixed as default. Locate/decode cap at native OSM street zoom. If tiles 404, the camera steps back and a bottom notification says `Map data not yet available`. |
| Apple Maps page | Apple Maps View | `body.apple`, `#apple_map` MapKit JS, `#map`, `#pac-input` | Map interaction state using Apple MapKit JS for tiles when `apple_maps_token` is configured. Google Maps remains the interaction layer for encode/decode, search, and city add. Apple tiles follow the Google camera during drag with a CSS transform instead of committing MapKit’s region on every move. |
| Esri page | Esri Map View | `body.esri`, Esri World Street Map tiles, `#map`, `#pac-input` | Map interaction state using Esri street tiles when that source is enabled or affixed as default. |
| Microsoft Maps page | Microsoft Maps View | `body.microsoft`, Bing tiles, `#map`, `#pac-input` | Map interaction state using Microsoft/Bing road tiles when that source is enabled or affixed as default. |
| Location permission prompt | Location Access Prompt | `#locate_right_message` inside `#overlay` | Consent dialog shown after the user taps Locate and the app needs permission to use automatic location detection. |
| Active location detection indicator | Location Accuracy Indicator | `#accuracy_container`, `#accuracy_meter`, `#proceed_progress` | Temporary locate-in-progress state that shows accuracy in meters and a duration progress bar before proceeding. |
| Selected-location Wolo Code popup | Location Wolo Label View | `infoWindow`, `#infowindow_code`, `#infowindow_actions` | Map label shown above the selected location marker with the city, Wolo Code, and result actions. |
| Printable/shareable label dialog | QR Label View | `#qr_container` | Overlay dialog for editing, previewing, downloading, printing, and saving the selected Wolo Code label. |
| Logged-in address book dialog | Account Address Book View | `#account_dialog_container`, `#account_dialog` | Account dialog reached from the Account Button after login; lists saved Wolo Code addresses. |
| App information dialog | Info Modal View | `#info_message`, `#info_intro`, `#info_full`, `#info_links` | Overlay dialog explaining Wolo Code format, usage steps, app links, and policy/contact details. |

## Cookie Consent View

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Dimming layer | Cookie Consent Scrim | `#overlay` | Full viewport | Dims the app while the first-run consent card is active. |
| Consent card | Cookie Consent Card | cookie/privacy copy in overlay | Center of viewport | Explains anonymous cookies and third-party services before app use. |
| Consent brand area | Cookie Consent Brand | Wolo logo and tagline links | Top of consent card | Identifies Wolo Code before the user continues. |
| Policy link | Cookie Policy Link | `/policy` link | Inside consent copy | Opens cookie and privacy policies. |
| Continue control | Cookie Consent Proceed Button | unlabeled proceed button with front-arrow icon | Centered below consent copy | Accepts the first-run prompt and reveals the active app view. |
| Author credit | Cookie Consent Credit | author link | Bottom-right of consent card | Shows the creator credit inside the first-run card. |

## Wolo Code Input View

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Full-screen input surface | Wolo Code Input Surface | `#decode_interface_overlay` | Full viewport | Covers the map with the plain input-focused state. |
| Code entry field | Wolo Code Input | `#decode_input`, `#decode_input_case` | Center of viewport | Accepts a Wolo Code such as `\ Wolo Code /`, a DIGIPIN, or a plus code. CSS shows DIGIPIN and plus-code values in uppercase while `#decode_input_case` is `:valid`; other input stays lowercase. |
| Alternate-code tip | Decode Input Alternate Tip | `#notification_bottom`, `showDecodeInputAltTip()` | Bottom notification while the Wolo Code Input is focused | Notes that DIGIPIN and plus codes can also be entered, then fades out. |
| City hint row | Input City Hint | `#decode_city_context`, `#decode_input_city` | Slightly above centered Wolo Code Input, below city source controls | Shows the current or inferred city context for decoding after the city value is validated; startup uses a previous city when available and otherwise falls back to IP city without requesting browser geolocation. During geolocation city lookup, it shows `Loading...`. |
| City source controls | Input City Source Controls | `#decode_city_geolocation`, `#decode_city_ip`, `#decode_city_history_toggle` | Above Input City Hint | Lets the user request coarse geolocation, switch to IP city, or open the previous-city popup using action-sized, widely spaced controls whose full circular button grows slightly on hover, active, or opening states and animates back when inactive. The selected source uses the primary icon accent; inactive sources stay muted. Unsupported, invalid, or non-gesture geolocation attempts use the standard city lookup failure state. |
| Icon caption overlay | Input Icon Guide | `body.decode-icon-guide`, `#decode_icon_guide_scrim`, `.decode_icon_caption`, `DecodeIconGuide.js`, `requestDecodeIconGuide()` | Vertically centered with the input cluster; chrome captions sit by Account, Info, Locate, and Map | Names each unlabeled icon on Wolo Code Input View for the first two launches (`localStorage` `wolo-decode-icon-guide-launches`). An 80% dark scrim sits behind the labels on the input view background; the map stays covered. A tap anywhere dismisses it, and it also fades out after 3 seconds. Hidden while a modal overlay is open. Info Modal View can reopen it with **Show icon labels**. On very small screens the centered cluster can shift up so bottom notifications stay visible. |
| Previous city popup | Input Previous City Popup | `#decode_city_history_message`, `#decode_city_history_message_list` | Center overlay when opened | Lists previously used cities cached from Wolo Code input, decoded/encoded cities, or geolocation-derived city selection. A tap selects a city; a long-press offers Remove to delete that city from the list. |
| Input suggestions | Wolo Code Suggestions | `#decode_input_suggestion_result` | Above or near centered Wolo Code Input | Shows suggested Wolo Code tokens and resizes the input as needed. |
| Submit control | Wolo Code Proceed Button | `#decode_input_button` | Immediately right of Wolo Code Input | Starts decode from the input page. |
| Unrecognized input dialog | Unrecognized Code Dialog | `#invalid_code_message`, `showInvalidCodeDialog()` | Overlay | Explains that decode did not recognize a Wolo Code, DIGIPIN, or plus code. Centers the typed value and shows padded, matching primary-accent Edit code (reverse-play) and Search map (play) buttons. Search map opens Map View and the Address Panel. |
| Terrain map control | Terrain Map View Button | `#decode_map_view_button`, `toggleDecodeView()` | Bottom-right | Always shows the terrain SVG. Switches from Wolo Code Input View to the affixed default map source (Google terrain, OSM, Apple Maps, Esri, or Microsoft Maps). |

## Terrain Map View

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Map canvas | Terrain Map Canvas | `#map`, Google Maps `ROADMAP` | Full viewport | Standard map surface for selection, pan, zoom, and place context. |
| Search field | Place Search Input | `#pac-input` | Top-left | Accepts place names and Wolo Codes while in the map flow. CSS shows DIGIPIN and plus-code values in uppercase while the field is `:valid`; other input stays lowercase. |
| Search affordance | Search Icon | `#search_icon` | Inside left edge of Place Search Input | Visual cue for the map search field before input focus. |
| Search suggestions | Map Input Suggestions | `#map_input_suggestion_result` | Top-left, above or near Place Search Input | Shows suggestions for the map search field. |
| Submit control | Map Proceed Button | `#decode_button` | Immediately right of Place Search Input | Resolves the current map search or code input. |
| Location control | Locate Button | `#location_button` | Bottom-center | Starts or retries user location detection. |
| Map type control | Map Type Button | `#map_type_button`, `toggleMapViewType()` | Bottom-right corner when shown | Cycles to the next enabled map layer. The icon and tooltip both show that next layer (Google Satellite view after Google Maps). |
| Result marker | Location Marker | `marker`, `focus___()`, `encode()` | On selected map point | Marks the selected or decoded location. |
| Code result popup | Wolo Code Info Window | `infoWindow`, `setInfoWindowText()` | Above Location Marker | Shows the generated Wolo Code and result actions. |

## Google Satellite View

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Map canvas | Google Satellite Map Canvas | `#map`, Google Maps `SATELLITE` | Full viewport | Imagery map surface for selection, pan, zoom, and place context. |
| Search field | Place Search Input | `#pac-input` | Top-left | Same search and code entry field used in Terrain Map View. |
| Search suggestions | Map Input Suggestions | `#map_input_suggestion_result` | Top-left, above or near Place Search Input | Same suggestion surface used by the map search field. |
| Submit control | Map Proceed Button | `#decode_button` | Immediately right of Place Search Input | Resolves the current map search or code input. |
| Location control | Locate Button | `#location_button` | Bottom-center | Starts or retries user location detection. |
| Map type control | Map Type Button | `#map_type_button`, `toggleMapViewType()` | Bottom-right corner when shown | Cycles from Google Satellite View to the next enabled map layer. |
| Result marker | Location Marker | `marker`, `focus___()`, `encode()` | On selected map point | Marks the selected or decoded location. |
| Code result popup | Wolo Code Info Window | `infoWindow`, `setInfoWindowText()` | Above Location Marker | Shows the generated Wolo Code and result actions. |

## Location Flow Views

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Permission dialog | Location Access Prompt | `#locate_right_message` | Center overlay | Asks whether the app may use automatic location detection after the Locate Button is clicked. |
| Permission title | Location Access Title | `#locate_right_message h2` | Top of Location Access Prompt | Shows `Location access`. |
| Permission explanation | Location Access Copy | `.message_dialog_body` inside `#locate_right_message` | Middle of Location Access Prompt | Explains that the user can grant location access or pick a location manually. |
| Permission approve action | Location Access Yes Button | `#locate_right_message_yes` | Bottom of Location Access Prompt | Continues into automatic location detection. |
| Permission deny action | Location Access No Button | `#locate_right_message_no` | Bottom of Location Access Prompt | Closes the prompt and leaves manual map selection available. |
| Permission reminder option | Location Access Do-Not-Ask Option | `#locate_right_message_dnd`, `#locate_right_message_dnd_input` | Bottom of Location Access Prompt when shown | Lets the user avoid repeated app-level location prompts. |
| Accuracy strip | Location Accuracy Indicator | `#accuracy_container` | Inside `#map_bottom_stack`, above the Address Panel when both are open | Shows active location accuracy feedback while geolocation is running. |
| Accuracy value | Location Accuracy Meter | `#accuracy_meter`, `#accuracy_meter_unit` | Inside Location Accuracy Indicator | Shows current accuracy as `nnn m` or `99+ m`. |
| Accuracy status dot | Location Accuracy Dot | `#accuracy_indicator` | Left side of Location Accuracy Indicator | Blinks and changes color based on current accuracy. |
| Locate proceed control | Location Proceed Button | `#proceed_button` | Right side of Location Accuracy Indicator | Lets the user proceed with the current location fix. |
| Locate progress bar | Location Proceed Progress | `#proceed_progress` | Inside Location Proceed Button | Shows the remaining automatic locate duration. |
| Accuracy circle | Location Accuracy Circle | `accuCircle` | Around current location on map | Visualizes the geolocation accuracy radius. |
| Current location dot | Current Location Dot | `myLocDot` | On detected location | Shows the live device location point. |
| Location marker | Location Wolo Marker | `marker` | On selected location | Marks the point used to encode the Wolo Code. |
| Wolo label popup | Location Wolo Label View | `infoWindow`, `#infowindow_code` | Above Location Wolo Marker | Shows the city and Wolo Code for the selected location. DIGIPIN and plus code are shown on the Address Panel instead. |
| Wolo label actions | Location Wolo Label Actions | `#infowindow_actions` | Bottom of Location Wolo Label View | Hosts address, external-map launch, and QR label actions. |
| Address action | Wolo Label Address Action | `#show_address_button` | Left action in Location Wolo Label View | Opens or shares the selected address details. |
| External map action | Wolo Label External Action | `#external_launch_button` | Center action in Location Wolo Label View | Opens the location in the platform map app. |
| QR label action | Wolo Label QR Action | `#share_qr_button` | Right action in Location Wolo Label View | Opens QR Label View; long press downloads a minimal QR label. |

## QR Label View

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| QR overlay dialog | QR Label View | `#qr_container` | Center overlay | Shows the printable/shareable Wolo Code label editor. Clicking the dimmed overlay outside the dialog closes it. |
| QR title | QR Label Title | `#qr_container h2` | Top of QR Label View | Labels the dialog as `Label`. |
| QR save control | QR Label Save Button | `#qr_save` | Top-left of QR Label View | `save` text that saves the current title, segment, and address for the signed-in user and confirms with `Address saved` above the overlay. |
| QR close control | QR Label Close Button | `#qr_close` | Top-right of QR Label View | Closes the QR label overlay. |
| QR label surface | QR Label Surface | `#qr_label` | Main body of QR Label View | Contains the composed label preview. |
| QR brand area | QR Label Brand | `#logo_qr`, `#logo_wolo_qr`, `#logo_codes_qr` | Top of QR Label Surface | Identifies the label as Wolo Code. |
| QR title inputs | QR Label Title Fields | `#qr_title_main`, `#qr_title_segment` | Below QR brand area | Lets the user edit title and segment text, with `Title – e.g. Home` and `Segment – e.g. Main gate` hints. |
| QR code text | QR Label Wolo Code | `#qr_wcode`, `#qr_wcode_city`, `#qr_wcode_code` | Middle of QR Label Surface | Shows the encoded city and Wolo Code. |
| QR address field | QR Label Address | `#qr_address` | Below QR code text | Lets the user edit the displayed address. |
| QR app URL | QR Label App URL | `#qr_webapp_url` | Bottom of QR Label Surface | Shows the app URL for the label. |
| QR controls | QR Label Controls | `#qr_controls` | Bottom of QR Label View | Hosts preview, download, and print actions. |
| QR preview action | QR Preview Button | `#qr_preview` | Left control in QR Label Controls | Toggles the printable preview state with an eye-only icon. |
| QR download action | QR Download Button | `#qr_download` | Center control in QR Label Controls | Downloads the label. |
| QR print action | QR Print Button | `#qr_print` | Right control in QR Label Controls | Opens the print-oriented QR label mode. |

## Account Address Book View

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Account overlay dialog | Account Address Book View | `#account_dialog_container`, `#account_dialog` | Center overlay | Shows the logged-in account profile and saved Wolo Code address tools. |
| Account title | Account Dialog Title | `#account_dialog_label` | Top of dialog | Shows `Account`. |
| Account close control | Account Dialog Close Button | `#account_dialog_close` | Top-right of dialog, inset equally from the dialog edge | Closes the account dialog. |
| Profile summary | Account Profile Summary | `#account_dialog_main`, `#account_dialog_profile` | Top section of dialog | Groups the signed-in user's photo, display name, and email. The logout icon appears when hovering or focusing this block (always visible on touch). Stays visible when the saved list is expanded or scrolled. |
| Account prefs | Account Prefs Section | `#account_dialog_prefs` | Under the profile row | Holds Appearance, Map source, and the divider. Folds away while the saved address list is open. |
| Display name | Account Display Name | `#account_dialog_display_name` | Top profile summary | Shows the signed-in user's name. |
| Email address | Account Email | `#account_dialog_email` | Under display name | Shows the signed-in user's email address. |
| Profile photo | Account Profile Photo | `#account_dialog_avatar`, `#account_dialog_user_image`, `#account_dialog_default_image` | Left of name and email | Shows the signed-in user's photo, or the default account icon. |
| Appearance selector | Account Theme Selector | `.theme-selector` | Profile summary, inside `#account_dialog_prefs` | Sets light, dark, or system theme. Tiles have extra space between them. Icons stay large until hover or focus, then shrink so System/Light/Dark labels can appear. The selected theme keeps its label visible in the primary accent. Native tooltips stay off. Light-mode icons stay gray instead of using the primary accent; dark-mode hover uses a white/gray highlight instead of a filled primary-accent button. Folds with Map source when the saved list is expanded. |
| Section heading | Account Section Label | `.dialog-sub-label` | Above Appearance, Map source, and Saved | Uses the muted dialog label color, not the primary accent. |
| Map source selector | Account Map Source Selector | `.map-source-selector`, `Map_source_selector.php` | Under Appearance, inside `#account_dialog_prefs` | Each map source has a default inbound arrow before an enable/disable toggle beside its label. Only the active default inbound arrow stays visible; an inactive inbound arrow appears when that row is hovered or focused. Extra padding sits below the last row. The default source label uses the primary accent. Folds with Appearance when the saved list is expanded. |
| Logout control | Account Logout Button | `#account_dialog_logout_button`, `Logout.svg` | Right of name and email, shown on hover or focus of Account Profile Summary | Signs the user out. |
| Saved heading | Saved Addresses Heading | `#account_dialog_saved_heading` | Above saved tools | Hosts the Saved label plus expand and add controls. |
| Saved list hit area | Saved List Hit Area | `#account_dialog_saves_hit` | Saved label through the caret | Clicking Saved, the empty space, or the caret expands or collapses the saved address list. |
| Add address control | Saved Add Toggle | `#account_dialog_add_toggle`, `Plus.svg` | Far right of Saved Addresses Heading | Expands the add-current-address form. |
| Saved list control | Saved List Toggle | `#account_dialog_saves_toggle`, `Caret.svg` | Left of the add control | Expands or collapses the saved address list. The list starts collapsed. Expanding the list folds `#account_dialog_prefs` (Appearance and Map source) so the profile row stays visible. |
| Add address section | Current Address Section | `#account_dialog_options` | Under Saved heading when add is expanded | Lets the user save the current Wolo Code address. Title, segment, and address fields share the same left inset as saved tiles. |
| Current title field | Save Title Field | `#save_title_main` | Current Address Section | Captures the saved address title. Hint placeholder is `e.g. Home`. |
| Current segment field | Save Segment Field | `#save_title_segment` | Current Address Section | Captures the optional saved address segment. Hint placeholder is `e.g. Main gate`. |
| Current address field | Save Address Field | `#save_address` | Current Address Section | Captures or edits the address text for the current Wolo Code. |
| Cancel save control | Cancel Address Button | `#account_dialog_cancel_button`, `onAccountDialogCancel()` | Left side under Save Address Field | Closes the add/edit form without saving. |
| Save control | Save Address Button | `#account_dialog_save_button` | Right side under Save Address Field | Saves the current Wolo Code address to the signed-in user's data. Requires a located or decoded Wolo Code. |
| Saved section | Saved Addresses Section | `#account_dialog_save_list_container` under `Saved` | Lower section of dialog, hidden until the list caret is expanded | Lists the user's saved Wolo Code addresses. This region scrolls with reserved scrollbar space so tile width stays stable; the scrollbar follows light/dark theme. Account details above it stay in place. |
| Saved loader | Saved Addresses Loader | `#account_dialog_save_list_loader` | Saved Addresses Section | Shows loading state while saved addresses are fetched. |
| Saved empty state | Saved Addresses Empty State | `#account_dialog_save_list_placeholder` | Saved Addresses Section | Shows empty state when no addresses are saved. |
| Saved address list | Saved Address List | `#account_dialog_save_list` | Saved Addresses Section | Contains saved address rows. |
| Saved address row | Saved Address Row | generated row in `#account_dialog_save_list` | Saved Address List | Collapsed rounded tile showing saved title and indented segment; expands on press with an animated height change. |
| Saved row header | Saved Address Header | `.row-header`, `.row-title`, `.row-segment`, `.row-menu-toggle` | Top of Saved Address Row | Shows the title as the parent line and an indented segment as the child, with a three-dot menu on the top right that appears on hover (or always on touch). In dark mode the menu uses the primary background and white dots. |
| Saved row address | Saved Address Text | `.row-address` | Expanded Saved Address Row, under the Wolo Code | Shows the saved street address with the same Roboto, left-aligned gray treatment as the map Address Panel. |
| Saved row code | Saved Address Wolo Code | `.row-code` | First block of expanded Saved Address Row | Shows the saved Wolo Code as `\ city` on the first line and `word-1 word-2 word-3 /` on the second. |
| Saved row controls | Saved Address Controls | `.row-controls` | Right side of expanded Saved Address Row | Hosts the open/process action. |
| Saved row menu | Saved Address Menu | `#account_dialog_row_menu`, `.row-menu-toggle`, `More.svg` | Top-right of Saved Address Header | Overflow menu with Edit and Delete. The three-dot control is hidden until the tile is hovered, the control is focused, or the menu is open. |
| Saved edit action | Saved Address Edit Action | `.row-edit`, `editSaveEntry()` | Saved Address Menu | Opens the add form with the saved title, segment, and street text so the existing record can be updated. |
| Saved delete action | Saved Address Delete Action | `.row-delete`, `deleteSaveEntry()` | Saved Address Menu | Deletes the saved address. |
| Saved open action | Saved Address Open Action | `.row-process`, `processSaveEntry()` | Saved Address Controls | Opens the saved Wolo Code on the map. Long press uses the external maps flow. |

## Info Modal View

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Info overlay dialog | Info Modal View | `#info_message` | Vertically and horizontally centered overlay | Shows app information, introductory consent copy, format guidance, and links. Hidden overlay siblings do not occupy layout, so the visible card can sit in the middle of the scrim. |
| Info close control | Info Close Button | `#info_message_close` | Top-right of Info Modal View when full/links view is active | Closes the Info modal. |
| Info brand area | Info Brand | `#logo_info`, `#logo_wolo_info`, `#logo_codes_info` | Top of Info Modal View | Shows Wolo Code branding inside the dialog. Light-mode logo links keep a faint outline; dark mode uses no outline. |
| Info headline | Info Headline | `Info_common.html` `h1` | Below Info Brand | Shows the linked headline `simplest precise address`. |
| Intro view | Info Intro View | `#info_intro` | Main body when intro is active | Shows cookie/privacy notice and the intro proceed control. |
| Intro policy link | Info Intro Policy Link | `/policy` link inside `#info_intro` | Inside Info Intro View copy | Opens cookie and privacy policies. |
| Intro proceed control | Info Intro Proceed Button | `#info_intro_close_button` | Bottom of Info Intro View | Closes the intro prompt and continues into the app. |
| Full explanation view | Info Full View | `#info_full` | Main body when full info is active | Explains Wolo Code structure and app usage steps. |
| Icon labels control | Info Icon Labels Button | `#info_show_icon_labels`, `showInfoIconGuide()` | Bottom-left of Info Modal View | Closes Info Modal View and shows Input Icon Guide overlay labels on Wolo Code Input View. Hidden during Info Intro View. |
| Wolo Code format line | Info Wolo Code Format | `#wcode_format` | Top of Info Full View | Shows `\ City Word 1 Word 2 Word 3 /`. |
| Wolo Code example line | Info Wolo Code Example | `#wcode_example` | Under Info Wolo Code Format | Shows `e.g. \ Bengaluru cat apple tomato /`. |
| Address explanation | Info Address Parts Explanation | ordered list inside `#info_full` | Middle of Info Full View | Explains that an address has a city part and three-word location part. |
| City explanation | Info City Explanation | first ordered-list item inside `#info_full` | Address Parts Explanation | Explains that the city identifies the distinct city and can be omitted within the same city. |
| Three-word explanation | Info Three Words Explanation | second ordered-list item inside `#info_full` | Address Parts Explanation | Explains that the last three words specify where in the city and come from the word list. |
| Word list link | Info Word List Link | `https://wcodes.org/wordlist` link | Inside Three-word explanation | Opens the limited list of 1,024 words. |
| Steps section | Info Steps Section | `#info_full h2` and following `ul` | Lower part of Info Full View | Explains entering a Wolo Code, switching map modes, searching, pointing, or using current location. |
| Full view back control | Info Full Back Button | `#info_full_close_button` | Bottom of Info Full View | Closes the Info modal and restores full-info state for next open. |
| About link | Info About Link | `#wolo_about` | Bottom of Info Full View | Opens the Wolo Code about page. |
| Links view | Info Links View | `#info_links` | Main body when links view is active | Shows about, terms, privacy, contact, source, social, app, credits, version, and updated timestamp links/details. |
| Links table | Info Links Table | table inside `#info_links` | Top of Info Links View | Lists about, terms, privacy, contact, and source code links. |
| Social links | Info Social Links | `#social-links` | Middle of Info Links View | Links to Twitter, Facebook, and YouTube. |
| App download link | Info App Download Link | `#download-unified-url`, `#download-android-bottom` | Lower Info Links View | Links to app download routes and Google Play. |
| Credits link | Info Credits Link | `#credits` | Lower Info Links View | Links to open-source credits. |
| Version details | Info Version Details | `#software_info`, `#version`, `#updated` | Bottom of Info Links View | Shows app version and updated timestamp. |
| Info author credit | Info Author Credit | `#info_agency` | Bottom of Info Modal View | Shows the creator credit. |

## Shared App Parts

| Part | Use this name | Current implementation signal | Typical position | Purpose |
| --- | --- | --- | --- | --- |
| Brand lockup | App Logo | `#logo`, `#logo_surface`, `#logo_wolo`, `#logo_codes` | Top-right | Persistent brand link visible across the app views. `#logo_surface` draws an 8px padded frosted rectangle around the Wolo + CODE lockup in light mode; dark mode keeps the padding without that plate. |
| Account entry | Account Button | `#account` | Wolo Code Input View: top-left; map views desktop: top-right beside App Logo; mobile: top-right | Opens sign-in, account, and saved-address flows. |
| Bottom-left chrome host | Action Menu | `#action_menu` | Bottom-left | Hosts the Info Action on Wolo Code Input View and the Wolo Code Input Action on map views. The expandable radial menu is withdrawn. |
| About/help action | Info Action | `#action_menu_info`, `showInfo()` | Bottom-left on Wolo Code Input View | Opens app information and related links. Hidden on map views. |
| View toggle action | Wolo Code Input Action | `#action_menu_decode`, `toggleDecodeView()` | Bottom-left on map views | Switches from map views to Wolo Code Input View. Hidden on Wolo Code Input View; use Terrain Map View Button instead. |
| Map-type action | Map Type Button | `#map_type_button`, `toggleMapViewType()` | Bottom-right on map views | Cycles enabled map layers. Hidden on Wolo Code Input View and when only one map layer is available. Native `title` tooltips and icons both name the next map. |
| Notifications | Notification Bars | `#notification_top`, `#notification_bottom` | Top-center and in `#map_bottom_stack` above the Address Panel | Shows short guidance, errors, and flow feedback. The bottom bar stacks with the Address Panel and Location Accuracy Indicator; the top bar stays below search. |
| Address panel | Address Panel | `#address_text` and Address fragment | Bottom of `#map_bottom_stack`, above Locate/footer | Shows and copies the resolved address for a selected Wolo Code. DIGIPIN (India) and plus code rows keep labels on the left and values on the right; plus code is encoded locally if geocoding omits it. Theme follows light/dark mode. Drag-selected text copies only the selection. Steering with a DIGIPIN or plus code keeps the panel open. Locate hides the panel. |
| Modal layer | Overlay Layer | `#overlay` | Full viewport | Hosts info, redirects, city selection, QR, account, crash, and browser-support dialogs. |
| Unexpected error dialog | Unexpected Error Dialog | `#exception_message`, `#exception_message_title`, `#exception_log`, `#exception_message_support` | Center overlay | Blocking crash prompt with a warning icon and `Error occured!` title. No close button. Shows Clear cache & reload and a support mailto. Press and hold the title to show the crash message and Continue. |
| Info dialog | Info Modal View | `#info_message`, `#info_show_icon_labels` | Center overlay | Explains Wolo Code format, usage steps, and policy/contact details. The bottom-left **Show icon labels** button closes the dialog and shows Input Icon Guide overlay labels. |
| QR label dialog | QR Label View | `#qr_container` | Center overlay | Builds, previews, downloads, and prints a Wolo Code label. |
| Account dialog | Account Address Book View | `#account_dialog_container`, `#account_dialog` | Center overlay | Shows profile, logout, appearance, map source prefs, and saved addresses. |
| Footer credit | Footer Credit | `#footer-content-container`, `#footer-content` | Bottom-center | Shows license year and author credit. |
| Map source credit | Map Source Attribution | `.map_attribution`, MapKit logo on `#apple_map` | Bottom-left, close to the bottom edge after a gap from the bottom-left chrome; one line on widescreen | Credits OSM, Esri, or Microsoft for non-Google map tiles. Apple Maps uses MapKit’s logo only (no extra Apple text). |
| Bottom info-card dock | Map Bottom Stack | `#map_bottom_stack` | Bottom-center, `80px` above Locate/footer (`128px`/`140px` on Console) | Flex column that stacks the bottom notification, Location Accuracy Indicator, and Address Panel with an 8px gap so variable-height cards do not overlap. Overlay dialogs and `#notification_top` are not in this dock. Bottom notifications fade out when they expire. |

## Responsive Placement Notes

| Element | Desktop placement | Mobile placement | Current implementation signal |
| --- | --- | --- | --- |
| App Logo | Top-right in desktop map views | Top-center, horizontal lockup | `#logo`, `Base.css`, `Base_narrow.css` |
| Account Button | Top-left in Wolo Code Input View; top-right beside App Logo in desktop map views | Top-right | `#account`, `.decode #account`, `Base_narrow.css` |
| Place Search Input | Top-left | Lower than desktop, near top with width `calc(100vw - 66px)` | `#pac-input`, `Base_narrow.css` |
| Map Proceed Button | Right of Place Search Input | Top-right beside mobile Place Search Input | `#decode_button`, `Base_narrow.css` |
| Search Icon | Inside Place Search Input | Moves with mobile Place Search Input | `#search_icon`, `Base_narrow.css` |
| Notification Top Bar | Top-center below desktop search/logo area | Lower top-center, below mobile search row | `#notification_top`, `Base_narrow.css` |
| Map Bottom Stack | Bottom-center above Locate Button | Same band; Console uses a higher dock offset | `#map_bottom_stack`, `Base.css` |
| Footer Credit | Bottom-center | Bottom-center with smaller text | `#footer-content-container`, `Base_narrow.css` |
| Map Source Attribution | Bottom-left, close to the bottom edge after a gap from the bottom-left chrome; one line on widescreen | Bottom-left, close to the bottom edge after a gap from the bottom-left chrome; narrower so it stops before Locate | `.map_attribution`, `Root_narrow.css` |
| Info Action | Bottom-left on Wolo Code Input View | Bottom-left on Wolo Code Input View | `#action_menu_info` |
| Wolo Code Input Action | Bottom-left on map views | Bottom-left on map views | `#action_menu_decode` |
| Map Type Button | Bottom-right corner | Bottom-right corner | `#map_type_button` |
| Locate Button | Bottom-center | Bottom-center | `#location_button` |
| Camera D-pad | Bottom-right, same 39px disc as Map Type Button, with a small gap to its left | Bottom-right, same 39px disc as Map Type Button, with a small gap to its left | `#map gmp-internal-camera-control` |

Chrome icon controls (Account, Go, Locate, Map Type, Info Action, Wolo Code Input Action, and city-source buttons) show a native tooltip from `title`. The first two launches also show those icon captions on Wolo Code Input View over an 80% dark scrim; a tap or a 3-second timeout fades the overlay away. Info Modal View can show that overlay again with **Show icon labels**. Appearance theme buttons omit native tooltips; hovering or focusing shrinks the icon so the System/Light/Dark label can appear. Light-mode theme icons stay gray instead of using the primary accent; dark-mode hover uses a white/gray highlight instead of a filled primary-accent button.

Related naming:

- `Terrain Map View` is the preferred product name for the current `body.map` roadmap state.
- `Google Satellite View` is a full view, not just a skin, because it has its own `body.satellite` state and theme background.
- `Wolo Code Input View` replaces the older `Decode View` wording in product-facing docs. Use `decode` only when referring to implementation state or functions.
- Table positions describe the default desktop layout unless a row explicitly calls out mobile behavior.
- Use `Responsive Placement Notes` when documenting controls whose positions change between desktop and mobile layouts.
