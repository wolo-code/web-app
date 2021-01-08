function arrayContainsArray(superset, subset) {
	return subset.every(function (value) {
		return (superset.indexOf(value.toLowerCase()) >= 0);
	});
}

function clearURL() {
	if(window.location.pathname.substr(1) != '')
		window.history.pushState({"html":'',"pageTitle":''}, '', '/');
}

function capitalizeWords(s) {
	return s.replace(/(^|\s)\S/g, l => l.toUpperCase());
}

function percantageToColor(perc) {
	var r, g, b = 0;
	if(perc < 50) {
		r = 255;
		g = Math.round(5.1 * perc);
	}
	else {
		g = 255;
		r = Math.round(510 - 5.10 * perc);
	}
	var h = r * 0x10000 + g * 0x100 + b * 0x1;
	return '#' + ('000000' + h.toString(16)).slice(-6);
}

function getTimeDiff(join, lastSeen) {
	let milliseconds = 0, time = '';
	let t1 = new Date(join).getTime(), t2;
	if (lastSeen)
		t2 = new Date(lastSeen).getTime();
	else
		t2 = Date.now()
	if( isNaN(t1) || isNaN(t2) )
		return '';
	if (t1 < t2)
		milliseconds = t2 - t1;
	else
		milliseconds = t1 - t2; // sign = '-'
	var days = Math.floor(milliseconds / 1000 / 60 / (60 * 24));
	var date_offset = (new Date()).getTimezoneOffset() * 60 * 1000;
	var date_diff = new Date( milliseconds + date_offset);
	if (days > 0) time += days + 'd ';
	if (date_diff.getHours() > 0) time += date_diff.getHours() + 'h ';
	if (date_diff.getMinutes() > 0) time += date_diff.getMinutes() + 'm ';
	if (date_diff.getSeconds() > 0) time += date_diff.getSeconds() + 's ';
	return time;
}
