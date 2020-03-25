// .\Script
var pendingLocate = false;

// Code\Code
var FUNCTIONS_BASE_URL = 'https://wolo.codes/api';
//'http://localhost:5000/waddress-5f30b/us-central1';
var curEncRequestId = 0;
var curDecRequestId = 0;
var curAddCityRequestId = 0;

// Code\Copy_wcode
var city_styled_wordlist = [];
var cityNameList;

var WCODE_CODE_COPIED_MESSAGE = "Wolo code copied to clipboard";
var WCODE_LINK_COPIED_MESSAGE = "Wolo code link copied to clipboard";

// Code\Core
var PURE_WCODE_CITY_PICKED = "Since your city is not set - city was chosen from the last location";
var PURE_WCODE_CITY_FAILED = "Since your city is not set - you must first choose the city or preceed the Wolo code with city name";
var pendingPosition;
var pendingWords;
var wordList;
var current_city_gp_id;
var is_current_city;

// Code\Model
var code_city;
var code_wcode;
var code_postition;

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

var INCORRECT_WCODE = 'INCORRECT INPUT! Should be at least 3 Wolo code words, optionally preceded by a city. E.g: "Bengaluru cat apple tomato"';
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
var watch_location_notice_timer;
var pendingFocusPos;

// Focus
var selfBoundsChangedCount = 1;

// QR
var mode_preview = false;
var qr_address_active_first = true;
var mode_preview_activated = false;

// Notification
var NOTIFICATION_DURATION_DEFAULT = 2500;
var NOTIFICATION_DURATION_LONG = 10000;

// Account Dialog
var saveList;
var lastActiveSaveEntry;
var account_dialog_address_active_first;

// Title
var current_title;
var current_segment;
var current_address;
