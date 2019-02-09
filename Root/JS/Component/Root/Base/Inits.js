// .\Script
var pendingLocate = false;

// Code\Code
var FUNCTIONS_BASE_URL = 'https://location.wcodes.org/api';
//'http://localhost:5000/waddress-5f30b/us-central1';
var curEncRequestId = 0;
var curDecRequestId = 0;

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

// City
var DEFAULT_WCODE = ['bangalore', 'diesel', 'hall', 'planet'];
var pendingCity = false;
var pendingCitySubmit = false;

// Map
var infoWindow_open = false;

var INCORRECT_WCODE = 'INCORRECT INPUT! Should be at least 3 WCode words, optionally preceded by a city. E.g: "Bangalore cat apple tomato"';
var MESSAGE_LOADING = 'Loading ..';
var LOCATION_PERMISSION_DENIED = "Location permission was denied. Click to point or retry with the locate button";

var CITY_RANGE_RADIUS = 32.767;
