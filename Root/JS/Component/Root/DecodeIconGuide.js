var DECODE_ICON_GUIDE_STORAGE_KEY = 'wolo-decode-icon-guide-launches';
var DECODE_ICON_GUIDE_MAX_LAUNCHES = 2;
var DECODE_ICON_GUIDE_HOLD_MS = 3000;
var DECODE_ICON_GUIDE_FADE_MS = 400;
var DECODE_ICON_GUIDE_DISMISS_GRACE_MS = 700;
var DECODE_ICON_GUIDE_MIN_TOP = 56;
var DECODE_ICON_GUIDE_STACK_GAP = 12;
var decodeIconGuideVisible = false;
var decodeIconGuideConsumed = false;
var decodeIconGuideForced = false;
var decodeIconGuideTimer = null;
var decodeIconGuideFadeTimer = null;
var decodeIconGuideReadyTimer = null;
var decodeIconGuideReady = false;
var decodeIconGuideLaunchRecorded = false;

function getDecodeIconGuideLaunchCount() {
	if(typeof(Storage) === 'undefined')
		return DECODE_ICON_GUIDE_MAX_LAUNCHES;
	try {
		var raw = localStorage.getItem(DECODE_ICON_GUIDE_STORAGE_KEY);
		var count = parseInt(raw, 10);
		if(isNaN(count) || count < 0)
			return 0;
		return count;
	}
	catch(error) {
		return DECODE_ICON_GUIDE_MAX_LAUNCHES;
	}
}

function recordDecodeIconGuideLaunch() {
	if(decodeIconGuideLaunchRecorded)
		return getDecodeIconGuideLaunchCount();
	decodeIconGuideLaunchRecorded = true;
	if(typeof(Storage) === 'undefined')
		return DECODE_ICON_GUIDE_MAX_LAUNCHES + 1;
	var count = getDecodeIconGuideLaunchCount() + 1;
	try {
		localStorage.setItem(DECODE_ICON_GUIDE_STORAGE_KEY, String(count));
	}
	catch(error) {}
	return count;
}

function shouldShowDecodeIconGuide() {
	var count = getDecodeIconGuideLaunchCount();
	return count > 0 && count <= DECODE_ICON_GUIDE_MAX_LAUNCHES;
}

function isAppOverlayOpen() {
	var overlay = document.getElementById('overlay');
	return !!(overlay && !overlay.classList.contains('hide'));
}

function resetDecodeIconGuideOffset() {
	var container = document.getElementById('decode_input_container');
	if(container)
		container.style.transform = '';
}

function getDecodeIconGuideTop(container) {
	var top = container.getBoundingClientRect().top;
	var nodes = container.querySelectorAll('.decode_city_source_button, .decode_icon_caption');
	var i;
	var rect;
	for(i = 0; i < nodes.length; i++) {
		rect = nodes[i].getBoundingClientRect();
		if(rect.top < top)
			top = rect.top;
	}
	return top;
}

function getDecodeIconGuideBottom(container) {
	var bottom = container.getBoundingClientRect().bottom;
	var captions = container.querySelectorAll('.decode_icon_caption');
	var i;
	var rect;
	for(i = 0; i < captions.length; i++) {
		rect = captions[i].getBoundingClientRect();
		if(rect.bottom > bottom)
			bottom = rect.bottom;
	}
	return bottom;
}

function getDecodeIconGuideMinTop() {
	var minTop = DECODE_ICON_GUIDE_MIN_TOP;
	var logo = document.getElementById('logo');
	var account = document.getElementById('account');
	var bottom;
	if(logo) {
		bottom = logo.getBoundingClientRect().bottom + 16;
		if(bottom > minTop)
			minTop = bottom;
	}
	if(account) {
		bottom = account.getBoundingClientRect().bottom + 16;
		if(bottom > minTop)
			minTop = bottom;
	}
	return minTop;
}

function applyDecodeIconGuideOffset() {
	var container = document.getElementById('decode_input_container');
	var stack = document.getElementById('map_bottom_stack');
	if(!container || !document.body.classList.contains('decode-icon-guide')) {
		resetDecodeIconGuideOffset();
		return;
	}
	var stackTop = stack ? stack.getBoundingClientRect().top : window.innerHeight;
	var overflow = getDecodeIconGuideBottom(container) + DECODE_ICON_GUIDE_STACK_GAP - stackTop;
	if(overflow <= 0)
		return;
	var maxShift = getDecodeIconGuideTop(container) - getDecodeIconGuideMinTop();
	if(maxShift < 0)
		maxShift = 0;
	var shift = overflow > maxShift ? maxShift : overflow;
	if(shift > 0)
		container.style.transform = 'translateY(' + (-shift) + 'px)';
}

function layoutDecodeIconGuide() {
	var container = document.getElementById('decode_input_container');
	if(!container || !document.body.classList.contains('decode-icon-guide')) {
		resetDecodeIconGuideOffset();
		return;
	}
	container.style.transform = '';
	if(window.requestAnimationFrame)
		window.requestAnimationFrame(applyDecodeIconGuideOffset);
	else
		applyDecodeIconGuideOffset();
}

