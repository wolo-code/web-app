// const FUNCTIONS_BASE_URL;
// var curAddCityRequestId;

// 2^(10+5)
const N = 32768;
const A = 6378137;
const B = 6356752.314140;
const E_SQ = (A*A-B*B)/(A*A);
const DEG_RAD = Math.PI/180;

function lat_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	const x = Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r));
	return Math.abs((x*x*x)/(DEG_RAD*A*(1-E_SQ)));
}

function lng_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	return Math.abs(Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r))/(DEG_RAD*A*Math.cos(lat_r)));
}

function encodeData(value, d) {
	const i = Math.round(value/d);
	if(i < 0 || i > N) {
		console.log("Error: Out of data limit");
		console.log("Value: " + value);
		console.log("d: " + d);
	}
	else
		return i;
}

function decodeData(data, d) {
	return data*d;
}

function getCityBegin(cityCenter) {
	const lat = cityCenter.lat - lat_span_half(cityCenter.lat)*N;
	const lng = cityCenter.lng - lng_span_half(cityCenter.lat)*N;
	return {'lat': lat, 'lng': lng};
}

function encode_(city, position) {
	const code = encode__(getCityBegin(city.center), position);
	for(var i of code)
		if(i < 0 || i > 1023) {
			console.log("Error: Out of WCode index limit");
			noCity(position);
			notification_top.classList.remove('hide');
			wait_loader.classList.add('hide');
		}
	setCodeWords(code, city, position);
}

function setCodeWords(code, city, position) {
	var message = [];

	for(const i of code)
		message.push(wordList.getWord(i));

	setCode(city, message, position);
}

function decode_(city, code) {
	var data = [];
	data[0] = wordList.indexOf(code[0]);
	data[1] = wordList.indexOf(code[1]);
	data[2] = wordList.indexOf(code[2]);
	var position = decode__(getCityBegin(city.center), data)	;
	setCodeCoord(city, position, code);
	notification_top.classList.add('hide');
	wait_loader.classList.add('hide');
}

function encode__(city_begin, position) {
	const lat_diff = encodeData(position.lat - city_begin.lat, lat_span_half(city_begin.lat)*2);
	const lng_diff = encodeData(position.lng - city_begin.lng, lng_span_half(city_begin.lat)*2);
	const word_index_1 = lat_diff >> 5;
	const word_index_2 = lng_diff >> 5;
	const word_index_3 = (lat_diff & 0x001F) << 5 | (lng_diff & 0x001F);
	const code = [word_index_1, word_index_2, word_index_3];

	return code;
}

function decode__(city_begin, code) {
	const word_index_1 = code[0];
	const word_index_2 = code[1];
	const word_index_3 = code[2];
	const lat_diff_bin = word_index_1 << 5 | word_index_3 >> 5;
	const lng_diff_bin = word_index_2 << 5 | word_index_3 & 0x001F;
	const lat_diff = decodeData(lat_diff_bin, lat_span_half(city_begin.lat)*2);
	const lng_diff = decodeData(lng_diff_bin, lng_span_half(city_begin.lat)*2);
	const lat = city_begin.lat + lat_diff;
	const lng = city_begin.lng + lng_diff;

	return({"lat":lat, "lng":lng});
}

function setCodeCoord(city, position, code) {
	focus__(city, position, code);
}
