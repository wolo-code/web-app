function getVisibleOverlayDialog() {
	var overlay = document.getElementById('overlay');
	var visible_div;
	if(!overlay || overlay.classList.contains('hide') || !overlay.children[0])
		return null;
	for(var child = overlay.children[0].firstChild; child !== null; child = child.nextSibling)
		if(child.nodeType == 1 && !child.classList.contains('hide'))
			visible_div = child;
	return visible_div || null;
}

function isBlockingOverlayDialog(dialog) {
	return !!(dialog && dialog.id === 'exception_message');
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
	close = dialog.querySelector('.message_dialog_close:not(.message_dialog_leading_action)');
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
	if(event && isOverlayBackdropTarget(event.target))
		dismissVisibleOverlay();
}

function hideOverlay(e) {
	var visible_div = getVisibleOverlayDialog();
	if(visible_div == e) {
		document.getElementById('overlay').classList.add('hide');
		visible_div.classList.add('hide');
	}
	if(typeof syncDecodeIconGuide == 'function')
		syncDecodeIconGuide();
	if(typeof layoutBottomNotification == 'function')
		layoutBottomNotification();
}

function showOverlay(e) {
	for(var child= document.getElementById('overlay').children[0].firstChild; child!==null; child=child.nextSibling)
		if(child.nodeType == 1 && !child.classList.contains('hide') && child != e)
			child.classList.add('hide');
	if(document.getElementById('overlay').classList.contains('hide'))
		document.getElementById('overlay').classList.remove('hide');
	if(e.classList.contains('hide'))
		e.classList.remove('hide');
	if(typeof syncDecodeIconGuide == 'function')
		syncDecodeIconGuide();
	if(typeof layoutBottomNotification == 'function')
		layoutBottomNotification();
}
