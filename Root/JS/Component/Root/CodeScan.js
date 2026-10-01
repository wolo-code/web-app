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
	cameraAvailable: false,
	sourceCanvas: null,
	originalSourceCanvas: null,
	zoom: 1,
	panX: 0,
	panY: 0,
	isDragging: false,
	dragStartX: 0,
	dragStartY: 0,
	initialPanX: 0,
	initialPanY: 0,
	touchStartDist: 0,
	touchStartZoom: 1,
	liveZoom: 1
};

// Preload shutter sounds (MP3 and WAV fallback)
const shutterAudio = new Audio('/sounds/camera-shutter-release.mp3');
shutterAudio.load();
const shutterAudioWav = new Audio('/sounds/camera-shutter-release.wav');
shutterAudioWav.load();

function playShutterSound() {
  // Attempt to play MP3; on failure, play WAV fallback
  shutterAudio.play().catch(() => {
    shutterAudioWav.play().catch(() => {});
  });
}

var CODE_SCAN_FRAME_INTERVAL_MS = 1600;


var CODE_SCAN_STABLE_MATCHES = 3;
var CODE_SCAN_BBOX_IOU_MIN = 0.55;
var CODE_SCAN_MIN_CONFIDENCE = 55;
var CODE_SCAN_TESSERACT_BASE = '/tesseract';
var CODE_SCAN_FIXED_ASPECT = 3;
var CODE_SCAN_FIXED_ASPECT_TOLERANCE = 0.35;
var codeScanInitialStatus = '';

function getCodeScanInitialStatus() {
	if(!codeScanInitialStatus) {
		var node = document.getElementById('code_scan_status');
		codeScanInitialStatus = node && node.textContent ? node.textContent : '';
	}
	return codeScanInitialStatus;
}

function initCodeScan() {
	bindControl('decode_code_scan_button', 'click', openCodeScan);
	bindControl('code_scan_close', 'click', closeCodeScan);
	bindControl('code_scan_type_instead', 'click', closeCodeScan);
	bindControl('code_scan_use_photo', 'click', openCodeScanPhotoPicker);
	bindControl('code_scan_capture', 'click', captureCodeScanManually);
	bindControl('code_scan_use_code', 'click', useCodeScanReview);
	bindControl('code_scan_rescan', 'click', rescanCodeScan);
	bindControl('code_scan_zoom_out', 'click', zoomOutCodeScan);
	bindControl('code_scan_zoom_in', 'click', zoomInCodeScan);
	bindControl('code_scan_zoom_reset', 'click', resetCodeScanZoom);
	bindControl('code_scan_apply_crop', 'click', applyCodeScanCrop);
	bindCodeScanReviewInputListeners();
	initCodeScanZoomAndPan();
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
	setCodeScanCaptureVisible(false);
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
	codeScanState.originalSourceCanvas = null;
	codeScanState.sourceCanvas = null;
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
	setCodeScanCropControlsVisible(false);
	setCodeScanLiveControlsVisible(true);
	setCodeScanCaptureVisible(true);
	setCodeScanReviewVisible(false);
	setCodeScanCaptureEnabled(true);
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	setCodeScanStatus(getCodeScanInitialStatus());
	codeScanState.originalSourceCanvas = null;
	codeScanState.sourceCanvas = null;
	resetCodeScanZoom();
	resetCodeScanLiveZoom();
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
		setCodeScanStatus(getCodeScanInitialStatus());
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
		setCodeScanStatus(getCodeScanInitialStatus());
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
	setCodeScanCaptureVisible(false);
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
	var ocrCanvas;
	if(!video || !canvas || !codeScanState.worker || video.readyState < 2) {
		scheduleCodeScanFrame();
		return;
	}
	codeScanState.processing = true;
	captureCodeScanFrame(video, canvas);
	ocrCanvas = codeScanState.detectionMode === 'fixed' ? getCodeScanFixedRatioSlice(canvas) : canvas;
	codeScanState.worker.recognize(ocrCanvas).then(function(result) {
		codeScanState.processing = false;
		if(!codeScanState.active || codeScanState.phase !== 'live' || codeScanState.hasCaptured)
			return;
		handleCodeScanLiveOcrResult(result, ocrCanvas);
		scheduleCodeScanFrame();
	}).catch(function() {
		codeScanState.processing = false;
		if(codeScanState.active && codeScanState.phase === 'live' && !codeScanState.hasCaptured)
			scheduleCodeScanFrame();
	});
}

