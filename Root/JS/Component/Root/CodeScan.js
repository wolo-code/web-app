var codeScanState = {
	active: false,
	source: 'decode',
	phase: 'live',
	detectionMode: 'fixed',
	hasCaptured: false,
	stream: null,
	worker: null,
	scanTimer: null,
	processing: false,
	lastMatchCode: '',
	stableMatchCount: 0,
	lastMatchBBox: null,
	tesseractPromise: null,
	cameraAvailable: false
};

var CODE_SCAN_FRAME_INTERVAL_MS = 1600;
var CODE_SCAN_STABLE_MATCHES = 3;
var CODE_SCAN_BBOX_IOU_MIN = 0.55;
var CODE_SCAN_MIN_CONFIDENCE = 55;
var CODE_SCAN_TESSERACT_BASE = '/tesseract';
var CODE_SCAN_FIXED_ASPECT = 3;
var CODE_SCAN_FIXED_ASPECT_TOLERANCE = 0.2;
var CODE_SCAN_FIXED_MIN_EDGE_CONTRAST = 12;

function initCodeScan() {
	bindControl('decode_code_scan_button', 'click', openCodeScan);
	bindControl('map_code_scan_button', 'click', openCodeScan);
	bindControl('code_scan_close', 'click', closeCodeScan);
	bindControl('code_scan_type_instead', 'click', closeCodeScan);
	bindControl('code_scan_cancel', 'click', closeCodeScan);
	bindControl('code_scan_use_photo', 'click', openCodeScanPhotoPicker);
	bindControl('code_scan_capture', 'click', captureCodeScanManually);
	bindControl('code_scan_use_code', 'click', useCodeScanReview);
	bindControl('code_scan_rescan', 'click', rescanCodeScan);
	bindControl('code_scan_mode_fixed', 'click', function() {
		setCodeScanDetectionMode('fixed');
	});
	bindControl('code_scan_mode_general', 'click', function() {
		setCodeScanDetectionMode('general');
	});
	bindCodeScanReviewInputListeners();
	var photoInput = document.getElementById('code_scan_photo_input');
	if(photoInput)
		photoInput.addEventListener('change', handleCodeScanPhotoInput);
}

function bindCodeScanReviewInputListeners() {
	var ids = ['code_scan_review_city', 'code_scan_review_w1', 'code_scan_review_w2', 'code_scan_review_w3'];
	var i;
	var node;
	for(i = 0; i < ids.length; i++) {
		node = document.getElementById(ids[i]);
		if(node)
			node.addEventListener('input', updateCodeScanReviewValidity);
	}
}

function openCodeScan(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	if(typeof wordList == 'undefined' || !wordList) {
		showNotification('Word list is still loading. Try again in a moment.');
		return;
	}
	codeScanState.source = event && event.currentTarget && event.currentTarget.id === 'map_code_scan_button' ? 'map' : 'decode';
	codeScanState.hasCaptured = false;
	resetCodeScanUi();
	setCodeScanPhotoFallbackVisible(true);
	showOverlay(document.getElementById('code_scan_message'));
	codeScanState.active = true;
	setCodeScanDetectionMode('fixed');
	if(codeScanOcrMatch.isCodeScanSupported()) {
		setCodeScanStatus('Requesting camera...');
		startCodeScanCamera();
		return;
	}
	codeScanState.cameraAvailable = false;
	setCodeScanViewportVisible(false);
	setCodeScanLiveControlsVisible(false);
	setCodeScanStatus('Live camera is not supported here. Use a photo of the label or type the code instead.');
}

function openCodeScanPhotoPicker(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	var photoInput = document.getElementById('code_scan_photo_input');
	if(!photoInput)
		return;
	photoInput.value = '';
	photoInput.click();
}

function closeCodeScan(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	stopCodeScan();
	hideOverlay(document.getElementById('code_scan_message'));
}

function stopCodeScan() {
	codeScanState.active = false;
	codeScanState.processing = false;
	codeScanState.cameraAvailable = false;
	codeScanState.phase = 'live';
	codeScanState.hasCaptured = false;
	resetCodeScanMatchState();
	clearCodeScanTimer();
	stopCodeScanCamera();
	terminateCodeScanWorker();
	resetCodeScanUi();
	var photoInput = document.getElementById('code_scan_photo_input');
	if(photoInput)
		photoInput.value = '';
}

