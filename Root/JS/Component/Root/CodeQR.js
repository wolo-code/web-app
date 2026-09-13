function ensureQrcodeUtf8() {
	if(typeof qrcode == 'undefined' || !qrcode.stringToBytesFuncs)
		return;
	if(qrcode.stringToBytesFuncs['UTF-8'])
		qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
}

function getCodeQRValue(kind) {
	if(kind == 'digipin')
		return code_digipin ? String(code_digipin).toUpperCase() : '';
	if(kind == 'plus')
		return code_plus_code ? String(code_plus_code) : '';
	return address ? String(address) : '';
}

function getCodeQRTitle(kind) {
	if(kind == 'digipin')
		return 'DIGIPIN';
	if(kind == 'plus')
		return 'Plus code';
	return 'Address';
}

function renderCodeQR(value, attempt) {
	var host = document.getElementById('code_qr_image');
	if(!host)
		return;
	host.innerHTML = '';
	if(typeof qrcode != 'function') {
		if((attempt || 0) < 20) {
			setTimeout(function() {
				renderCodeQR(value, (attempt || 0) + 1);
			}, 50);
		}
		return;
	}
	ensureQrcodeUtf8();
	var qr = qrcode(0, 'M');
	qr.addData(value);
	qr.make();
	host.innerHTML = qr.createSvgTag({cellSize: 4, margin: 2, scalable: true});
}

function showCodeQR(kind) {
	var value = getCodeQRValue(kind);
	var dialog = document.getElementById('code_qr_message');
	var title = document.getElementById('code_qr_title');
	var valueNode = document.getElementById('code_qr_value');
	if(!dialog || !value)
		return;
	if(title)
		title.innerText = getCodeQRTitle(kind);
	if(valueNode)
		valueNode.innerText = value;
	renderCodeQR(value);
	showOverlay(dialog);
}

function closeCodeQR() {
	var dialog = document.getElementById('code_qr_message');
	var host = document.getElementById('code_qr_image');
	if(host)
		host.innerHTML = '';
	if(dialog)
		hideOverlay(dialog);
}

function onCodeQRButtonClick(event) {
	var button;
	if(event && event.stopPropagation)
		event.stopPropagation();
	if(event && event.preventDefault)
		event.preventDefault();
	button = event && event.currentTarget;
	if(!button)
		return;
	showCodeQR(button.getAttribute('data-code-qr'));
}

function syncAddressQRButtons() {
	var button = document.getElementById('address_text_address_qr');
	if(!button)
		return;
	if(address && String(address).trim())
		button.classList.remove('hide');
	else
		button.classList.add('hide');
}
