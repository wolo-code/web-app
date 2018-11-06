// Address
var latLng_p = '';
var address = '';
var gpId = '';

// Database
var data_index = 0;

// Map
var markers = [];

var N = 32768;
var A = 6378137;
var B = 6356752.314140;
var E_SQ = (A*A-B*B)/(A*A);
var DEG_RAD = Math.PI/180;

// Script
var auth_processed = false;
var map_processed = false;

var pendingEntry_lat_lng = null;