function getCodeScanVideoSourceRect(video) {
	var viewport = document.querySelector('.code_scan_viewport');
	var vw = viewport ? viewport.clientWidth : 0;
	var vh = viewport ? viewport.clientHeight : 0;
	var cw = video ? video.videoWidth : 0;
	var ch = video ? video.videoHeight : 0;
	var zoom = (codeScanState && typeof codeScanState.liveZoom === 'number') ? codeScanState.liveZoom : 1;
	if(typeof codeScanOcrMatch !== 'undefined' && codeScanOcrMatch.getVideoViewfinderCropRect) {
		return codeScanOcrMatch.getVideoViewfinderCropRect(cw, ch, vw, vh, zoom);
	}
	return { sx: 0, sy: 0, sw: cw || 0, sh: ch || 0 };
}

function captureCodeScanFrame(video, canvas) {
	if(!video || !canvas)
		return;
	var rect = getCodeScanVideoSourceRect(video);
	var targetWidth;
	var targetHeight;
	if(!rect.sw || !rect.sh)
		return;
	targetWidth = Math.min(rect.sw, 960);
	targetHeight = Math.round(rect.sh * (targetWidth / rect.sw));
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	canvas.getContext('2d').drawImage(
		video,
		rect.sx, rect.sy, rect.sw, rect.sh,
		0, 0, targetWidth, targetHeight
	);
}

function saveCodeScanSourceFromCanvas(canvas, forceOriginal) {
	if(!canvas || !canvas.width || !canvas.height)
		return;
	var copy = document.createElement('canvas');
	copy.width = canvas.width;
	copy.height = canvas.height;
	copy.getContext('2d').drawImage(canvas, 0, 0);
	codeScanState.sourceCanvas = copy;
	if(forceOriginal || !codeScanState.originalSourceCanvas) {
		var origCopy = document.createElement('canvas');
		origCopy.width = canvas.width;
		origCopy.height = canvas.height;
		origCopy.getContext('2d').drawImage(canvas, 0, 0);
		codeScanState.originalSourceCanvas = origCopy;
	}
}

