function showQR() {
	hideOverlay(document.getElementById('copy_wcode_message'));
	if(current_title)
		document.getElementById('qr_title_main').value = current_title;
	else
		document.getElementById('qr_title_main').value = '';
	if(current_segment)
		document.getElementById('qr_title_segment').value = current_segment;
	else
		document.getElementById('qr_title_segment').value = '';
		
	if(current_address) {
		document.getElementById('qr_address').innerText = current_address;
		qr_address_active_first = false;
	}
	else {
		document.getElementById('qr_address').innerHTML = "&nbsp;&nbsp;Address";
		qr_address_active_first = true;
	}
	
	var city_accent = getProperCityAccent(code_city);
	var code_string = code_wcode.join(' ');
	document.getElementById('qr_wcode_city').innerHTML = city_accent;
	document.getElementById('qr_wcode_code').innerHTML = code_string;
	showOverlay(document.getElementById('qr_container'));
	
	window.addEventListener('beforeprint', beforeQRprint);
	window.addEventListener('afterprint', afterQRprint);
}

function closeQR() {
	hideOverlay(document.getElementById('qr_container'));
	previewQR_deactivate()
	window.removeEventListener('afterprint', afterQRprint);
	window.removeEventListener('beforeprint', beforeQRprint);
	current_title = document.getElementById('qr_title_main').value;
	current_segment = document.getElementById('qr_title_segment').value;
	if(!qr_address_active_first)
		current_address = document.getElementById('qr_address').innerText;
}

function previewQR_activate() {
	var addressNode = document.getElementById('qr_address');
	mode_preview = true;
	hideEmptyElsePreview(document.getElementById('qr_title_main'));
	hideEmptyElsePreview(document.getElementById('qr_title_segment'));
	if(qr_address_active_first || !addressNode || addressNode.innerHTML.trim().length == 0)
		addClassIfPresent(addressNode, 'hide');
	else {
		addClassIfPresent(addressNode, 'preview');
		addressNode.setAttribute('contenteditable', false);
	}
	addClassIfPresent(document.getElementById('qr_preview'), 'button_active');
}

function previewQR_deactivate() {
	var addressNode = document.getElementById('qr_address');
	mode_preview = false;
	unHideEmptyAndRemovePreview(document.getElementById('qr_title_main'));
	unHideEmptyAndRemovePreview(document.getElementById('qr_title_segment'));
	if(addressNode)
		addressNode.setAttribute('contenteditable', true);
	removeClassIfPresent(addressNode, 'preview');
	removeClassIfPresent(addressNode, 'hide');
	removeClassIfPresent(document.getElementById('qr_preview'), 'button_active');
}

function qr_address_active() {
	var addressNode = document.getElementById('qr_address');
	if (qr_address_active_first) {
		qr_address_active_first = false;
		if(addressNode)
			addressNode.innerHTML = address;
	}
}

function hideEmptyElsePreview(node) {
	if(!node || !node.classList)
		return;
	if(typeof node.value == 'string' && node.value.trim() == '')
		node.classList.add('hide');
	else
		node.classList.add('preview');
}

function unHideEmptyAndRemovePreview(node) {
	if(!node || !node.classList)
		return;
	node.classList.remove('hide');
	node.classList.remove('preview');
}

function toggleQRpreview() {
	if(mode_preview)
		previewQR_deactivate();
	else
		previewQR_activate();
}

function setQRChromeHidden(hidden) {
	if(hidden) {
		addClassIfPresent(document.getElementById('qr_close'), 'hide');
		addClassIfPresent(document.getElementById('qr_save'), 'hide');
	}
	else {
		removeClassIfPresent(document.getElementById('qr_close'), 'hide');
		removeClassIfPresent(document.getElementById('qr_save'), 'hide');
	}
}

function beforeQRprint() {
	var overlay = document.getElementById('overlay');
	document.body.classList.add('print');
	if(!mode_preview) {
		toggleQRpreview();
		mode_preview_activated = true;
	}
	removeClassIfPresent(overlay, 'overlay');
	addClassIfPresent(overlay, 'section-to-print');
	setQRChromeHidden(true);
	addClassIfPresent(overlay, 'raster');
}

function afterQRprint() {
	var overlay = document.getElementById('overlay');
	document.body.classList.remove('print');
	addClassIfPresent(overlay, 'overlay');
	removeClassIfPresent(overlay, 'section-to-print');
	setQRChromeHidden(false);
	removeClassIfPresent(overlay, 'raster');
	if(mode_preview_activated)
		toggleQRpreview();
}

function printQR() {
	if(UMB.getCurrentBrowser() == 'safari')	
		beforeQRprint();
	window.print();
	if(UMB.getCurrentBrowser() == 'safari')
		afterQRprint();
}

