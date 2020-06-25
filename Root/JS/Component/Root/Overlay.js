function hideOverlay(e) {
	var visible_div;
	for(var child= document.getElementById('overlay').childNodes[1].firstChild; child!==null; child=child.nextSibling)
		if(child.nodeType == 1 && !child.classList.contains('hide'))
			visible_div = child;
	if(!document.getElementById('overlay').classList.contains('hide'))
		if(visible_div == e) {
			document.getElementById('overlay').classList.add('hide');
			visible_div.classList.add('hide');
		}
}

function showOverlay(e) {
	for(var child= document.getElementById('overlay').childNodes[1].firstChild; child!==null; child=child.nextSibling)
		if(child.nodeType == 1 && !child.classList.contains('hide') && child != e)
			child.classList.add('hide');
	if(document.getElementById('overlay').classList.contains('hide'))
		document.getElementById('overlay').classList.remove('hide');
	if(e.classList.contains('hide'))
		e.classList.remove('hide');
}