function getCodeScanFixedRatioSlice(canvas) {
	var crop = document.createElement('canvas');
	var width = canvas.width;
	var height = canvas.height;
	var cropWidth;
	var cropHeight;
	var sx;
	var sy;
	if(!width || !height)
		return canvas;
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
	crop.width = cropWidth;
	crop.height = cropHeight;
	crop.getContext('2d').drawImage(canvas, sx, sy, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
	return crop;
}

function cropCodeScanCanvasToFixedRatio(canvas) {
	var slice = getCodeScanFixedRatioSlice(canvas);
	if(slice === canvas)
		return;
	canvas.width = slice.width;
	canvas.height = slice.height;
	canvas.getContext('2d').drawImage(slice, 0, 0);
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
	var ratioNear;
	if(!guidance || !guidance.bbox) {
		setCodeScanStatus(getCodeScanInitialStatus());
		resetCodeScanMatchState();
		clearCodeScanCandidateHighlight();
		setCodeScanWoloFoundCue(false);
		return;
	}
	match = guidance.match;
	bbox = guidance.bbox;
	ratioNear = codeScanState.detectionMode !== 'fixed' || codeScanOcrMatch.isAspectRatioNear(
		bbox,
		CODE_SCAN_FIXED_ASPECT,
		CODE_SCAN_FIXED_ASPECT_TOLERANCE
	);
	if(ratioNear) {
		setCodeScanCandidateHighlight(bbox, canvas);
		setCodeScanWoloFoundCue(true);
		setCodeScanStatus('Wolo Code found');
	}
	else {
		clearCodeScanCandidateHighlight();
		setCodeScanWoloFoundCue(false);
		setCodeScanStatus(codeScanState.detectionMode === 'fixed'
			? 'Align the 3 words inside the dashed frame...'
			: 'Looking for a Wolo Code label...');
	}
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
	borderReady = codeScanState.detectionMode !== 'fixed' || (ratioNear && codeScanOcrMatch.isFixedBorderReady(
		canvas,
		bbox,
		CODE_SCAN_FIXED_ASPECT,
		CODE_SCAN_FIXED_ASPECT_TOLERANCE,
		CODE_SCAN_FIXED_MIN_EDGE_CONTRAST
	));
	if(codeScanState.stableMatchCount >= CODE_SCAN_STABLE_MATCHES && borderReady) {
		setCodeScanStatus('Wolo Code found. Capturing...');
		var autoVideo = getCodeScanVideo();
		var autoCanvas = getCodeScanCanvas();
		if(autoVideo && autoCanvas && autoVideo.readyState >= 2) {
			captureCodeScanFullRes(autoVideo, autoCanvas);
			resetCodeScanLiveZoom();
			saveCodeScanSourceFromCanvas(autoCanvas, true);
			resetCodeScanZoom();
		}
		beginCodeScanCapture();
		return;
	}
	if(codeScanState.stableMatchCount >= 2 && ratioNear)
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
	captureCodeScanFullRes(video, canvas);
	resetCodeScanLiveZoom();
	saveCodeScanSourceFromCanvas(canvas, true);
	resetCodeScanZoom();
	beginCodeScanCapture();
}

function captureCodeScanFullRes(video, canvas) {
	if(!video || !canvas)
		return;
	var rect = getCodeScanVideoSourceRect(video);
	if(!rect.sw || !rect.sh)
		return;
	canvas.width = rect.sw;
	canvas.height = rect.sh;
	canvas.getContext('2d').drawImage(
		video,
		rect.sx, rect.sy, rect.sw, rect.sh,
		0, 0, rect.sw, rect.sh
	);
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
	setCodeScanCropControlsVisible(true);
	setCodeScanStatus('Reading label on your device...');
    playShutterSound();
	processCodeScanCapture();
}

function processCodeScanCapture() {
	var canvas = getCodeScanCanvas();
	var ocrCanvas;
	if(!codeScanState.worker || !canvas) {
		codeScanState.processing = false;
		if(codeScanState.active)
			showCodeScanReview(null);
		return;
	}
	ocrCanvas = codeScanState.detectionMode === 'fixed' ? getCodeScanFixedRatioSlice(canvas) : canvas;
	codeScanState.worker.recognize(ocrCanvas).then(function(result) {
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
	setCodeScanCropControlsVisible(true);
	populateCodeScanReviewFields(review.city, review.words[0], review.words[1], review.words[2]);
	populateCodeScanCityChoices(review.city);
	updateCodeScanReviewValidity();
	setCodeScanStatus('');
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
		validityNode.textContent = '';
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
	codeScanState.originalSourceCanvas = null;
	codeScanState.sourceCanvas = null;
	clearCodeScanReviewFields();
	setCodeScanReviewVisible(false);
	setCodeScanFrozenPreview(false);
	setCodeScanCropControlsVisible(false);
	resetCodeScanZoom();
	resetCodeScanLiveZoom();
	setCodeScanPhase('live');
	resetCodeScanMatchState();
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	setCodeScanPhotoFallbackVisible(true);
	if(codeScanOcrMatch.isCodeScanSupported()) {
		setCodeScanViewportVisible(true);
		setCodeScanLiveControlsVisible(true);
		setCodeScanCaptureEnabled(true);
		setCodeScanStatus(getCodeScanInitialStatus());
		startCodeScanCamera();
		return;
	}
	setCodeScanCaptureVisible(false);
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
		setCodeScanCropControlsVisible(true);
		showCodeScanReview(extractMatchFromOcrResult(result));
	}).catch(function() {
		codeScanState.processing = false;
		codeScanState.hasCaptured = false;
		if(codeScanState.active) {
			setCodeScanFrozenPreview(false);
			setCodeScanCropControlsVisible(false);
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
				var ocrCanvas;
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
				saveCodeScanSourceFromCanvas(canvas, true);
				resetCodeScanZoom();
				ocrCanvas = codeScanState.detectionMode === 'fixed' ? getCodeScanFixedRatioSlice(canvas) : canvas;
				if(!codeScanState.worker) {
					reject(new Error('Scanner not ready'));
					return;
				}
				codeScanState.worker.recognize(ocrCanvas).then(resolve).catch(reject);
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

function setCodeScanCropControlsVisible(visible) {
	var node = document.getElementById('code_scan_crop_controls');
	if(node)
		node.classList.toggle('hide', !visible);
}

function clampCodeScanPan() {
	var viewport = document.querySelector('.code_scan_viewport');
	var maxPanX = 150;
	var maxPanY = 150;
	if(viewport) {
		maxPanX = Math.max(100, Math.round(viewport.clientWidth * codeScanState.zoom * 0.75));
		maxPanY = Math.max(100, Math.round(viewport.clientHeight * codeScanState.zoom * 0.75));
	}
	codeScanState.panX = Math.max(-maxPanX, Math.min(maxPanX, codeScanState.panX));
	codeScanState.panY = Math.max(-maxPanY, Math.min(maxPanY, codeScanState.panY));
}

function setCodeScanZoom(zoom, panX, panY) {
	var canvas = getCodeScanCanvas();
	var zoomLevelNode = document.getElementById('code_scan_zoom_level');
	var clampedZoom = Math.max(1, Math.min(4, typeof zoom === 'number' ? zoom : 1));
	codeScanState.zoom = Math.round(clampedZoom * 100) / 100;
	if(typeof panX === 'number')
		codeScanState.panX = panX;
	if(typeof panY === 'number')
		codeScanState.panY = panY;
	clampCodeScanPan();
	if(canvas)
		canvas.style.transform = 'translate(' + codeScanState.panX + 'px, ' + codeScanState.panY + 'px) scale(' + codeScanState.zoom + ')';
	if(zoomLevelNode)
		zoomLevelNode.textContent = Math.round(codeScanState.zoom * 100) + '%';
}

function resetCodeScanZoom() {
	var canvas = getCodeScanCanvas();
	if(codeScanState.originalSourceCanvas && canvas) {
		canvas.width = codeScanState.originalSourceCanvas.width;
		canvas.height = codeScanState.originalSourceCanvas.height;
		canvas.getContext('2d').drawImage(codeScanState.originalSourceCanvas, 0, 0);
		codeScanState.sourceCanvas = codeScanState.originalSourceCanvas;
	}
	setCodeScanZoom(1.0, 0, 0);
}

function zoomInCodeScan() {
	var next = Math.min(4, Math.round((codeScanState.zoom + 0.25) * 100) / 100);
	setCodeScanZoom(next, codeScanState.panX, codeScanState.panY);
}

function zoomOutCodeScan() {
	var next = Math.max(1, Math.round((codeScanState.zoom - 0.25) * 100) / 100);
	setCodeScanZoom(next, codeScanState.panX, codeScanState.panY);
}

function setCodeScanLiveZoom(zoom) {
	var video = getCodeScanVideo();
	var clampedZoom = Math.max(1, Math.min(4, typeof zoom === 'number' ? zoom : 1));
	codeScanState.liveZoom = Math.round(clampedZoom * 100) / 100;
	if(video)
		video.style.transform = codeScanState.liveZoom > 1 ? 'scale(' + codeScanState.liveZoom + ')' : '';
	updateCodeScanLiveZoomIndicator();
}

function resetCodeScanLiveZoom() {
	codeScanState.liveZoom = 1;
	var video = getCodeScanVideo();
	if(video)
		video.style.transform = '';
	updateCodeScanLiveZoomIndicator();
}

function updateCodeScanLiveZoomIndicator() {
	var indicator = document.getElementById('code_scan_live_zoom_indicator');
	if(!indicator)
		return;
	if(codeScanState.liveZoom > 1) {
		indicator.textContent = Math.round(codeScanState.liveZoom * 100) + '%';
		indicator.classList.remove('hide');
	}
	else
		indicator.classList.add('hide');
}

function handleCodeScanWheel(event) {
	var delta;
	var next;
	if(codeScanState.phase === 'live' && codeScanState.cameraAvailable && !codeScanState.hasCaptured) {
		if(event.preventDefault)
			event.preventDefault();
		delta = event.deltaY < 0 ? 0.2 : -0.2;
		next = Math.max(1, Math.min(4, Math.round((codeScanState.liveZoom + delta) * 100) / 100));
		setCodeScanLiveZoom(next);
		return;
	}
	if(codeScanState.phase !== 'review' && !codeScanState.hasCaptured)
		return;
	if(event.preventDefault)
		event.preventDefault();
	delta = event.deltaY < 0 ? 0.2 : -0.2;
	next = Math.max(1, Math.min(4, Math.round((codeScanState.zoom + delta) * 100) / 100));
	setCodeScanZoom(next, codeScanState.panX, codeScanState.panY);
}

function handleCodeScanMouseDown(event) {
	if(codeScanState.phase !== 'review' && !codeScanState.hasCaptured)
		return;
	if(event.button !== 0)
		return;
	if(event.preventDefault)
		event.preventDefault();
	codeScanState.isDragging = true;
	codeScanState.dragStartX = event.clientX;
	codeScanState.dragStartY = event.clientY;
	codeScanState.initialPanX = codeScanState.panX;
	codeScanState.initialPanY = codeScanState.panY;
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport)
		viewport.classList.add('code_scan_panning');
}

function handleCodeScanMouseMove(event) {
	if(!codeScanState.isDragging)
		return;
	if(event.preventDefault)
		event.preventDefault();
	var dx = event.clientX - codeScanState.dragStartX;
	var dy = event.clientY - codeScanState.dragStartY;
	setCodeScanZoom(codeScanState.zoom, codeScanState.initialPanX + dx, codeScanState.initialPanY + dy);
}

function handleCodeScanMouseUp(event) {
	if(!codeScanState.isDragging)
		return;
	codeScanState.isDragging = false;
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport)
		viewport.classList.remove('code_scan_panning');
}

function getTouchDistance(t1, t2) {
	var dx = t1.clientX - t2.clientX;
	var dy = t1.clientY - t2.clientY;
	return Math.sqrt(dx * dx + dy * dy);
}

function handleCodeScanTouchStart(event) {
	var isLive = codeScanState.phase === 'live' && codeScanState.cameraAvailable && !codeScanState.hasCaptured;
	if(!isLive && codeScanState.phase !== 'review' && !codeScanState.hasCaptured)
		return;
	if(event.touches.length === 1 && !isLive) {
		codeScanState.isDragging = true;
		codeScanState.dragStartX = event.touches[0].clientX;
		codeScanState.dragStartY = event.touches[0].clientY;
		codeScanState.initialPanX = codeScanState.panX;
		codeScanState.initialPanY = codeScanState.panY;
	}
	else if(event.touches.length === 2) {
		codeScanState.isDragging = false;
		codeScanState.touchStartDist = getTouchDistance(event.touches[0], event.touches[1]);
		codeScanState.touchStartZoom = isLive ? codeScanState.liveZoom : codeScanState.zoom;
	}
}

function handleCodeScanTouchMove(event) {
	var isLive = codeScanState.phase === 'live' && codeScanState.cameraAvailable && !codeScanState.hasCaptured;
	if(!isLive && codeScanState.phase !== 'review' && !codeScanState.hasCaptured)
		return;
	if(event.touches.length === 1 && codeScanState.isDragging && !isLive) {
		if(event.preventDefault)
			event.preventDefault();
		var dx = event.touches[0].clientX - codeScanState.dragStartX;
		var dy = event.touches[0].clientY - codeScanState.dragStartY;
		setCodeScanZoom(codeScanState.zoom, codeScanState.initialPanX + dx, codeScanState.initialPanY + dy);
	}
	else if(event.touches.length === 2 && codeScanState.touchStartDist > 0) {
		if(event.preventDefault)
			event.preventDefault();
		var dist = getTouchDistance(event.touches[0], event.touches[1]);
		var factor = dist / codeScanState.touchStartDist;
		var next = Math.max(1, Math.min(4, Math.round((codeScanState.touchStartZoom * factor) * 100) / 100));
		if(isLive)
			setCodeScanLiveZoom(next);
		else
			setCodeScanZoom(next, codeScanState.panX, codeScanState.panY);
	}
}

function handleCodeScanTouchEnd(event) {
	if(event.touches.length === 0) {
		codeScanState.isDragging = false;
		codeScanState.touchStartDist = 0;
	}
	else if(event.touches.length === 1) {
		codeScanState.dragStartX = event.touches[0].clientX;
		codeScanState.dragStartY = event.touches[0].clientY;
		codeScanState.initialPanX = codeScanState.panX;
		codeScanState.initialPanY = codeScanState.panY;
		codeScanState.isDragging = true;
		codeScanState.touchStartDist = 0;
	}
}

function initCodeScanZoomAndPan() {
	var viewport = document.querySelector('.code_scan_viewport');
	if(!viewport)
		return;
	viewport.addEventListener('mousedown', handleCodeScanMouseDown);
	window.addEventListener('mousemove', handleCodeScanMouseMove);
	window.addEventListener('mouseup', handleCodeScanMouseUp);
	viewport.addEventListener('wheel', handleCodeScanWheel, {passive: false});
	viewport.addEventListener('touchstart', handleCodeScanTouchStart, {passive: false});
	viewport.addEventListener('touchmove', handleCodeScanTouchMove, {passive: false});
	viewport.addEventListener('touchend', handleCodeScanTouchEnd);
	viewport.addEventListener('touchcancel', handleCodeScanTouchEnd);
}

function getCodeScanRenderedImageRect(canvas) {
	var rect = canvas.getBoundingClientRect();
	var cw = canvas.width || 1;
	var ch = canvas.height || 1;
	var rw = rect.width;
	var rh = rect.height;
	var scale = Math.min(rw / cw, rh / ch);
	var dw = cw * scale;
	var dh = ch * scale;
	var ox = rect.left + (rw - dw) / 2;
	var oy = rect.top + (rh - dh) / 2;
	return {
		left: ox,
		top: oy,
		width: dw,
		height: dh
	};
}

function applyCodeScanCrop() {
	var canvas = getCodeScanCanvas();
	var guide = document.getElementById('code_scan_fixed_guide');
	var source = codeScanState.sourceCanvas || canvas;
	var cropButton = document.getElementById('code_scan_apply_crop');
	var guideRect;
	var imgRect;
	var normX;
	var normY;
	var normW;
	var normH;
	var sourceWidth;
	var sourceHeight;
	var cropSx;
	var cropSy;
	var cropSw;
	var cropSh;
	var croppedCanvas;
	var croppedCtx;
	if(!canvas || !guide || !source || !codeScanState.worker)
		return;
	guideRect = guide.getBoundingClientRect();
	imgRect = getCodeScanRenderedImageRect(canvas);
	if(!guideRect.width || !guideRect.height || !imgRect.width || !imgRect.height)
		return;
	normX = (guideRect.left - imgRect.left) / imgRect.width;
	normY = (guideRect.top - imgRect.top) / imgRect.height;
	normW = guideRect.width / imgRect.width;
	normH = guideRect.height / imgRect.height;
	sourceWidth = source.width;
	sourceHeight = source.height;
	cropSx = Math.max(0, Math.round(normX * sourceWidth));
	cropSy = Math.max(0, Math.round(normY * sourceHeight));
	cropSw = Math.min(sourceWidth - cropSx, Math.round(normW * sourceWidth));
	cropSh = Math.min(sourceHeight - cropSy, Math.round(normH * sourceHeight));
	if(cropSw <= 20 || cropSh <= 10) {
		showNotification('Framed area is too small. Zoom out or adjust framing.');
		return;
	}
	if(cropButton)
		cropButton.disabled = true;
	setCodeScanStatus('Reading cropped selection...');
	croppedCanvas = document.createElement('canvas');
	croppedCanvas.width = cropSw;
	croppedCanvas.height = cropSh;
	croppedCtx = croppedCanvas.getContext('2d');
	croppedCtx.drawImage(source, cropSx, cropSy, cropSw, cropSh, 0, 0, cropSw, cropSh);

	canvas.width = cropSw;
	canvas.height = cropSh;
	canvas.getContext('2d').drawImage(croppedCanvas, 0, 0);
	codeScanState.sourceCanvas = croppedCanvas;
	setCodeScanZoom(1.0, 0, 0);

	codeScanState.worker.recognize(croppedCanvas).then(function(result) {
		if(cropButton)
			cropButton.disabled = false;
		if(!codeScanState.active)
			return;
		var match = extractMatchFromOcrResult(result);
		if(match) {
			showCodeScanReview(match);
			setCodeScanStatus('Wolo Code recognized from crop! Check details below.');
		}
		else {
			setCodeScanStatus('Could not read Wolo Code from this crop. Adjust framing or zoom.');
		}
	}).catch(function() {
		if(cropButton)
			cropButton.disabled = false;
		if(!codeScanState.active)
			return;
		setCodeScanStatus('Recognition failed for this crop. Try adjusting the frame.');
	});
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

function setCodeScanCaptureVisible(visible) {
	var button = document.getElementById('code_scan_capture');
	if(button)
		button.classList.toggle('hide', !visible);
}

function setCodeScanStatus(message) {
	var node = document.getElementById('code_scan_status');
	if(node)
		node.textContent = message || '';
}

function showCodeScanStatus(message) {
	setCodeScanStatus(message);
}