function resetCodeScanUi() {
	setCodeScanPhase('live');
	clearCodeScanReviewFields();
	setCodeScanFrozenPreview(false);
	setCodeScanLiveControlsVisible(true);
	setCodeScanReviewVisible(false);
	setCodeScanCaptureEnabled(true);
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
}

function resetCodeScanMatchState() {
	codeScanState.lastMatchCode = '';
	codeScanState.stableMatchCount = 0;
	codeScanState.lastMatchBBox = null;
}

function clearCodeScanTimer() {
	if(codeScanState.scanTimer) {
		clearTimeout(codeScanState.scanTimer);
		codeScanState.scanTimer = null;
	}
}

function isCodeScanVisible() {
	var node = document.getElementById('code_scan_message');
	return !!(node && !node.classList.contains('hide'));
}

function setCodeScanPhase(phase) {
	codeScanState.phase = phase || 'live';
}

function setCodeScanDetectionMode(mode) {
	var viewport = document.querySelector('.code_scan_viewport');
	var fixedButton = document.getElementById('code_scan_mode_fixed');
	var generalButton = document.getElementById('code_scan_mode_general');
	if(codeScanState.phase !== 'live' || codeScanState.hasCaptured)
		return;
	codeScanState.detectionMode = mode === 'general' ? 'general' : 'fixed';
	resetCodeScanMatchState();
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	if(viewport)
		viewport.classList.toggle('code_scan_mode_general', codeScanState.detectionMode === 'general');
	if(fixedButton)
		fixedButton.classList.toggle('code_scan_mode_active', codeScanState.detectionMode === 'fixed');
	if(generalButton)
		generalButton.classList.toggle('code_scan_mode_active', codeScanState.detectionMode === 'general');
	if(codeScanState.phase === 'live' && codeScanState.cameraAvailable)
		setCodeScanStatus(codeScanState.detectionMode === 'fixed'
			? 'Align the label inside the frame, then capture.'
			: 'Point your camera at the printed Wolo Code label.');
}

function scheduleCodeScanFrame() {
	clearCodeScanTimer();
	if(!codeScanState.active || !isCodeScanVisible() || codeScanState.hasCaptured) {
		if(codeScanState.active && !codeScanState.hasCaptured)
			stopCodeScan();
		return;
	}
	if(codeScanState.phase !== 'live')
		return;
	codeScanState.scanTimer = setTimeout(runCodeScanFrame, CODE_SCAN_FRAME_INTERVAL_MS);
}

function getCodeScanVideo() {
	return document.getElementById('code_scan_video');
}

function getCodeScanCanvas() {
	return document.getElementById('code_scan_canvas');
}

function startCodeScanCamera() {
	var video = getCodeScanVideo();
	if(!video)
		return;
	navigator.mediaDevices.getUserMedia({
		video: {
			facingMode: {ideal: 'environment'},
			width: {ideal: 1280},
			height: {ideal: 720}
		},
		audio: false
	}).then(function(stream) {
		if(!codeScanState.active) {
			stream.getTracks().forEach(function(track) {
				track.stop();
			});
			return;
		}
		codeScanState.stream = stream;
		video.srcObject = stream;
		return video.play();
	}).then(function() {
		if(!codeScanState.active)
			return;
		codeScanState.cameraAvailable = true;
		setCodeScanViewportVisible(true);
		setCodeScanLiveControlsVisible(true);
		setCodeScanFrozenPreview(false);
		setCodeScanStatus(codeScanState.detectionMode === 'fixed'
			? 'Align the label inside the frame, then capture.'
			: 'Point your camera at the printed Wolo Code label.');
		prepareCodeScanWorker().then(function() {
			if(codeScanState.active && codeScanState.phase === 'live' && !codeScanState.hasCaptured)
				scheduleCodeScanFrame();
		}).catch(handleCodeScanWorkerError);
	}).catch(handleCodeScanCameraError);
}

function stopCodeScanCamera() {
	var video = getCodeScanVideo();
	if(codeScanState.stream) {
		codeScanState.stream.getTracks().forEach(function(track) {
			track.stop();
		});
		codeScanState.stream = null;
	}
	if(video) {
		video.pause();
		video.srcObject = null;
	}
}

