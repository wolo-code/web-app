function hideInfo() {
	setInfoVersionExpanded(false);
	hideOverlay(document.getElementById('info_message'));
}

function showInfo() {
	setInfoVersionExpanded(false);
	document.getElementById('updated-timediff').innerText = getTimeDiff(document.getElementById('updated-timestamp').innerText);
	showOverlay(document.getElementById('info_message'));
}

function getInfoVersionToggles() {
	return [
		document.getElementById('info_version_indicator'),
		document.getElementById('info_version_value')
	];
}

function getInfoUpdatedTimestamp() {
	var stamp = document.getElementById('updated-timestamp');
	return stamp && stamp.textContent ? stamp.textContent.replace(/\s+/g, ' ').trim() : '';
}

function setInfoVersionExpanded(expanded) {
	var nodes = getInfoVersionToggles();
	var updated = getInfoUpdatedTimestamp();
	for(var i = 0; i < nodes.length; i++) {
		var node = nodes[i];
		if(!node)
			continue;
		var shortVersion = node.getAttribute('data-version-short');
		var fullVersion = node.getAttribute('data-version-full');
		if(!shortVersion || !fullVersion)
			continue;
		var showFull = !!expanded && fullVersion !== shortVersion;
		var label = node.querySelector('.info_version_text') || node;
		label.textContent = showFull ? fullVersion : shortVersion;
		var stamp = node.querySelector('.info_version_stamp');
		if(stamp) {
			stamp.textContent = showFull ? updated : '';
			stamp.hidden = !showFull || !updated;
		}
		if(fullVersion === shortVersion) {
			node.removeAttribute('aria-expanded');
			continue;
		}
		node.setAttribute('aria-expanded', showFull ? 'true' : 'false');
	}
	var message = document.getElementById('info_message');
	if(message)
		message.classList.toggle('info-version-expanded', !!expanded);
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
