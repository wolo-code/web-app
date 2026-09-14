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
	var localNode = indicator.querySelector('.info_version_local');
	if(!utcNode || !elapsedNode || !localNode)
		return;
	var updated = getInfoUpdatedTimestamp();
	var date = updated ? new Date(updated) : null;
	utcNode.textContent = formatInfoTimestamp(date) || updated;
	elapsedNode.textContent = formatInfoElapsed(date) || '';
	localNode.textContent = formatInfoTimestamp(date, true) || updated;
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

function closeInfo(event) {
	var intro = document.getElementById('info_intro');
	var fromIntroProceed = event && event.currentTarget && event.currentTarget.id === 'info_intro_close_button';
	if(typeof isInfoIntroActive == 'function' && isInfoIntroActive() && !fromIntroProceed)
		return;
	if(event && event.stopPropagation)
		event.stopPropagation();
	if(typeof clearDecodeIconGuideAwaitingIntro == 'function')
		clearDecodeIconGuideAwaitingIntro();
	if(fromIntroProceed && typeof(Storage) !== 'undefined')
		localStorage.note_version = CURRENT_VERSION;
	if(intro)
		intro.classList.add('hide');
	hideInfo();
	activateOverlayInfo_full();
	if(typeof bindOverlayBackdropClick == 'function')
		bindOverlayBackdropClick();
	if(typeof flushExceptionPrompt == 'function')
		flushExceptionPrompt();
}

function showInfoLinks() {
	activateOverlayInfo_links();
	showInfo();
}
