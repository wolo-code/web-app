function getOverlayRoot() {
	return document.getElementById('overlay');
}

function hideOverlay(e) {
	var overlay = getOverlayRoot();
	var host;
	var visible_div;
	var child;
	if(!overlay || !overlay.classList || !overlay.children || !overlay.children[0])
		return;
	host = overlay.children[0];
	for(child = host.firstChild; child !== null; child = child.nextSibling)
		if(child.nodeType == 1 && child.classList && !child.classList.contains('hide'))
			visible_div = child;
	if(!overlay.classList.contains('hide') && visible_div && visible_div === e) {
		overlay.classList.add('hide');
		visible_div.classList.add('hide');
	}
}

function showOverlay(e) {
	var overlay = getOverlayRoot();
	var host;
	var child;
	if(!overlay || !overlay.classList || !e || !e.classList)
		return;
	if(overlay.children && overlay.children[0]) {
		host = overlay.children[0];
		for(child = host.firstChild; child !== null; child = child.nextSibling)
			if(child.nodeType == 1 && child.classList && !child.classList.contains('hide') && child !== e)
				child.classList.add('hide');
	}
	if(overlay.classList.contains('hide'))
		overlay.classList.remove('hide');
	if(e.classList.contains('hide'))
		e.classList.remove('hide');
}
