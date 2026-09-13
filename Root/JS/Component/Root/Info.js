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

function formatInfoTimestamp(date, local) {
	var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	if(!date || isNaN(date.getTime()))
		return '';
	if(local) {
		var zone = '';
		try {
			var parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(date);
			for(var i = 0; i < parts.length; i++) {
				if(parts[i].type === 'timeZoneName') {
					zone = parts[i].value;
					break;
				}
			}
		}
		catch(error) {
			zone = '';
		}
		return date.getFullYear() + ' ' + months[date.getMonth()] + ' ' + padInfoTimePart(date.getDate()) + ' ' + padInfoTimePart(date.getHours()) + ':' + padInfoTimePart(date.getMinutes()) + ':' + padInfoTimePart(date.getSeconds()) + (zone ? ' ' + zone : '');
	}
	return date.getUTCFullYear() + ' ' + months[date.getUTCMonth()] + ' ' + padInfoTimePart(date.getUTCDate()) + ' ' + padInfoTimePart(date.getUTCHours()) + ':' + padInfoTimePart(date.getUTCMinutes()) + ':' + padInfoTimePart(date.getUTCSeconds()) + ' UTC';
}

function fillInfoVersionStamps() {
	var indicator = document.getElementById('info_version_indicator');
	if(!indicator)
		return;
	var utcNode = indicator.querySelector('.info_version_stamp_utc');
	var localNode = indicator.querySelector('.info_version_stamp_local');
	if(!utcNode || !localNode)
		return;
	var updated = getInfoUpdatedTimestamp();
	var date = updated ? new Date(updated) : null;
	utcNode.textContent = updated || '';
	localNode.textContent = formatInfoTimestamp(date, true) || updated;
}

function setInfoVersionExpanded(expanded) {
	fillInfoVersionStamps();
	var nodes = getInfoVersionToggles();
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		if(!node)
			continue;
		var shortVersion = node.getAttribute('data-version-short');
		var fullVersion = node.getAttribute('data-version-full');
		if(!shortVersion || !fullVersion)
			continue;
		var showFull = !!expanded && fullVersion !== shortVersion;
		var label = node.querySelector('.info_version_label') || node.querySelector('.info_version_text') || node;
		label.textContent = showFull ? fullVersion : shortVersion;
		if(fullVersion === shortVersion) {
			node.removeAttribute('aria-expanded');
			continue;
		}
		node.setAttribute('aria-expanded', showFull ? 'true' : 'false');
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