function loadCodeScanTesseractScript() {
	if(window.Tesseract)
		return Promise.resolve(window.Tesseract);
	if(codeScanState.tesseractPromise)
		return codeScanState.tesseractPromise;
	codeScanState.tesseractPromise = new Promise(function(resolve, reject) {
		var script = document.createElement('script');
		script.src = CODE_SCAN_TESSERACT_BASE + '/tesseract.min.js';
		script.async = true;
		script.onload = function() {
			if(window.Tesseract)
				resolve(window.Tesseract);
			else
				reject(new Error('Tesseract failed to load'));
		};
		script.onerror = function() {
			reject(new Error('Tesseract failed to load'));
		};
		document.head.appendChild(script);
	});
	return codeScanState.tesseractPromise;
}

function prepareCodeScanWorker() {
	if(codeScanState.worker)
		return Promise.resolve(codeScanState.worker);
	setCodeScanStatus('Loading on-device scanner...');
	return loadCodeScanTesseractScript().then(function(Tesseract) {
		return Tesseract.createWorker('eng', 1, {
			workerPath: CODE_SCAN_TESSERACT_BASE + '/worker.min.js',
			langPath: CODE_SCAN_TESSERACT_BASE + '/lang',
			corePath: CODE_SCAN_TESSERACT_BASE + '/tesseract-core.wasm.min.js',
			logger: function() {}
		});
	}).then(function(worker) {
		return worker.setParameters({
			tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ '
		}).then(function() {
			codeScanState.worker = worker;
			return worker;
		});
	});
}

function terminateCodeScanWorker() {
	if(!codeScanState.worker)
		return;
	codeScanState.worker.terminate();
	codeScanState.worker = null;
}

function handleCodeScanCameraError(error) {
	var message = 'Camera permission denied. Use a photo of the label or type the code instead.';
	if(error && error.name === 'NotFoundError')
		message = 'No camera found. Use a photo of the label or type the code instead.';
	else if(error && error.name === 'NotAllowedError')
		message = 'Camera permission denied. Use a photo of the label or type the code instead.';
	else if(error && error.name === 'NotReadableError')
		message = 'Camera is unavailable. Use a photo of the label or type the code instead.';
	codeScanState.cameraAvailable = false;
	setCodeScanViewportVisible(false);
	setCodeScanLiveControlsVisible(false);
	setCodeScanStatus(message);
	showNotification(message);
	stopCodeScanCamera();
}

function handleCodeScanWorkerError() {
	setCodeScanStatus('Scanner failed to load. Type or paste your Wolo Code instead.');
	showNotification('Scanner failed to load. Type or paste your Wolo Code instead.');
}

function runCodeScanFrame() {
	if(!codeScanState.active || codeScanState.processing || codeScanState.phase !== 'live' || codeScanState.hasCaptured) {
		if(codeScanState.active && codeScanState.phase === 'live' && !codeScanState.hasCaptured)
			scheduleCodeScanFrame();
		return;
	}
	var video = getCodeScanVideo();
	var canvas = getCodeScanCanvas();
	if(!video || !canvas || !codeScanState.worker || video.readyState < 2) {
		scheduleCodeScanFrame();
		return;
	}
	codeScanState.processing = true;
	captureCodeScanFrame(video, canvas);
	if(codeScanState.detectionMode === 'fixed')
		cropCodeScanCanvasToFixedRatio(canvas);
	codeScanState.worker.recognize(canvas).then(function(result) {
		codeScanState.processing = false;
		if(!codeScanState.active || codeScanState.phase !== 'live' || codeScanState.hasCaptured)
			return;
		handleCodeScanLiveOcrResult(result, canvas);
		scheduleCodeScanFrame();
	}).catch(function() {
		codeScanState.processing = false;
		if(codeScanState.active && codeScanState.phase === 'live' && !codeScanState.hasCaptured)
			scheduleCodeScanFrame();
	});
}

function captureCodeScanFrame(video, canvas) {
	var width = video.videoWidth;
	var height = video.videoHeight;
	var targetWidth;
	var targetHeight;
	if(!width || !height)
		return;
	targetWidth = Math.min(width, 960);
	targetHeight = Math.round(height * (targetWidth / width));
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	canvas.getContext('2d').drawImage(video, 0, 0, targetWidth, targetHeight);
}

