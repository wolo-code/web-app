var DECODE_ICON_GUIDE_STORAGE_KEY = 'wolo-decode-icon-guide-launches';
var DECODE_ICON_GUIDE_MAX_LAUNCHES = 2;
var DECODE_ICON_GUIDE_MIN_TOP = 56;
var DECODE_ICON_GUIDE_STACK_GAP = 12;

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

function applyDecodeIconGuideOffset() {
	var container = document.getElementById('decode_input_container');
	var stack = document.getElementById('map_bottom_stack');
	if(!container || !document.body.classList.contains('decode-icon-guide')) {
		resetDecodeIconGuideOffset();
		return;
	}
	var containerRect = container.getBoundingClientRect();
	var stackTop = stack ? stack.getBoundingClientRect().top : window.innerHeight;
	var overflow = getDecodeIconGuideBottom(container) + DECODE_ICON_GUIDE_STACK_GAP - stackTop;
	if(overflow <= 0)
		return;
	var maxShift = containerRect.top - DECODE_ICON_GUIDE_MIN_TOP;
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

function syncDecodeIconGuide() {
	var show = typeof isDecodeView == 'function'
		? isDecodeView()
		: document.body.classList.contains('decode');
	show = show && shouldShowDecodeIconGuide() && !isAppOverlayOpen();
	document.body.classList.toggle('decode-icon-guide', show);
	if(show)
		layoutDecodeIconGuide();
	else
		resetDecodeIconGuideOffset();
}

function initDecodeIconGuide() {
	recordDecodeIconGuideLaunch();
	syncDecodeIconGuide();
	window.addEventListener('resize', layoutDecodeIconGuide);
}
