function showQR() {
	document.getElementById('qr_title_main').value = document.getElementById('qr_pre_title_main').value;
	document.getElementById('qr_title_segment').value = document.getElementById('qr_pre_title_segment').value;
	
	var city_accent = getProperCityAccent(code_city);
	var code_string = code_wcode.join(' ');
	document.getElementById('qr_wcode_city').innerHTML = city_accent;
	document.getElementById('qr_wcode_code').innerHTML = code_string;
	document.getElementById('qr_image').setAttribute( 'src', src="https://chart.googleapis.com/chart?cht=qr&chs=380x380&chl=https://"+location.hostname + '/' + getCodeFull().join('.').toLowerCase().replace(' ', '_') + "&chld=L|2" );
	document.getElementById('qr').classList.remove('hide');
}

function closeQR() {
	document.getElementById('qr').classList.add('hide');
	previewQR_deactivate()
	document.getElementById('qr_address').innerHTML = "&nbsp;&nbsp;Address (optional)";
	document.getElementById('qr_address').classList.add('initial');
	qr_address_active_first = true;
}

function previewQR_activate() {
	mode_preview = true;
	hideEmptyElsePreview(document.getElementById('qr_title_main'));
	hideEmptyElsePreview(document.getElementById('qr_title_segment'));
	if(qr_address_active_first || document.getElementById('qr_address').innerHTML.trim().length == 0)
		document.getElementById('qr_address').classList.add('hide');
	else {
		document.getElementById('qr_address').classList.add('preview');
		document.getElementById('qr_address').setAttribute('contenteditable', false);
	}
	document.getElementById('qr_close').classList.add('hide');
	document.getElementById('qr_preview').classList.add('button_active');
}

function previewQR_deactivate() {
	mode_preview = false;
	unHideEmptyAndRemovePreview(document.getElementById('qr_title_main'));
	unHideEmptyAndRemovePreview(document.getElementById('qr_title_segment'));
	document.getElementById('qr_address').setAttribute('contenteditable', true);
	document.getElementById('qr_address').classList.remove('preview');
	document.getElementById('qr_address').classList.remove('hide');
	document.getElementById('qr_close').classList.remove('hide');
	document.getElementById('qr_preview').classList.remove('button_active');
}

function qr_address_active() {
	if (qr_address_active_first) {
		qr_address_active_first = false;
		document.getElementById('qr_address').classList.remove('initial');
		document.getElementById('qr_address').innerHTML = address;
	}
}

function hideEmptyElsePreview(node) {
	if(node.value.trim() == '')
		node.classList.add('hide')
	else
		node.classList.add('preview')
}

function unHideEmptyAndRemovePreview(node) {
	node.classList.remove('hide');
	node.classList.remove('preview');
}

function toggleQRpreview() {
	if(mode_preview) {
		previewQR_deactivate();
		document.getElementById('qr_body').classList.remove('section-to-print');
	}
	else {
		previewQR_activate();
		document.getElementById('qr_body').classList.add('section-to-print');
	}
}

function printQR() {
	window.addEventListener('beforeprint', beforeQRprint);
	window.addEventListener('afterprint', afterQRprint);
	window.print();
}

function beforeQRprint() {
	if(!mode_preview) {
		toggleQRpreview();
		mode_preview_activated = true;
	}
	document.getElementById('qr').classList.remove('overlay');
	document.getElementById('qr').classList.add('section-to-print');
	window.removeEventListener('beforeprint', beforeQRprint);
}

function afterQRprint() {
	document.getElementById('qr').classList.add('overlay');
	document.getElementById('qr').classList.remove('section-to-print');
	if(mode_preview_activated)
		toggleQRpreview();
	window.removeEventListener('afterprint', afterQRprint);
}