function cropCodeScanCanvasToFixedRatio(canvas) {
	var ctx = canvas.getContext('2d');
	var width = canvas.width;
	var height = canvas.height;
	var cropWidth;
	var cropHeight;
	var sx;
	var sy;
	var imageData;
	if(!width || !height)
		return;
	if(width / height >= CODE_SCAN_FIXED_ASPECT) {
		cropHeight = height;
		cropWidth = Math.round(height * CODE_SCAN_FIXED_ASPECT);
	}
	else {
		cropWidth = width;
		cropHeight = Math.round(width / CODE_SCAN_FIXED_ASPECT);
	}
	sx = Math.max(0, Math.round((width - cropWidth) / 2));
	sy = Math.max(0, Math.round((height - cropHeight) / 2));
	imageData = ctx.getImageData(sx, sy, cropWidth, cropHeight);
	canvas.width = cropWidth;
	canvas.height = cropHeight;
	ctx.putImageData(imageData, 0, 0);
}

function extractMatchFromOcrResult(result) {
	var text = result && result.data && result.data.text ? result.data.text : '';
	var confidence = result && result.data && typeof result.data.confidence == 'number' ? result.data.confidence : 0;
	if(!text || confidence < CODE_SCAN_MIN_CONFIDENCE)
		return null;
	return codeScanOcrMatch.matchOcrTextToWoloCode(text, wordList.includes.bind(wordList), wordList.curList);
}

function extractGuidanceFromOcrResult(result, canvas) {
	var match = extractMatchFromOcrResult(result);
	var bbox;
	if(!match)
		return null;
	bbox = codeScanOcrMatch.extractMatchBBoxFromOcr(result, match, wordList.includes.bind(wordList), wordList.curList);
	if(!bbox && canvas)
		bbox = codeScanOcrMatch.getCenteredFixedGuideBBox(canvas.width, canvas.height, CODE_SCAN_FIXED_ASPECT);
	return {
		match: match,
		bbox: bbox
	};
}

function handleCodeScanLiveOcrResult(result, canvas) {
	var guidance = extractGuidanceFromOcrResult(result, canvas);
	var match;
	var bbox;
	var iou;
	var borderReady;
	if(!guidance) {
		setCodeScanStatus(codeScanState.detectionMode === 'fixed'
			? 'Align the label inside the frame, then capture.'
			: 'Looking for a Wolo Code label...');
		resetCodeScanMatchState();
		clearCodeScanCandidateHighlight();
		setCodeScanWoloFoundCue(false);
		return;
	}
	match = guidance.match;
	bbox = guidance.bbox;
	setCodeScanCandidateHighlight(bbox, canvas);
	setCodeScanWoloFoundCue(true);
	setCodeScanStatus('Wolo Code found');
	if(match.code === codeScanState.lastMatchCode && codeScanState.lastMatchBBox && bbox)
		iou = codeScanOcrMatch.bboxIoU(codeScanState.lastMatchBBox, bbox);
	else
		iou = 0;
	if(match.code === codeScanState.lastMatchCode && (!bbox || !codeScanState.lastMatchBBox || iou >= CODE_SCAN_BBOX_IOU_MIN))
		codeScanState.stableMatchCount += 1;
	else {
		codeScanState.lastMatchCode = match.code;
		codeScanState.stableMatchCount = 1;
		codeScanState.lastMatchBBox = bbox;
	}
	borderReady = codeScanState.detectionMode !== 'fixed' || codeScanOcrMatch.isFixedBorderReady(
		canvas,
		bbox,
		CODE_SCAN_FIXED_ASPECT,
		CODE_SCAN_FIXED_ASPECT_TOLERANCE,
		CODE_SCAN_FIXED_MIN_EDGE_CONTRAST
	);
	if(codeScanState.stableMatchCount >= CODE_SCAN_STABLE_MATCHES && borderReady) {
		setCodeScanStatus('Wolo Code found. Capturing...');
		beginCodeScanCapture();
		return;
	}
	if(codeScanState.stableMatchCount >= 2)
		setCodeScanStatus('Hold steady...');
}

function captureCodeScanManually(event) {
	var video;
	var canvas;
	if(event && event.preventDefault)
		event.preventDefault();
	if(!codeScanState.active || codeScanState.phase !== 'live' || codeScanState.processing || codeScanState.hasCaptured)
		return;
	video = getCodeScanVideo();
	canvas = getCodeScanCanvas();
	if(!video || !canvas || video.readyState < 2)
		return;
	clearCodeScanTimer();
	codeScanState.processing = true;
	setCodeScanCaptureEnabled(false);
	captureCodeScanFrame(video, canvas);
	if(codeScanState.detectionMode === 'fixed')
		cropCodeScanCanvasToFixedRatio(canvas);
	beginCodeScanCapture();
}

