function formatNumber(number) {
	WIDTH = 2;
	if (String(number).length < WIDTH)
		return ' '+number;
	else
		return number;
}

function formatDate(date) {
	var monthNames = [
		"Jan", "Feb", "Mar",
		"Apr", "May", "Jun", "Jul",
		"Aug", "Sep", "Oct",
		"Nov", "Dec"
	];

	var day = date.getDate();
	var monthIndex = date.getMonth();
	var hour = date.getHours();
	var minute = date.getMinutes();
	return monthNames[monthIndex] + ' ' + formatNumber(day) + ' ' + formatNumber(hour) + ':' + formatNumber(minute);
}

function unquote(str) {
	return str.replace(/^"(.*)"$/, '$1');
}
