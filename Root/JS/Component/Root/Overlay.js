function isInfoIntroActive() {
	var overlay = document.getElementById('overlay');
	var message = document.getElementById('info_message');
	var intro = document.getElementById('info_intro');
	return !!(overlay && message && intro
		&& overlay.classList && message.classList && intro.classList
		&& !overlay.classList.contains('hide')
		&& !message.classList.contains('hide')
		&& !intro.classList.contains('hide'));
}

function getVisibleOverlayDialog() {
	var overlay = document.getElementById('overlay');
	var visible_div;
	if(isInfoIntroActive())
		return document.getElementById('info_message');
	if(!overlay || !overlay.classList || overlay.classList.contains('hide') || !overlay.children || !overlay.children[0])
		return null;
	for(var child = overlay.children[0].firstChild; child !== null; child = child.nextSibling)
		if(child.nodeType == 1 && child.classList && !child.classList.contains('hide'))
			visible_div = child;
	return visible_div || null;
}

function isBlockingOverlayDialog(dialog) {
	if(!dialog)
		return false;
	if(isInfoIntroActive())
		return true;
	if(dialog.id === 'exception_message')
		return true;
	return false;
}

function isOverlayBackdropTarget(target) {
	var dialog = getVisibleOverlayDialog();
	if(!dialog || !target || isBlockingOverlayDialog(dialog))
		return false;
	return !dialog.contains(target);
}

function dismissVisibleOverlay() {
	var dialog = getVisibleOverlayDialog();
	var close;
	var cancel;
	if(!dialog || isBlockingOverlayDialog(dialog))
		return;
	close = dialog.querySelector('.message_dialog_close:not(.message_dialog_leading_action):not(.hide)');
	if(close) {
		close.click();
		return;
	}
	cancel = dialog.querySelector('#redirect_cancel');
	if(cancel) {
		cancel.click();
		return;
	}
	hideOverlay(dialog);
}

function onOverlayBackdropClick(event) {
	if(isInfoIntroActive())
		return;
	if(event && isOverlayBackdropTarget(event.target))
		dismissVisibleOverlay();
}

function unbindOverlayBackdropClick() {
	var overlay = document.getElementById('overlay');
	if(!overlay || !overlay.dataset || !overlay.dataset.backdropClickBound)
		return;
	overlay.removeEventListener('click', onOverlayBackdropClick);
	delete overlay.dataset.backdropClickBound;
}

function bindOverlayBackdropClick() {
	var overlay = document.getElementById('overlay');
	if(!overlay || !overlay.dataset || overlay.dataset.backdropClickBound || isInfoIntroActive())
		return;
	overlay.dataset.backdropClickBound = 'true';
	overlay.addEventListener('click', onOverlayBackdropClick);
}

if(document.readyState === 'loading')
	document.addEventListener('DOMContentLoaded', bindOverlayBackdropClick);
else
	bindOverlayBackdropClick();

function hideOverlay(e) {
	var overlay = document.getElementById('overlay');
	var visible_div;
	if(isInfoIntroActive() && (!e || e.id === 'info_message'))
		return;
	visible_div = getVisibleOverlayDialog();
	if(visible_div == e && overlay && overlay.classList && visible_div.classList) {
		overlay.classList.add('hide');
		visible_div.classList.add('hide');
	}
	if(isInfoIntroActive())
		return;
	if(typeof syncDecodeIconGuide == 'function')
		syncDecodeIconGuide();
	if(typeof layoutBottomNotification == 'function')
		layoutBottomNotification();
	if(typeof scheduleFocusMapSearchInput == 'function')
		scheduleFocusMapSearchInput();
}

function showOverlay(e) {
	if(!e || !e.classList)
		return;
	if(isInfoIntroActive() && e.id !== 'info_message')
		return;
	var overlay = document.getElementById('overlay');
	if(!overlay || !overlay.classList || !overlay.children || !overlay.children[0])
		return;
	for(var child = overlay.children[0].firstChild; child !== null; child = child.nextSibling)
		if(child.nodeType == 1 && child.classList && !child.classList.contains('hide') && child != e)
			child.classList.add('hide');
	if(overlay.classList.contains('hide'))
		overlay.classList.remove('hide');
	if(e.classList.contains('hide'))
		e.classList.remove('hide');
	if(isInfoIntroActive())
		unbindOverlayBackdropClick();
	if(typeof decodeIconGuideVisible != 'undefined' && decodeIconGuideVisible && typeof hideDecodeIconGuide == 'function')
		hideDecodeIconGuide();
	if(typeof layoutBottomNotification == 'function')
		layoutBottomNotification();
}