function beginCodeScanCapture() {
	clearCodeScanTimer();
	codeScanState.hasCaptured = true;
	codeScanState.processing = true;
	setCodeScanCaptureEnabled(false);
	setCodeScanPhase('processing');
	setCodeScanLiveControlsVisible(false);
	setCodeScanPhotoFallbackVisible(false);
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	stopCodeScanCamera();
	setCodeScanFrozenPreview(true);
	setCodeScanStatus('Reading label on your device...');
	processCodeScanCapture();
}

function processCodeScanCapture() {
	var canvas = getCodeScanCanvas();
	if(!codeScanState.worker || !canvas) {
		codeScanState.processing = false;
		if(codeScanState.active)
			showCodeScanReview(null);
		return;
	}
	codeScanState.worker.recognize(canvas).then(function(result) {
		codeScanState.processing = false;
		if(!codeScanState.active)
			return;
		showCodeScanReview(extractMatchFromOcrResult(result));
	}).catch(function() {
		codeScanState.processing = false;
		if(codeScanState.active)
			showCodeScanReview(null);
	});
}

function showCodeScanReview(match) {
	var review = codeScanOcrMatch.splitMatchForReview(match);
	setCodeScanPhase('review');
	setCodeScanReviewVisible(true);
	setCodeScanLiveControlsVisible(false);
	setCodeScanPhotoFallbackVisible(false);
	setCodeScanFrozenPreview(true);
	populateCodeScanReviewFields(review.city, review.words[0], review.words[1], review.words[2]);
	populateCodeScanCityChoices(review.city);
	updateCodeScanReviewValidity();
	if(match)
		setCodeScanStatus('Check the city and three words, then tap Use Code.');
	else
		setCodeScanStatus('Enter the city and three words, then tap Use Code.');
}

function populateCodeScanReviewFields(city, w1, w2, w3) {
	var cityInput = document.getElementById('code_scan_review_city');
	var w1Input = document.getElementById('code_scan_review_w1');
	var w2Input = document.getElementById('code_scan_review_w2');
	var w3Input = document.getElementById('code_scan_review_w3');
	if(cityInput)
		cityInput.value = city || '';
	if(w1Input)
		w1Input.value = w1 || '';
	if(w2Input)
		w2Input.value = w2 || '';
	if(w3Input)
		w3Input.value = w3 || '';
}

function populateCodeScanCityChoices(recognizedCity) {
	var datalist = document.getElementById('code_scan_city_choices');
	var choices = [];
	var seen = {};
	var i;
	var city;
	var name;
	function addCity(cityName) {
		var key;
		if(!cityName)
			return;
		key = String(cityName).toLowerCase();
		if(seen[key])
			return;
		seen[key] = true;
		choices.push(cityName);
	}
	if(!datalist)
		return;
	addCity(recognizedCity);
	if(typeof decode_city_history !== 'undefined' && decode_city_history) {
		for(i = 0; i < decode_city_history.length && i < 5; i++) {
			city = decode_city_history[i];
			name = typeof getDecodeCityDisplayName == 'function' ? getDecodeCityDisplayName(city) : city.name;
			addCity(name);
		}
	}
	if(typeof geoIp_city_name !== 'undefined' && geoIp_city_name)
		addCity(geoIp_city_name);
	if(typeof selected_decode_city !== 'undefined' && selected_decode_city && selected_decode_city.name)
		addCity(selected_decode_city.name);
	datalist.innerHTML = '';
	for(i = 0; i < choices.length; i++) {
		var option = document.createElement('option');
		option.value = choices[i];
		datalist.appendChild(option);
	}
}

function clearCodeScanReviewFields() {
	populateCodeScanReviewFields('', '', '', '');
	populateCodeScanCityChoices('');
	updateCodeScanReviewValidity();
}

