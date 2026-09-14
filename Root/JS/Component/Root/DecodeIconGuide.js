var DECODE_ICON_GUIDE_STORAGE_KEY = 'wolo-decode-icon-guide-launches';
var MAP_ICON_GUIDE_STORAGE_KEY = 'wolo-map-icon-guide-launches';
var DECODE_ICON_GUIDE_MAX_LAUNCHES = 2;
var DECODE_ICON_GUIDE_HOLD_MS = getDecodeIconGuideHoldMs();
var DECODE_ICON_GUIDE_FADE_MS = 400;
var DECODE_ICON_GUIDE_DISMISS_GRACE_MS = 700;
var DECODE_ICON_GUIDE_MIN_TOP = 56;
var DECODE_ICON_GUIDE_STACK_GAP = 12;
var MAP_INFOCARD_CALLOUT_START_GAP = 8;
var MAP_INFOCARD_CALLOUT_END_GAP = 38;
var MAP_ICON_GUIDE_REPLAY_HINT = "You can view the guide again from <br> 'Info' button -> 'Show guide'";
var MAP_ICON_GUIDE_REPLAY_HINT_MS = 5000;
var decodeIconGuideVisible = false;
var decodeIconGuideConsumed = false;
var mapIconGuideConsumed = false;
var decodeIconGuideForced = false;
var decodeIconGuideTimer = null;
var decodeIconGuideFadeTimer = null;
var decodeIconGuideReadyTimer = null;
var decodeIconGuideReady = false;
var decodeIconGuideLaunchRecorded = false;
var mapIconGuideVisitRecorded = false;
var decodeIconGuideCameraTimer = null;
var decodeIconGuidePinnedCaptions = [];
var decodeIconGuideSearchHome = null;
var decodeIconGuideReplayHint = false;
var decodeIconGuideShownOnDecode = false;
var decodeIconGuideAwaitingIntro = false;

function getDecodeIconGuideHoldMs() {
	if(typeof WOLO_ICON_GUIDE_TIMEOUT_MS === 'number' && WOLO_ICON_GUIDE_TIMEOUT_MS > 0)
		return WOLO_ICON_GUIDE_TIMEOUT_MS;
	return 4000;
}

function markDecodeIconGuideAwaitingIntro() {
	decodeIconGuideAwaitingIntro = true;
	if(decodeIconGuideVisible)
		hideDecodeIconGuide();
}

function clearDecodeIconGuideAwaitingIntro() {
	decodeIconGuideAwaitingIntro = false;
}

function isInfoIntroOpen() {
	var overlay = document.getElementById('overlay');
	var intro = document.getElementById('info_intro');
	return !!(overlay && intro && !overlay.classList.contains('hide') && !intro.classList.contains('hide'));
}

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

function getMapIconGuideLaunchCount() {
	if(typeof(Storage) === 'undefined')
		return DECODE_ICON_GUIDE_MAX_LAUNCHES;
	try {
		var raw = localStorage.getItem(MAP_ICON_GUIDE_STORAGE_KEY);
		var count = parseInt(raw, 10);
		if(isNaN(count) || count < 0)
			return 0;
		return count;
	}
	catch(error) {
		return DECODE_ICON_GUIDE_MAX_LAUNCHES;
	}
}

function recordMapIconGuideLaunch() {
	if(typeof(Storage) === 'undefined')
		return DECODE_ICON_GUIDE_MAX_LAUNCHES + 1;
	var count = getMapIconGuideLaunchCount() + 1;
	try {
		localStorage.setItem(MAP_ICON_GUIDE_STORAGE_KEY, String(count));
	}
	catch(error) {}
	return count;
}

function recordMapIconGuideVisit() {
	if(mapIconGuideVisitRecorded)
		return getMapIconGuideLaunchCount();
	mapIconGuideVisitRecorded = true;
	return recordMapIconGuideLaunch();
}

function shouldShowMapIconGuide() {
	var count = getMapIconGuideLaunchCount();
	return count > 0 && count <= DECODE_ICON_GUIDE_MAX_LAUNCHES;
}

function isDecodeIconGuideView() {
	return typeof isDecodeView == 'function'
		? isDecodeView()
		: document.body.classList.contains('decode');
}

function isDecodeIconGuideConsumed() {
	return isDecodeIconGuideView() ? decodeIconGuideConsumed : mapIconGuideConsumed;
}