function clearDecodeIconGuideTimers() {
	if(decodeIconGuideTimer != null) {
		clearTimeout(decodeIconGuideTimer);
		decodeIconGuideTimer = null;
	}
	if(decodeIconGuideFadeTimer != null) {
		clearTimeout(decodeIconGuideFadeTimer);
		decodeIconGuideFadeTimer = null;
	}
	if(decodeIconGuideReadyTimer != null) {
		clearTimeout(decodeIconGuideReadyTimer);
		decodeIconGuideReadyTimer = null;
	}
}

function bindDecodeIconGuideDismiss() {
	unbindDecodeIconGuideDismiss();
	var scrim = document.getElementById('decode_icon_guide_scrim');
	if(scrim)
		scrim.addEventListener('click', onDecodeIconGuideDismiss);
	document.addEventListener('click', onDecodeIconGuideDismiss, true);
}

function unbindDecodeIconGuideDismiss() {
	var scrim = document.getElementById('decode_icon_guide_scrim');
	if(scrim)
		scrim.removeEventListener('click', onDecodeIconGuideDismiss);
	document.removeEventListener('click', onDecodeIconGuideDismiss, true);
}

function isDecodeIconGuideDismissEvent(event) {
	var overlay;
	var target;
	if(!event || event.isTrusted === false)
		return false;
	if(event.type !== 'click')
		return false;
	if(typeof event.detail === 'number' && event.detail === 0)
		return false;
	target = event.target;
	if(target && target.closest && (target.closest('#map_stage') || target.closest('#map') || target.closest('#apple_map')))
		return false;
	overlay = document.getElementById('overlay');
	if(overlay && !overlay.classList.contains('hide') && overlay.contains(target))
		return false;
	return true;
}

function onDecodeIconGuideDismiss(event) {
	if(!decodeIconGuideVisible || !decodeIconGuideReady || document.body.classList.contains('decode-icon-guide-fade'))
		return;
	if(!isDecodeIconGuideDismissEvent(event))
		return;
	if(event.cancelable)
		event.preventDefault();
	if(event.stopPropagation)
		event.stopPropagation();
	fadeDecodeIconGuide();
}

function hideDecodeIconGuide() {
	clearDecodeIconGuideTimers();
	unbindDecodeIconGuideDismiss();
	decodeIconGuideVisible = false;
	decodeIconGuideReady = false;
	document.body.classList.remove('decode-icon-guide', 'decode-icon-guide-fade');
	resetDecodeIconGuideOffset();
}

function fadeDecodeIconGuide() {
	if(!decodeIconGuideVisible)
		return;
	decodeIconGuideConsumed = true;
	decodeIconGuideForced = false;
	clearDecodeIconGuideTimers();
	unbindDecodeIconGuideDismiss();
	document.body.classList.add('decode-icon-guide-fade');
	decodeIconGuideFadeTimer = setTimeout(function() {
		decodeIconGuideFadeTimer = null;
		hideDecodeIconGuide();
	}, DECODE_ICON_GUIDE_FADE_MS);
}

function beginDecodeIconGuideTimers() {
	clearDecodeIconGuideTimers();
	unbindDecodeIconGuideDismiss();
	decodeIconGuideReady = false;
	decodeIconGuideReadyTimer = setTimeout(function() {
		decodeIconGuideReadyTimer = null;
		if(!decodeIconGuideVisible || document.body.classList.contains('decode-icon-guide-fade'))
			return;
		decodeIconGuideReady = true;
		bindDecodeIconGuideDismiss();
	}, DECODE_ICON_GUIDE_DISMISS_GRACE_MS);
	decodeIconGuideTimer = setTimeout(fadeDecodeIconGuide, DECODE_ICON_GUIDE_HOLD_MS + DECODE_ICON_GUIDE_DISMISS_GRACE_MS);
}

function startDecodeIconGuide(force) {
	if(force) {
		decodeIconGuideConsumed = false;
		decodeIconGuideForced = true;
		if(decodeIconGuideVisible) {
			document.body.classList.remove('decode-icon-guide-fade');
			layoutDecodeIconGuide();
			beginDecodeIconGuideTimers();
			return;
		}
	}
	if(decodeIconGuideVisible || decodeIconGuideConsumed)
		return;
	decodeIconGuideVisible = true;
	document.body.classList.add('decode-icon-guide');
	document.body.classList.remove('decode-icon-guide-fade');
	layoutDecodeIconGuide();
	beginDecodeIconGuideTimers();
}

function requestDecodeIconGuide() {
	var decodeView = typeof isDecodeView == 'function'
		? isDecodeView()
		: document.body.classList.contains('decode');
	if(!decodeView && typeof toggleDecodeView == 'function')
		toggleDecodeView();
	startDecodeIconGuide(true);
}

function syncDecodeIconGuide() {
	var allow = typeof isDecodeView == 'function'
		? isDecodeView()
		: document.body.classList.contains('decode');
	allow = allow && (decodeIconGuideForced || shouldShowDecodeIconGuide()) && !isAppOverlayOpen();
	if(allow && !decodeIconGuideConsumed && !decodeIconGuideVisible)
		startDecodeIconGuide();
	else if(!allow && decodeIconGuideVisible)
		hideDecodeIconGuide();
}

function initDecodeIconGuide() {
	recordDecodeIconGuideLaunch();
	syncDecodeIconGuide();
	window.addEventListener('resize', layoutDecodeIconGuide);
}