function updateCodeScanReviewValidity() {
	var cityInput = document.getElementById('code_scan_review_city');
	var w1Input = document.getElementById('code_scan_review_w1');
	var w2Input = document.getElementById('code_scan_review_w2');
	var w3Input = document.getElementById('code_scan_review_w3');
	var useCodeButton = document.getElementById('code_scan_use_code');
	var validityNode = document.getElementById('code_scan_review_validity');
	var valid = false;
	if(w1Input && w2Input && w3Input)
		valid = codeScanOcrMatch.validateReviewWords(w1Input.value, w2Input.value, w3Input.value, wordList.includes.bind(wordList));
	if(useCodeButton)
		useCodeButton.disabled = !valid;
	if(validityNode) {
		validityNode.textContent = valid ? 'Ready to decode.' : 'Enter three valid Wolo words.';
		validityNode.classList.toggle('code_scan_review_valid', valid);
	}
	if(cityInput && !cityInput.value && typeof selected_decode_city !== 'undefined' && selected_decode_city && selected_decode_city.name)
		cityInput.placeholder = selected_decode_city.name;
}

function useCodeScanReview(event) {
	var cityInput;
	var w1Input;
	var w2Input;
	var w3Input;
	var code;
	if(event && event.preventDefault)
		event.preventDefault();
	if(!codeScanState.active || codeScanState.phase !== 'review')
		return;
	cityInput = document.getElementById('code_scan_review_city');
	w1Input = document.getElementById('code_scan_review_w1');
	w2Input = document.getElementById('code_scan_review_w2');
	w3Input = document.getElementById('code_scan_review_w3');
	if(!w1Input || !w2Input || !w3Input)
		return;
	if(!codeScanOcrMatch.validateReviewWords(w1Input.value, w2Input.value, w3Input.value, wordList.includes.bind(wordList))) {
		updateCodeScanReviewValidity();
		showNotification('Enter three valid Wolo words from the list.');
		return;
	}
	code = codeScanOcrMatch.buildCodeFromReview(
		cityInput ? cityInput.value : '',
		w1Input.value,
		w2Input.value,
		w3Input.value
	);
	applyScannedWoloCode(code);
}

function rescanCodeScan(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	if(!codeScanState.active)
		return;
	codeScanState.hasCaptured = false;
	clearCodeScanReviewFields();
	setCodeScanReviewVisible(false);
	setCodeScanFrozenPreview(false);
	setCodeScanPhase('live');
	resetCodeScanMatchState();
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	setCodeScanPhotoFallbackVisible(true);
	if(codeScanOcrMatch.isCodeScanSupported()) {
		setCodeScanViewportVisible(true);
		setCodeScanLiveControlsVisible(true);
		setCodeScanCaptureEnabled(true);
		setCodeScanStatus(codeScanState.detectionMode === 'fixed'
			? 'Align the label inside the frame, then capture.'
			: 'Point your camera at the printed Wolo Code label.');
		startCodeScanCamera();
		return;
	}
	setCodeScanLiveControlsVisible(false);
	setCodeScanStatus('Live camera is not supported here. Use a photo of the label or type the code instead.');
}

function applyScannedWoloCode(code) {
	var decodeInput = document.getElementById('decode_input');
	var pacInput = document.getElementById('pac-input');
	var fromMap = codeScanState.source === 'map';
	stopCodeScan();
	hideOverlay(document.getElementById('code_scan_message'));
	if(fromMap) {
		if(pacInput)
			pacInput.value = code;
		if(typeof syncProceedButtons == 'function')
			syncProceedButtons();
		if(typeof decode_input_from_map == 'function')
			decode_input_from_map();
		return;
	}
	if(decodeInput)
		decodeInput.value = '\\ ' + code + ' /';
	if(typeof resizeInput == 'function' && decodeInput)
		resizeInput.call(decodeInput);
	if(typeof syncProceedButtons == 'function')
		syncProceedButtons();
	if(typeof decode_input_from_form == 'function')
		decode_input_from_form();
}

function handleCodeScanPhotoInput(event) {
	var file = event && event.target && event.target.files && event.target.files[0];
	if(!file)
		return;
	if(!codeScanState.active) {
		codeScanState.active = true;
		codeScanState.hasCaptured = false;
		resetCodeScanUi();
		setCodeScanDetectionMode(codeScanState.detectionMode);
	}
	clearCodeScanTimer();
	codeScanState.hasCaptured = true;
	codeScanState.processing = true;
	setCodeScanPhase('processing');
	setCodeScanLiveControlsVisible(false);
	setCodeScanPhotoFallbackVisible(false);
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	stopCodeScanCamera();
	setCodeScanStatus('Reading photo on your device...');
	prepareCodeScanWorker().then(function() {
		return recognizeCodeScanPhoto(file);
	}).then(function(result) {
		codeScanState.processing = false;
		if(!codeScanState.active)
			return;
		setCodeScanFrozenPreview(true);
		showCodeScanReview(extractMatchFromOcrResult(result));
	}).catch(function() {
		codeScanState.processing = false;
		codeScanState.hasCaptured = false;
		if(codeScanState.active) {
			setCodeScanFrozenPreview(false);
			setCodeScanPhase('live');
			setCodeScanPhotoFallbackVisible(true);
			setCodeScanStatus('Could not read that photo. Try another shot or type the code.');
		}
	});
}

