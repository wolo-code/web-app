// .\Script
var pendingLocate = false;

// Code\Code
var FUNCTIONS_BASE_URL = 'https://location.wcodes.org/api';
//'http://localhost:5000/waddress-5f30b/us-central1';
var curEncRequestId = 0;
var curDecRequestId = 0;
var curAddCityRequestId = 0;

// Code\Copy_wcode
var city_styled_wordlist = [];
var cityNameList;

var WCODE_CODE_COPIED_MESSAGE = "WCode copied to clipboard";
var WCODE_LINK_COPIED_MESSAGE = "WCode link copied to clipboard";

// Code\Core
var PURE_WCODE_CITY_PICKED = "Since your city is not set - city was chosen from the last location";
var PURE_WCODE_CITY_FAILED = "Since your city is not set - you must first choose the city or preceed the WCode with city name";

// Address
var latLng_p = '';
var address = '';
var gpId = '';

// Base
var CURRENT_VERSION = 1;
var initWCode = false;
var initWCode_jumpToMap = false;

// City
var DEFAULT_WCODE = ['bengaluru', 'diesel', 'hall', 'planet'];
var pendingCity = false;
var pendingCitySubmit = false;

var INCORRECT_WCODE = 'INCORRECT INPUT! Should be at least 3 WCode words, optionally preceded by a city. E.g: "Bengaluru cat apple tomato"';
var MESSAGE_LOADING = 'Loading ..';
var LOCATION_PERMISSION_DENIED = "Location permission was denied. Click to point or retry with the locate button";

var CITY_RANGE_RADIUS = 32.767;

var init_map_mode = false;

//Location
var location_button_begin_time;
var location_button_PRESS_THRESHOLD = 500;
var locating = false;
var locate_button_pressed = false;
var watch_location_timer;
var watch_location_id;

// QR
var mode_preview = false;
var qr_address_active_first = true;
var mode_preview_activated = false;
