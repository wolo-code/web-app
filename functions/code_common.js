// 2^(10+10/2)
const N = 32768;
exports.N = N;
const A = 6378137;
const B = 6356752.314140;
const E_SQ = (A*A-B*B)/(A*A);
const DEG_RAD = Math.PI/180;

exports.getCityBegin = function getCityBegin(cityCenter) {
	const lat = cityCenter.lat - lat_span_half(cityCenter.lat)*N;
	const lng = cityCenter.lng - lng_span_half(cityCenter.lat)*N;
	return {'lat': lat, 'lng': lng};
}

exports.lat_span_half = lat_span_half;
function lat_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	const x = Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r));
	return Math.abs((x*x*x)/(DEG_RAD*A*(1-E_SQ)));
}

exports.lng_span_half = lng_span_half;
function lng_span_half(lat) {
	const lat_r = DEG_RAD*lat;
	return Math.abs(Math.sqrt(1-E_SQ*Math.sin(lat_r)*Math.sin(lat_r))/(DEG_RAD*A*Math.cos(lat_r)));
}