function markDecodeIconGuideConsumed() {
	if(isDecodeIconGuideView())
		decodeIconGuideConsumed = true;
	else
		mapIconGuideConsumed = true;
}

function shouldHintMapIconGuideReplay() {
	return !decodeIconGuideForced && !isDecodeIconGuideView() && shouldShowMapIconGuide();
}

function showMapIconGuideReplayHint() {
	if(typeof showNotification != 'function')
		return;
	showNotification(MAP_ICON_GUIDE_REPLAY_HINT, MAP_ICON_GUIDE_REPLAY_HINT_MS);
}

function isAppOverlayOpen() {
	var overlay = document.getElementById('overlay');
	return !!(overlay && !overlay.classList.contains('hide'));
}

function shouldHoldDecodeIconGuide() {
	if(typeof isInfoIntroActive == 'function' && isInfoIntroActive())
		return true;
	return decodeIconGuideAwaitingIntro || isInfoIntroOpen() || isAppOverlayOpen();
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
	if(!container || !document.body.classList.contains('decode-icon-guide') || !document.body.classList.contains('decode')) {
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

function restorePinnedGuideCaptions() {
	var i;
	var item;
	for(i = decodeIconGuidePinnedCaptions.length - 1; i >= 0; i--) {
		item = decodeIconGuidePinnedCaptions[i];
		if(item.next && item.next.parentNode === item.parent)
			item.parent.insertBefore(item.el, item.next);
		else if(item.parent)
			item.parent.appendChild(item.el);
		item.el.style.position = '';
		item.el.style.left = '';
		item.el.style.top = '';
		item.el.style.right = '';
		item.el.style.bottom = '';
		item.el.style.transform = '';
		item.el.style.zIndex = '';
	}
	decodeIconGuidePinnedCaptions = [];
}

function pinGuideCaptionAt(el, left, top, transform) {
	var i;
	var item = null;
	if(!el)
		return;
	for(i = 0; i < decodeIconGuidePinnedCaptions.length; i++) {
		if(decodeIconGuidePinnedCaptions[i].el === el) {
			item = decodeIconGuidePinnedCaptions[i];
			break;
		}
	}
	if(!item) {
		decodeIconGuidePinnedCaptions.push({ el: el, parent: el.parentNode, next: el.nextSibling });
		document.body.appendChild(el);
	}
	else if(el.parentNode !== document.body)
		document.body.appendChild(el);
	el.style.position = 'fixed';
	el.style.left = left + 'px';
	el.style.top = top + 'px';
	el.style.right = 'auto';
	el.style.bottom = 'auto';
	el.style.transform = transform || 'translateX(-50%)';
	el.style.zIndex = '203';
}

function pinGuideCaption(el, target, above) {
	var rect;
	if(!el || !target)
		return false;
	rect = target.getBoundingClientRect();
	if(rect.width < 8 || rect.height < 8 || rect.top < 0 || rect.bottom > window.innerHeight - 8)
		return false;
	if(above)
		pinGuideCaptionAt(el, rect.left + rect.width / 2, rect.top - 23);
	else
		pinGuideCaptionAt(el, rect.left + rect.width / 2, rect.bottom + 6);
	return true;
}

function pinGuideCaptionBeside(el, target, side) {
	var rect;
	if(!el || !target)
		return false;
	rect = target.getBoundingClientRect();
	if(rect.width < 8 || rect.height < 8)
		return false;
	if(side === 'left')
		pinGuideCaptionAt(el, rect.left - 8, rect.top + rect.height / 2, 'translate(-100%, -50%)');
	else
		pinGuideCaptionAt(el, rect.right + 8, rect.top + rect.height / 2, 'translateY(-50%)');
	return true;
}

function clearMapInfocardGuideLines(svg) {
	while(svg.firstChild)
		svg.removeChild(svg.firstChild);
}

function placeMapInfocardCallout(el, hx, hy, side, gap, dx, hostRect, cardRect) {
	var width;
	var height;
	var left;
	var top;
	var cardLeft = cardRect ? cardRect.left - hostRect.left : hx;
	var cardRight = cardRect ? cardRect.right - hostRect.left : hx;
	var cardTop = cardRect ? cardRect.top - hostRect.top : hy;
	var cardBottom = cardRect ? cardRect.bottom - hostRect.top : hy;
	el.classList.remove('map_icon_guide_callout_left', 'map_icon_guide_callout_right');
	if(side === 'left')
		el.classList.add('map_icon_guide_callout_left');
	else if(side === 'right')
		el.classList.add('map_icon_guide_callout_right');
	el.style.left = '0px';
	el.style.top = '0px';
	el.style.right = 'auto';
	el.style.bottom = 'auto';
	el.style.transform = 'none';
	width = el.offsetWidth;
	height = el.offsetHeight;
	if(side === 'left') {
		left = cardLeft - gap - width;
		top = hy - height * 0.35;
	}
	else if(side === 'right') {
		left = cardRight + gap;
		top = hy - height * 0.35;
	}
	else if(side === 'top') {
		left = hx - width / 2;
		top = cardTop - gap - height;
	}
	else {
		left = hx - width / 2;
		top = cardBottom + gap;
	}
	left += dx || 0;
	left = Math.max(12, Math.min(left, hostRect.width - width - 12));
	top = Math.max(68, Math.min(top, hostRect.height - height - 78));
	el.style.left = left + 'px';
	el.style.top = top + 'px';
	return { left: left, top: top, width: width, height: height };
}

function mapInfocardCalloutAnchor(box, side) {
	var gap = MAP_INFOCARD_CALLOUT_START_GAP;
	if(side === 'left')
		return { x: box.left + box.width + gap, y: box.top + Math.min(18, box.height * 0.38) };
	if(side === 'right')
		return { x: box.left - gap, y: box.top + Math.min(18, box.height * 0.38) };
	if(side === 'top')
		return { x: box.left + box.width / 2, y: box.top + box.height + gap };
	return { x: box.left + box.width / 2, y: box.top - gap };
}

function mapInfocardCalloutTarget(hx, hy, side) {
	var gap = MAP_INFOCARD_CALLOUT_END_GAP;
	if(side === 'left')
		return { x: hx - gap, y: hy };
	if(side === 'right')
		return { x: hx + gap, y: hy };
	if(side === 'top')
		return { x: hx, y: hy - gap };
	return { x: hx, y: hy + gap };
}

function mapInfocardCalloutPath(from, to, side) {
	var mid;
	if(side === 'left' || side === 'right') {
		mid = (from.x + to.x) / 2;
		return 'M' + from.x.toFixed(1) + ',' + from.y.toFixed(1) + ' H' + mid.toFixed(1) + ' V' + to.y.toFixed(1) + ' H' + to.x.toFixed(1);
	}
	mid = (from.y + to.y) / 2;
	return 'M' + from.x.toFixed(1) + ',' + from.y.toFixed(1) + ' V' + mid.toFixed(1) + ' H' + to.x.toFixed(1) + ' V' + to.y.toFixed(1);
}

function drawMapInfocardCalloutLine(svg, from, to, side) {
	var ns = 'http://www.w3.org/2000/svg';
	var path = document.createElementNS(ns, 'path');
	var ring = document.createElementNS(ns, 'circle');
	var dot = document.createElementNS(ns, 'circle');
	path.setAttribute('d', mapInfocardCalloutPath(from, to, side));
	path.setAttribute('fill', 'none');
	path.setAttribute('stroke', '#69B7CF');
	path.setAttribute('stroke-width', '1.7');
	path.setAttribute('stroke-linecap', 'round');
	path.setAttribute('stroke-linejoin', 'round');
	ring.setAttribute('cx', to.x.toFixed(1));
	ring.setAttribute('cy', to.y.toFixed(1));
	ring.setAttribute('r', '5.4');
	ring.setAttribute('fill', '#fff');
	ring.setAttribute('stroke', '#69B7CF');
	ring.setAttribute('stroke-width', '1.6');
	dot.setAttribute('cx', to.x.toFixed(1));
	dot.setAttribute('cy', to.y.toFixed(1));
	dot.setAttribute('r', '2.4');
	dot.setAttribute('fill', '#69B7CF');
	svg.appendChild(path);
	svg.appendChild(ring);
	svg.appendChild(dot);
}

function layoutMapInfocardGuide() {
	var host = document.getElementById('map_icon_guide_infocard');
	var svg;
	var hostRect;
	var card;
	var cardRect;
	var compact;
	var specs;
	var i;
	var spec;
	var callout;
	var hotspot;
	var hotspotRect;
	var hx;
	var hy;
	var box;
	var from;
	if(!host)
		return;
	svg = host.querySelector('.map_icon_guide_infocard_lines');
	if(!svg)
		return;
	if(document.body.classList.contains('decode') || !document.body.classList.contains('decode-icon-guide')) {
		clearMapInfocardGuideLines(svg);
		return;
	}
	hostRect = host.getBoundingClientRect();
	if(hostRect.width < 8 || hostRect.height < 8)
		return;
	card = host.querySelector('.map_icon_guide_infocard_card');
	cardRect = card ? card.getBoundingClientRect() : hostRect;
	svg.setAttribute('viewBox', '0 0 ' + hostRect.width + ' ' + hostRect.height);
	clearMapInfocardGuideLines(svg);
	compact = window.innerWidth < 720 || window.innerHeight < 560;
	specs = compact
		? [
			{ id: 'infocard-city', side: 'top', gap: 18, dx: -40 },
			{ id: 'infocard-code', side: 'top', gap: 18, dx: 52 },
			{ id: 'infocard-address', side: 'bottom', gap: 22, dx: -78 },
			{ id: 'infocard-launch', side: 'bottom', gap: 22, dx: 0 },
			{ id: 'infocard-share', side: 'bottom', gap: 22, dx: 78 }
		]
		: [
			{ id: 'infocard-city', side: 'left', gap: 28, dx: 0 },
			{ id: 'infocard-code', side: 'right', gap: 28, dx: 0 },
			{ id: 'infocard-address', side: 'left', gap: 28, dx: 0 },
			{ id: 'infocard-launch', side: 'bottom', gap: 36, dx: 0 },
			{ id: 'infocard-share', side: 'right', gap: 28, dx: 0 }
		];
	for(i = 0; i < specs.length; i++) {
		spec = specs[i];
		callout = host.querySelector('.map_icon_guide_callout[data-guide-id="' + spec.id + '"]');
		hotspot = host.querySelector('.map_icon_guide_hotspot[data-guide-id="' + spec.id + '"]');
		if(!callout || !hotspot)
			continue;
		hotspotRect = hotspot.getBoundingClientRect();
		hx = hotspotRect.left + hotspotRect.width / 2 - hostRect.left;
		hy = hotspotRect.top + hotspotRect.height / 2 - hostRect.top;
		box = placeMapInfocardCallout(callout, hx, hy, spec.side, spec.gap, spec.dx, hostRect, cardRect);
		from = mapInfocardCalloutAnchor(box, spec.side);
		drawMapInfocardCalloutLine(svg, from, mapInfocardCalloutTarget(hx, hy, spec.side), spec.side);
	}
}

function restoreMapSearchBarStacking() {
	var bar = document.getElementById('map_search_cluster') || document.getElementById('map_search_bar');
	var home = decodeIconGuideSearchHome;
	if(home && bar) {
		if(home.next && home.next.parentNode === home.parent)
			home.parent.insertBefore(bar, home.next);
		else if(home.parent)
			home.parent.appendChild(bar);
		if(home.style == null)
			bar.removeAttribute('style');
		else
			bar.setAttribute('style', home.style);
	}
	decodeIconGuideSearchHome = null;
}

function raiseMapSearchBarForGuide() {
	var bar = document.getElementById('map_search_cluster') || document.getElementById('map_search_bar');
	var style;
	var guideLeft;
	var guideTop;
	if(!bar || document.body.classList.contains('decode') || !document.body.classList.contains('decode-icon-guide')) {
		restoreMapSearchBarStacking();
		return;
	}
	if(!decodeIconGuideSearchHome) {
		style = window.getComputedStyle(bar);
		guideLeft = parseFloat(style.marginLeft) || 0;
		guideTop = parseFloat(style.marginTop) || 0;
		if(guideTop <= 0)
			return false;
		decodeIconGuideSearchHome = {
			parent: bar.parentNode,
			next: bar.nextSibling,
			style: bar.getAttribute('style'),
			left: guideLeft,
			top: guideTop
		};
		document.body.appendChild(bar);
	}
	else if(bar.parentNode !== document.body)
		document.body.appendChild(bar);
	bar.style.position = 'fixed';
	bar.style.left = decodeIconGuideSearchHome.left + 'px';
	bar.style.top = decodeIconGuideSearchHome.top + 'px';
	bar.style.margin = '0';
	bar.style.zIndex = '202';
	return true;
}

function removeMapIconGuideDim() {
	var dim = document.getElementById('map_icon_guide_dim');
	if(dim && dim.parentNode)
		dim.parentNode.removeChild(dim);
}

function syncMapIconGuideDim() {
	var map = document.getElementById('map');
	var dim = document.getElementById('map_icon_guide_dim');
	var gmStyle;
	if(!map || document.body.classList.contains('decode') || !document.body.classList.contains('decode-icon-guide')) {
		removeMapIconGuideDim();
		return;
	}
	if(!dim) {
		dim = document.createElement('div');
		dim.id = 'map_icon_guide_dim';
		dim.addEventListener('click', onDecodeIconGuideDismiss);
	}
	gmStyle = map.querySelector('.gm-style');
	if(!gmStyle)
		return;
	if(dim.parentNode !== gmStyle)
		gmStyle.appendChild(dim);
}

function layoutMapSearchCaptions() {
	var input;
	var inputRect;
	syncMapIconGuideDim();
	raiseMapSearchBarForGuide();
	layoutMapInfocardGuide();
	if(document.body.classList.contains('decode') || !document.body.classList.contains('decode-icon-guide'))
		return;
	input = document.getElementById('pac-input');
	pinGuideCaption(document.querySelector('.decode_icon_caption[data-guide-id="previous-city"]'), document.getElementById('map_city_history_toggle'));
	pinGuideCaption(document.querySelector('.decode_icon_caption[data-guide-id="search"]'), input);
	if(!pinGuideCaption(document.querySelector('.decode_icon_caption[data-guide-id="go"]'), document.getElementById('decode_button'))) {
		inputRect = input && input.getBoundingClientRect();
		if(inputRect && inputRect.width >= 8 && inputRect.top >= 0 && inputRect.top < window.innerHeight)
			pinGuideCaptionAt(document.querySelector('.decode_icon_caption[data-guide-id="go"]'), inputRect.right - 22, inputRect.bottom + 6);
	}
	pinGuideCaptionBeside(document.querySelector('.decode_icon_caption[data-guide-id="dpad"]'), document.querySelector('#map gmp-internal-camera-control'), 'left');
}

function restoreMapSearchBarFromGuide() {
	restorePinnedGuideCaptions();
	restoreMapSearchBarStacking();
}

function unwatchMapCameraCaption() {
	if(decodeIconGuideCameraTimer != null) {
		clearTimeout(decodeIconGuideCameraTimer);
		decodeIconGuideCameraTimer = null;
	}
}

function watchMapCameraCaption() {
	var tries = 0;
	unwatchMapCameraCaption();
	function tick() {
		decodeIconGuideCameraTimer = null;
		if(!decodeIconGuideVisible || document.body.classList.contains('decode') || document.body.classList.contains('decode-icon-guide-fade'))
			return;
		layoutMapCameraCaption();
		layoutMapSearchCaptions();
		tries++;
		if(tries < 8)
			decodeIconGuideCameraTimer = setTimeout(tick, 250);
	}
	tick();
}

function layoutMapCameraCaption() {
	var host = document.getElementById('map_camera_label');
	var camera;
	var cameraButton;
	var cameraClone;
	if(!host)
		return;
	if(document.body.classList.contains('decode') || !document.body.classList.contains('decode-icon-guide')) {
		host.removeAttribute('style');
		return;
	}
	camera = document.querySelector('#map gmp-internal-camera-control');
	if(!camera) {
		host.removeAttribute('style');
		return;
	}
	var rect = camera.getBoundingClientRect();
	if(rect.width < 8 || rect.height < 8) {
		host.removeAttribute('style');
		return;
	}
	cameraButton = camera.querySelector(':scope > button');
	cameraClone = host.querySelector('.map_camera_guide_clone');
	if(cameraButton) {
		if(cameraClone)
			cameraClone.parentNode.removeChild(cameraClone);
		cameraClone = cameraButton.cloneNode(true);
		cameraClone.classList.add('map_camera_guide_clone');
		cameraClone.removeAttribute('title');
		cameraClone.setAttribute('aria-hidden', 'true');
		cameraClone.setAttribute('tabindex', '-1');
		host.insertBefore(cameraClone, host.firstChild);
	}
	host.style.top = rect.top + 'px';
	host.style.left = rect.left + 'px';
	host.style.width = rect.width + 'px';
	host.style.height = rect.height + 'px';
}

function layoutDecodeIconGuide() {
	layoutMapSearchCaptions();
	var container = document.getElementById('decode_input_container');
	if(!container || !document.body.classList.contains('decode-icon-guide') || !document.body.classList.contains('decode')) {
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

function blurInputsForIconGuide() {
	var decodeInput = document.getElementById('decode_input');
	if(decodeInput && document.activeElement === decodeInput)
		decodeInput.blur();
	if(typeof blurMapSearchInput == 'function')
		blurMapSearchInput();
}

function hideDecodeIconGuide(fromFade) {
	var hintReplay = fromFade && decodeIconGuideReplayHint;
	clearDecodeIconGuideTimers();
	unbindDecodeIconGuideDismiss();
	decodeIconGuideVisible = false;
	decodeIconGuideReady = false;
	decodeIconGuideReplayHint = false;
	document.body.classList.remove('decode-icon-guide', 'decode-icon-guide-fade');
	resetDecodeIconGuideOffset();
	unwatchMapCameraCaption();
	restoreMapSearchBarFromGuide();
	removeMapIconGuideDim();
	layoutMapCameraCaption();
	if(typeof scheduleFocusMapSearchInput == 'function')
		scheduleFocusMapSearchInput();
	if(hintReplay)
		showMapIconGuideReplayHint();
}

function fadeDecodeIconGuide() {
	if(!decodeIconGuideVisible)
		return;
	decodeIconGuideReplayHint = shouldHintMapIconGuideReplay();
	markDecodeIconGuideConsumed();
	decodeIconGuideForced = false;
	clearDecodeIconGuideTimers();
	unbindDecodeIconGuideDismiss();
	unwatchMapCameraCaption();
	document.body.classList.add('decode-icon-guide-fade');
	decodeIconGuideFadeTimer = setTimeout(function() {
		decodeIconGuideFadeTimer = null;
		hideDecodeIconGuide(true);
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
	if(!force && shouldHoldDecodeIconGuide())
		return;
	if(force) {
		decodeIconGuideConsumed = false;
		mapIconGuideConsumed = false;
		decodeIconGuideForced = true;
		decodeIconGuideReplayHint = false;
		if(decodeIconGuideVisible) {
			decodeIconGuideShownOnDecode = isDecodeIconGuideView();
			document.body.classList.remove('decode-icon-guide-fade');
			blurInputsForIconGuide();
			layoutDecodeIconGuide();
			watchMapCameraCaption();
			setTimeout(layoutDecodeIconGuide, 250);
			setTimeout(layoutDecodeIconGuide, 700);
			beginDecodeIconGuideTimers();
			return;
		}
	}
	if(decodeIconGuideVisible || isDecodeIconGuideConsumed())
		return;
	decodeIconGuideVisible = true;
	decodeIconGuideShownOnDecode = isDecodeIconGuideView();
	document.body.classList.add('decode-icon-guide');
	document.body.classList.remove('decode-icon-guide-fade');
	blurInputsForIconGuide();
	layoutDecodeIconGuide();
	watchMapCameraCaption();
	setTimeout(layoutDecodeIconGuide, 250);
	setTimeout(layoutDecodeIconGuide, 700);
	beginDecodeIconGuideTimers();
}

function requestDecodeIconGuide() {
	startDecodeIconGuide(true);
}

function syncDecodeIconGuide() {
	var decodeView = isDecodeIconGuideView();
	var autoShow;
	var allow;
	if(decodeIconGuideVisible && decodeIconGuideShownOnDecode !== decodeView) {
		if(decodeIconGuideShownOnDecode)
			decodeIconGuideConsumed = true;
		hideDecodeIconGuide();
	}
	if(decodeView) {
		mapIconGuideVisitRecorded = false;
		mapIconGuideConsumed = false;
	}
	else
		recordMapIconGuideVisit();
	autoShow = decodeView ? shouldShowDecodeIconGuide() : shouldShowMapIconGuide();
	allow = (decodeIconGuideForced || autoShow) && !shouldHoldDecodeIconGuide();
	if(allow && !isDecodeIconGuideConsumed() && !decodeIconGuideVisible)
		startDecodeIconGuide();
	else if(!allow && decodeIconGuideVisible)
		hideDecodeIconGuide();
	else if(decodeIconGuideVisible)
		layoutDecodeIconGuide();
}

function initDecodeIconGuide() {
	recordDecodeIconGuideLaunch();
	syncDecodeIconGuide();
	window.addEventListener('resize', layoutDecodeIconGuide);
}
