function logCode(code, values) {
	console.log("Code:")
	console.log(code);
	console.log(values);
	console.log("--")
}

function logDifference(lat, long, values) {
	var lat_diff_pc = Math.round((lat - curPos.lat) * 1000000) / 1000000;
	var long_diff_pc = Math.round((long - curPos.lng) * 1000000) / 1000000;
	console.log("Difference:")
	console.log(lat_diff_pc + " " + long_diff_pc);
	console.log(curPos.lat + " " + curPos.lng);
	console.log(lat + " " + long);
	console.log(values)
	console.log("--")
}