function recognizeCodeScanPhoto(file) {
	return new Promise(function(resolve, reject) {
		var reader = new FileReader();
		var image = new Image();
		reader.onload = function() {
			image.onload = function() {
				var canvas = getCodeScanCanvas();
				var width;
				var height;
				var targetWidth;
				var targetHeight;
				if(!canvas) {
					reject(new Error('Missing scan canvas'));
					return;
				}
				width = image.naturalWidth || image.width;
				height = image.naturalHeight || image.height;
				if(!width || !height) {
					reject(new Error('Invalid photo dimensions'));
					return;
				}
				targetWidth = Math.min(width, 1600);
				targetHeight = Math.round(height * (targetWidth / width));
				canvas.width = targetWidth;
				canvas.height = targetHeight;
				canvas.getContext('2d').drawImage(image, 0, 0, targetWidth, targetHeight);
				if(codeScanState.detectionMode === 'fixed')
					cropCodeScanCanvasToFixedRatio(canvas);
				if(!codeScanState.worker) {
					reject(new Error('Scanner not ready'));
					return;
				}
				codeScanState.worker.recognize(canvas).then(resolve).catch(reject);
			};
			image.onerror = reject;
			image.src = reader.result;
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function setCodeScanCandidateHighlight(bbox, canvas) {
	var highlight = document.getElementById('code_scan_candidate_highlight');
	var viewport = document.querySelector('.code_scan_viewport');
	var video = getCodeScanVideo();
	var width;
	var height;
	var left;
	var top;
	var boxWidth;
	var boxHeight;
	if(!highlight || !viewport || !bbox || !canvas)
		return;
	width = canvas.width;
	height = canvas.height;
	if(!width || !height)
		return;
	left = (bbox.x0 / width) * 100;
	top = (bbox.y0 / height) * 100;
	boxWidth = ((bbox.x1 - bbox.x0) / width) * 100;
	boxHeight = ((bbox.y1 - bbox.y0) / height) * 100;
	highlight.style.left = left + '%';
	highlight.style.top = top + '%';
	highlight.style.width = boxWidth + '%';
	highlight.style.height = boxHeight + '%';
	highlight.classList.remove('hide');
}

function clearCodeScanCandidateHighlight() {
	var highlight = document.getElementById('code_scan_candidate_highlight');
	if(highlight)
		highlight.classList.add('hide');
}

function setCodeScanWoloFoundCue(active) {
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport)
		viewport.classList.toggle('code_scan_wolo_found', !!active);
}

function setCodeScanViewportVisible(visible) {
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport)
		viewport.classList.toggle('hide', !visible);
}

function setCodeScanLiveControlsVisible(visible) {
	var node = document.getElementById('code_scan_live_controls');
	if(node)
		node.classList.toggle('hide', !visible);
}

function setCodeScanReviewVisible(visible) {
	var node = document.getElementById('code_scan_review');
	if(node)
		node.classList.toggle('hide', !visible);
}

function setCodeScanPhotoFallbackVisible(visible) {
	var button = document.getElementById('code_scan_use_photo');
	if(button)
		button.classList.toggle('hide', !visible);
}

function setCodeScanFrozenPreview(frozen) {
	var viewport = document.querySelector('.code_scan_viewport');
	var canvas = getCodeScanCanvas();
	if(viewport)
		viewport.classList.toggle('code_scan_viewport_frozen', !!frozen);
	if(canvas)
		canvas.classList.toggle('hide', !frozen);
}

function setCodeScanCaptureEnabled(enabled) {
	var button = document.getElementById('code_scan_capture');
	if(button)
		button.disabled = !enabled;
}

function setCodeScanStatus(message) {
	var node = document.getElementById('code_scan_status');
	if(node)
		node.textContent = message || '';
}

function showCodeScanStatus(message) {
	setCodeScanStatus(message);
}
