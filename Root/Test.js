
//var city_begin = { "lat": 10.767, "lng": 12.76876 };
//var curPos = { "lat": 12.67876, "lng": 14.676876 };

var city_begin = { "lat": 12.831878, "lng": 80.062018 };
var curPos = { "lat": 12.909612, "lng": 80.227136 };

var code = encode(city_begin, curPos);
//decode(city_begin, code);

var code = encode(city_begin, curPos);
decode(code.split(" "));