function downloadQR() {
	var overlay = document.getElementById('overlay');
	var qrBody = document.getElementById('qr_body');
	if(!mode_preview) {
		toggleQRpreview();
		mode_preview_activated = true;
	}
	addClassIfPresent(document.getElementById('qr_close'), 'hide');
	addClassIfPresent(document.getElementById('qr_save'), 'hide');
	addClassIfPresent(document.getElementById('qr_controls'), 'hide');
	addClassIfPresent(overlay, 'raster');
	if(qrBody)
		qrBody.setAttribute( 'style',
		 "height: "+(qrBody.offsetHeight-6)+"px"+"; "+
		 "width: "+qrBody.offsetWidth+"px" );
	html2canvas( document.querySelector('#qr_body'), {scale:1} ).then( canvas => {
		if(mode_preview_activated)
			toggleQRpreview();
		removeClassIfPresent(overlay, 'raster');
		if(qrBody)
			qrBody.removeAttribute('style');
		removeClassIfPresent(document.getElementById('qr_close'), 'hide');
		removeClassIfPresent(document.getElementById('qr_save'), 'hide');
		removeClassIfPresent(document.getElementById('qr_controls'), 'hide');
		var qrImage = canvas.toDataURL("image/png");
		downloadURI(qrImage, "Wolo Code - " + getCodeFull_text() + ".png");
	} );
}

function downloadQR_minimal() {
	
	if(!mode_preview) {
		toggleQRpreview();
		mode_preview_activated = true;
	}
	addClassIfPresent(document.getElementById('qr_close'), 'hide');
	addClassIfPresent(document.getElementById('qr_save'), 'hide');
	addClassIfPresent(document.getElementById('qr_controls'), 'hide');
	addClassIfPresent(document.getElementById('overlay'), 'raster');
	addClassIfPresent(document.getElementById('overlay'), 'qr_minimal');
	addClassIfPresent(document.getElementById('qr_label'), 'hide');
	addClassIfPresent(document.getElementById('qr_webapp_url'), 'hide');
	html2canvas( document.querySelector('#qr_body'), {scale:1} ).then( canvas => {
		if(mode_preview_activated)
			toggleQRpreview();
		removeClassIfPresent(document.getElementById('overlay'), 'raster');
		removeClassIfPresent(document.getElementById('overlay'), 'qr_minimal');
		removeClassIfPresent(document.getElementById('qr_label'), 'hide');
		removeClassIfPresent(document.getElementById('qr_webapp_url'), 'hide');
		removeClassIfPresent(document.getElementById('qr_close'), 'hide');
		removeClassIfPresent(document.getElementById('qr_save'), 'hide');
		removeClassIfPresent(document.getElementById('qr_controls'), 'hide');

		window.jsPDF = window.jspdf.jsPDF;
		const doc = new jsPDF({orientation: "l", unit: "mm", format: [50, 75]});
		
		// offset - printer specific
		const xPadding = 6;
		const xStart = 6;
		const yStart = 12;
		const xSlashMargin = 4;
		const yMargin = 4;
		const sizeSlash = 14;
		const sizeWCode = 28;
		const wCodeHeight = 14;
		
		var text;
		var textWidth;
		
		doc.addFileToVFS('Abel-regular.ttf', font_abel_normal);
		doc.addFont('Abel-regular.ttf', 'Abel', 'normal');
		doc.addFileToVFS('Abel-bold.ttf', font_abel_bold);
		doc.addFont('Abel-bold.ttf', 'Abel', 'bold');
		
		x = xStart;
		y = yStart;
		doc.setFont('Abel', 'normal');
		doc.setFontSize(sizeSlash);
		text = '\\';
		doc.text(text, x, y);
		
		x += doc.getTextWidth(text) + xSlashMargin;
		doc.text(getCodeCityName(), x, y);
		
		doc.setFont('Abel', 'bold');
		doc.setFontSize(sizeWCode);
		x = (xPadding + doc.internal.pageSize.width) / 2;
		y += wCodeHeight + yMargin;
		text = getCodeWCode().join(' ');
		textWidth = doc.getTextWidth(text);
		doc.text(text, x, y, {align:'center', maxWidth:70});
		
		x += textWidth/2 + xSlashMargin;
		doc.setFont('Abel', 'normal');
		doc.setFontSize(sizeSlash);
		doc.text('/', x, y);

		doc.save("Wolo Code - " + getCodeFull_text() + ".pdf");
	} );
	
	hideCopyCodeMessage();
	
}

function downloadURI(uri, name) {
	var link = document.createElement('a');
	link.download = name;
	link.href = uri;
	link.click();
}

function onQRDialogSave() {
	if(!document.getElementById('qr_title_main').value.length) {
		showNotification("Title is required");
		return;
	}
	if(locating) {
		showNotification("Still locating..");
		return;
	}
	var user = firebase.auth().currentUser;
	if(user != null)
		uid = user.uid;
	var saveAddr = document.getElementById('qr_address').innerText;
	if(qr_address_active_first || saveAddr == '\xa0\xa0Address' || saveAddr.trim() == 'Address' || saveAddr == '')
		saveAddr = address;
	current_title = document.getElementById('qr_title_main').value;
	current_segment = document.getElementById('qr_title_segment').value;
	if(!qr_address_active_first)
		current_address = document.getElementById('qr_address').innerText;
	saveAddress(current_title, current_segment, saveAddr);
}
