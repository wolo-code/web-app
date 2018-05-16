function arrayContainsArray(superset, subset) {
	return subset.every(function (value) {
		return (superset.indexOf(value.toLowerCase()) >= 0);
	});
}

function clearURL() {
	if(window.location.pathname.substr(1) != '')
		window.history.pushState({"html":'',"pageTitle":''}, '', '/');
}
