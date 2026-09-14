function hideInfo() {
	setInfoVersionExpanded(false);
	hideOverlay(document.getElementById('info_message'));
}

function showInfo() {
	setInfoVersionExpanded(false);
	showOverlay(document.getElementById('info_message'));
}

function getInfoVersionToggles() {
	return [
		document.getElementById('info_version_indicator')
	];
}

function getInfoUpdatedTimestamp() {
	var indicator = document.getElementById('info_version_indicator');
	if(!indicator)
		return '';
	var updated = indicator.getAttribute('data-updated');
	return updated ? updated.replace(/\s+/g, ' ').trim() : '';
}

function padInfoTimePart(value) {
	return (value < 10 ? '0' : '') + value;
}

function formatInfoTimestamp(date) {
	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	if(!date || isNaN(date.getTime()))
		return '';
	return date.getUTCFullYear() + ' ' + months[date.getUTCMonth()] + ' ' + padInfoTimePart(date.getUTCDate()) + ' ' + padInfoTimePart(date.getUTCHours()) + ':' + padInfoTimePart(date.getUTCMinutes()) + ':' + padInfoTimePart(date.getUTCSeconds()) + ' UTC';
}

function formatInfoElapsed(date) {
	if(!date || isNaN(date.getTime()))
		return '';
	var ms = Date.now() - date.getTime();
	if(ms < 0)
		ms = 0;
	var seconds = Math.floor(ms / 1000);
	if(seconds < 10)
		return 'just now';
	if(seconds < 60)
		return seconds + ' seconds ago';
	var minutes = Math.floor(seconds / 60);
	if(minutes === 1)
		return '1 minute ago';
	if(minutes < 60)
		return minutes + ' minutes ago';
	var hours = Math.floor(minutes / 60);
	if(hours === 1)
		return '1 hour ago';
	if(hours < 24)
		return hours + ' hours ago';
	var days = Math.floor(hours / 24);
	if(days === 1)
		return '1 day ago';
	if(days < 30)
		return days + ' days ago';
	var months = Math.floor(days / 30);
	if(months === 1)
		return '1 month ago';
	if(months < 12)
		return months + ' months ago';
	var years = Math.floor(days / 365);
	if(years <= 1)
		return '1 year ago';
	return years + ' years ago';
}

function fillInfoVersionStamps() {
	var indicator = document.getElementById('info_version_indicator');
	if(!indicator)
		return;
	var utcNode = indicator.querySelector('.info_version_stamp_utc');
	var elapsedNode = indicator.querySelector('.info_version_stamp_elapsed');
	if(!utcNode || !elapsedNode)
		return;
	var updated = getInfoUpdatedTimestamp();
	var date = updated ? new Date(updated) : null;
	utcNode.textContent = formatInfoTimestamp(date) || updated;
	elapsedNode.textContent = formatInfoElapsed(date) || '';
}

function setInfoVersionExpanded(expanded) {
	fillInfoVersionStamps();
	var nodes = getInfoVersionToggles();
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		if(!node)
			continue;
		node.setAttribute('aria-expanded', expanded ? 'true' : 'false');
	}
}

function toggleInfoVersionDisplay(event) {
	if(event) {
		if(event.preventDefault)
			event.preventDefault();
		if(event.stopPropagation)
			event.stopPropagation();
	}
	var indicator = document.getElementById('info_version_indicator');
	var expanded = indicator && indicator.getAttribute('aria-expanded') === 'true';
	setInfoVersionExpanded(!expanded);
}

function closeInfo() {
	if(typeof clearDecodeIconGuideAwaitingIntro == 'function')
		clearDecodeIconGuideAwaitingIntro();
	hideInfo();
	activateOverlayInfo_full();
	// if(!syncLocate_engage) {
	// 	syncLocate();
	// 	syncLocate_engage = true;
	// }
}

function showInfoLinks() {
	activateOverlayInfo_links();
	showInfo();
}
