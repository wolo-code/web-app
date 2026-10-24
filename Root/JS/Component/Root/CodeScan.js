var codeScanState = {
	active: false,
	showRegions: false,
	regionPressConsumed: false,
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
	lastDetectedMatch: null,
	reviewMatch: null,
	reviewMetadata: null,
	metadataDirty: {},
	saveRevision: 0,
	saving: false,
	cropScanTimer: null,
	cropRevision: 0,
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
var codeScanCityChoices = [];
var codeScanWordPopupTimer = null;

function getCodeScanInitialStatus() {
	if(!codeScanInitialStatus) {
		var node = document.getElementById('code_scan_status');
		codeScanInitialStatus = node && node.textContent ? node.textContent : '';
	}
	return codeScanInitialStatus;
}

function initCodeScan() {
	bindControl('decode_code_scan_button', 'click', openCodeScan);
	bindControl('map_code_scan_button', 'click', openCodeScan);
	bindControl('code_scan_close', 'click', closeCodeScan);
	bindControl('code_scan_type_instead', 'click', closeCodeScan);
	bindControl('code_scan_use_photo', 'click', openCodeScanPhotoPicker);
	bindControl('code_scan_capture', 'click', function(event) {
		if(codeScanState.regionPressConsumed) { event.preventDefault(); codeScanState.regionPressConsumed = false; return; }
		captureCodeScanManually(event);
	});
	initCodeScanRegionPress();
	bindControl('code_scan_save', 'click', saveCodeScanReview);
	bindControl('code_scan_rescan', 'click', rescanCodeScan);
	bindControl('code_scan_zoom_out', 'click', zoomOutCodeScan);
	bindControl('code_scan_zoom_in', 'click', zoomInCodeScan);
	bindControl('code_scan_zoom_reset', 'click', resetCodeScanZoom);
	bindControl('code_scan_city_select', 'click', toggleCodeScanCityChoices);
	bindControl('code_scan_details_toggle', 'click', toggleCodeScanDetails);
	['title', 'segment', 'address_line_1', 'address_line_2'].forEach(function(key) {
		bindControl('code_scan_' + key, 'input', function(event) { editCodeScanMetadata(key, event.target.value); });
	});
	document.addEventListener('click', function(event) {
		var row = document.querySelector('.code_scan_review_city_row');
		var choices = document.getElementById('code_scan_city_choices');
		if(row && !row.contains(event.target) && (!choices || event.target === choices || !choices.contains(event.target))) hideCodeScanCityChoices();
	});
	document.addEventListener('keydown', function(event) {
		var choices = document.getElementById('code_scan_city_choices');
		if(event.key === 'Escape' && choices && !choices.classList.contains('hide')) {
			event.preventDefault();
			event.stopPropagation();
			hideCodeScanCityChoices();
			document.getElementById('code_scan_city_select').focus();
		}
	}, true);
	bindControl('code_scan_apply_crop', 'click', useCodeScanReview);
	bindCodeScanReviewInputListeners();
	initCodeScanZoomAndPan();
	window.addEventListener('resize', redrawCodeScanReviewRegions);
	var previewCanvas = getCodeScanCanvas();
	if(previewCanvas) previewCanvas.addEventListener('transitionend', redrawCodeScanReviewRegions);
	var photoInput = document.getElementById('code_scan_photo_input');
	if(photoInput)
		photoInput.addEventListener('change', handleCodeScanPhotoInput);
}

function initCodeScanRegionPress() {
	var button = document.getElementById('code_scan_capture');
	var timer;
	if(!button) return;
	function endPress() {
		clearTimeout(timer);
		codeScanState.showRegions = false;
		clearCodeScanCandidateHighlight();
	}
	function startPress(event) {
		if(event.type === 'pointerdown' && event.button !== 0) return;
		if(event.type === 'keydown' && (event.repeat || (event.key !== ' ' && event.key !== 'Enter'))) return;
		endPress();
		codeScanState.regionPressConsumed = false;
		timer = setTimeout(function() {
			if(!codeScanState.active) return;
			codeScanState.showRegions = true;
			codeScanState.regionPressConsumed = true;
			drawCodeScanMatchRegions(codeScanState.regionMatch, codeScanState.regionCanvas);
		}, 500);
	}
	button.addEventListener('pointerdown', startPress);
	button.addEventListener('keydown', startPress);
	button.addEventListener('keyup', function(event) { if(event.key === ' ' || event.key === 'Enter') endPress(); });
	button.addEventListener('contextmenu', function(event) { event.preventDefault(); });
	window.addEventListener('pointerup', endPress);
	window.addEventListener('pointercancel', endPress);
	window.addEventListener('blur', endPress);
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
	codeScanState.source = document.body.classList.contains('decode') ? 'decode' : 'map';
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
	clearTimeout(codeScanState.cropScanTimer);
	codeScanState.cropScanTimer = null;
	codeScanState.cropRevision += 1;
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
	codeScanState.reviewMatch = null;
	resetCodeScanDetails();
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
	resetCodeScanGuide();
}

function resetCodeScanMatchState() {
	codeScanState.lastDetectedMatch = null;
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
	var cropButton = document.getElementById('code_scan_apply_crop');
	if(cropButton) cropButton.disabled = codeScanState.phase !== 'review' ||
		!['w1', 'w2', 'w3'].every(function(key) {
			var field = document.getElementById('code_scan_review_' + key);
			return field && typeof field.value === 'string' && typeof wordList !== 'undefined' && wordList && wordList.includes(field.value.trim().toLowerCase());
		});
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
			tessedit_pageseg_mode: '11'
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
	var revision = codeScanState.cropRevision;
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
	// The dashed frame is a guide; both the code box and whole card may extend beyond it.
	ocrCanvas = canvas;
	recognizeCodeScanCanvas(ocrCanvas).then(function(result) {
		codeScanState.processing = false;
		if(!codeScanState.active || codeScanState.phase !== 'live' || codeScanState.hasCaptured)
			return;
		if(revision !== codeScanState.cropRevision) {
			scheduleCodeScanFrame();
			return;
		}
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
	var guide = document.getElementById('code_scan_fixed_guide');
	var viewport = document.querySelector('.code_scan_viewport');
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
	if(guide && viewport && viewport.clientWidth && viewport.clientHeight) {
		var guideRect = guide.getBoundingClientRect();
		var viewportRect = viewport.getBoundingClientRect();
		sx = Math.max(0, Math.round((guideRect.left - viewportRect.left) / viewportRect.width * width));
		sy = Math.max(0, Math.round((guideRect.top - viewportRect.top) / viewportRect.height * height));
		cropWidth = Math.min(width - sx, Math.round(guideRect.width / viewportRect.width * width));
		cropHeight = Math.min(height - sy, Math.round(guideRect.height / viewportRect.height * height));
		if(cropWidth <= 0 || cropHeight <= 0) return canvas;
	}
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

function straightenAndCropCanvasToRegion(sourceCanvas, regionDetails) {
	if(!sourceCanvas || !regionDetails || !regionDetails.bbox)
		return null;
	var bbox = regionDetails.bbox;
	var angle = regionDetails.angle || 0;
	var cx = regionDetails.center ? regionDetails.center.x : (bbox.x0 + bbox.x1) / 2;
	var cy = regionDetails.center ? regionDetails.center.y : (bbox.y0 + bbox.y1) / 2;
	var cosA = Math.cos(-angle);
	var sinA = Math.sin(-angle);
	var corners = [
		{ x: bbox.x0, y: bbox.y0 },
		{ x: bbox.x1, y: bbox.y0 },
		{ x: bbox.x1, y: bbox.y1 },
		{ x: bbox.x0, y: bbox.y1 }
	];
	var minRx = Infinity;
	var maxRx = -Infinity;
	var minRy = Infinity;
	var maxRy = -Infinity;
	var i;
	var dx;
	var dy;
	var rx;
	var ry;
	var contentW;
	var contentH;
	var padX;
	var padY;
	var totalW;
	var totalH;
	var targetW;
	var targetH;
	var cropCanvas;
	var ctx;

	for(i = 0; i < corners.length; i++) {
		dx = corners[i].x - cx;
		dy = corners[i].y - cy;
		rx = dx * cosA - dy * sinA;
		ry = dx * sinA + dy * cosA;
		if(rx < minRx) minRx = rx;
		if(rx > maxRx) maxRx = rx;
		if(ry < minRy) minRy = ry;
		if(ry > maxRy) maxRy = ry;
	}

	contentW = maxRx - minRx;
	contentH = maxRy - minRy;
	if(contentW <= 0 || contentH <= 0)
		return null;

	padX = Math.max(contentW * 0.16, 24);
	padY = Math.max(contentH * 0.35, 14);
	totalW = contentW + 2 * padX;
	totalH = contentH + 2 * padY;

	targetW = Math.max(totalW, totalH * CODE_SCAN_FIXED_ASPECT);
	targetH = targetW / CODE_SCAN_FIXED_ASPECT;
	if(totalH > targetH) {
		targetH = totalH;
		targetW = targetH * CODE_SCAN_FIXED_ASPECT;
	}

	targetW = Math.max(240, Math.min(1600, Math.round(targetW)));
	targetH = Math.round(targetW / CODE_SCAN_FIXED_ASPECT);

	cropCanvas = document.createElement('canvas');
	cropCanvas.width = targetW;
	cropCanvas.height = targetH;
	ctx = cropCanvas.getContext('2d');
	if(!ctx)
		return null;

	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, targetW, targetH);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.translate(targetW / 2, targetH / 2);
	ctx.rotate(-angle);
	ctx.translate(-cx, -cy);
	ctx.drawImage(sourceCanvas, 0, 0);

	return cropCanvas;
}

function detectCodeScanContainers(canvas) {
	// Detection uses a bounded working image; preview and OCR keep native pixels.
	var scale = Math.min(1, 1200 / Math.max(canvas.width, canvas.height));
	var detectionCanvas = canvas;
	if(scale < 1) {
		detectionCanvas = document.createElement('canvas');
		detectionCanvas.width = Math.round(canvas.width * scale);
		detectionCanvas.height = Math.round(canvas.height * scale);
		detectionCanvas.getContext('2d').drawImage(canvas, 0, 0, detectionCanvas.width, detectionCanvas.height);
	}
	var image = detectionCanvas.getContext('2d').getImageData(0, 0, detectionCanvas.width, detectionCanvas.height);
	var sx = canvas.width / detectionCanvas.width;
	var sy = canvas.height / detectionCanvas.height;
	return codeScanOcrMatch.detectLabelRectangles(image, detectionCanvas.width, detectionCanvas.height).map(function(box) {
		return { x0: box.x0 * sx, y0: box.y0 * sy, x1: box.x1 * sx, y1: box.y1 * sy };
	});
}

function recognizeCodeScanCanvas(canvas, focus) {
	var containers = detectCodeScanContainers(canvas);
	return codeScanState.worker.recognize(canvas).then(function(result) {
		result.data = result.data || {};
		result.data.labelContainers = containers;
		result.data.scanFocus = focus || { x: canvas.width / 2, y: canvas.height / 2 };
		return result;
	});
}

function extractMatchFromOcrResult(result) {
	return codeScanOcrMatch.matchOcrRegionsToWoloCode(result, wordList.includes.bind(wordList), wordList.curList);
}

function detailBandScale(height) {
	return height < 100 ? 4 : 3;
}

function ocrCodeScanBand(canvas, band) {
	var x0 = Math.max(0, Math.round(band.x0));
	var y0 = Math.max(0, Math.round(band.y0));
	var x1 = Math.min(canvas.width || 0, Math.round(band.x1));
	var y1 = Math.min(canvas.height || 0, Math.round(band.y1));
	var width = x1 - x0;
	var height = y1 - y0;
	var scale;
	var target;
	var ctx;
	if(width < 20 || height < 12 || !codeScanState.worker) return Promise.resolve([]);
	scale = detailBandScale(height);
	target = document.createElement('canvas');
	target.width = Math.round(width * scale);
	target.height = Math.round(height * scale);
	ctx = target.getContext('2d');
	if(!ctx) return Promise.resolve([]);
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, target.width, target.height);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	ctx.drawImage(canvas, x0, y0, width, height, 0, 0, target.width, target.height);
	return codeScanState.worker.recognize(target).then(function(result) {
		var words = result && result.data && result.data.words || [];
		return words.map(function(word) {
			var box = word && word.bbox;
			if(!word || !box) return null;
			return {
				text: word.text,
				confidence: word.confidence,
				bbox: {
					x0: x0 + box.x0 / scale,
					y0: y0 + box.y0 / scale,
					x1: x0 + box.x1 / scale,
					y1: y0 + box.y1 / scale
				}
			};
		}).filter(Boolean);
	});
}

function headingRowCount(words, match) {
	var read = codeScanOcrMatch.readLabelMetadata(words, match.regions.container, match.regions.card);
	return (read.metadata.title ? 1 : 0) + (read.metadata.segment ? 1 : 0);
}

function addressLineCount(words, match) {
	var read = codeScanOcrMatch.readLabelMetadata(words, match.regions.container, match.regions.card);
	return (read.metadata.address_line_1 ? 1 : 0) + (read.metadata.address_line_2 ? 1 : 0);
}

function withCodeScanDetailSegmentation(work) {
	var worker = codeScanState.worker;
	if(!worker || typeof worker.setParameters !== 'function') return Promise.resolve([]);
	return worker.setParameters({ tessedit_pageseg_mode: '6' }).then(work).then(function(value) {
		return worker.setParameters({ tessedit_pageseg_mode: '11' }).then(function() { return value; });
	}, function(error) {
		return worker.setParameters({ tessedit_pageseg_mode: '11' }).then(function() { throw error; });
	});
}

function enrichCodeScanMetadata(canvas, match) {
	var keys = ['title', 'segment', 'address_line_1', 'address_line_2'];
	var bands;
	var extra;
	var headingRows;
	var addressRows;
	var syntheticCard = false;
	function finish(value) {
		if(syntheticCard) match.regions.card = null;
		return value;
	}
	if(!canvas || !match || !match.regions || !match.regions.container) return Promise.resolve(match);
	// No printed card: read nearest bands around the code box. This rect is not stored or highlighted.
	if(!match.regions.card && canvas.width && canvas.height) {
		match.regions.card = {
			x0: Math.max(0, match.regions.container.x0),
			y0: 0,
			x1: Math.min(canvas.width, match.regions.container.x1),
			y1: canvas.height
		};
		syntheticCard = true;
	}
	if(!match.regions.card) return Promise.resolve(match);
	if(!codeScanState.worker || typeof codeScanState.worker.setParameters !== 'function') return Promise.resolve(finish(match));
	if(keys.every(function(key) { return match.metadata && match.metadata[key]; })) return Promise.resolve(finish(match));
	bands = codeScanOcrMatch.detailScanBands(match.regions.container, match.regions.card);
	if(!bands.length) return Promise.resolve(finish(match));
	extra = [];
	headingRows = 0;
	addressRows = 0;
	return withCodeScanDetailSegmentation(function() {
		var chain = Promise.resolve();
		bands.forEach(function(band) {
			chain = chain.then(function() {
				if(band.role === 'above' && headingRows >= 2) return;
				if(band.role === 'below' && addressRows >= 2) return;
				return ocrCodeScanBand(canvas, band).then(function(words) {
					extra = extra.concat(words);
					if(band.role === 'above') headingRows = headingRowCount(extra, match);
					if(band.role === 'below') addressRows = addressLineCount(extra, match);
				});
			});
		});
		return chain.then(function() { return extra; });
	}).then(function(words) {
		return finish(codeScanOcrMatch.fillLabelMetadata(match, words));
	}).catch(function() {
		return finish(match);
	});
}

function extractGuidanceFromOcrResult(result, canvas) {
	var match = extractMatchFromOcrResult(result);
	var bbox;
	if(!match)
		return null;
	bbox = match.regions.code;
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
	if(!guidance || !guidance.bbox) {
		setCodeScanStatus(getCodeScanInitialStatus());
		resetCodeScanMatchState();
		clearCodeScanCandidateHighlight();
		setCodeScanWoloFoundCue(false);
		return;
	}
	match = guidance.match;
	codeScanState.lastDetectedMatch = match;
	bbox = guidance.bbox;
	if(match.regions) drawCodeScanMatchRegions(match, canvas);
	else setCodeScanCandidateHighlight(bbox, canvas);
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
	// A candidate already has a detected printed container and three words inside.
	if(codeScanState.stableMatchCount >= CODE_SCAN_STABLE_MATCHES && !codeScanState.showRegions) {
		setCodeScanStatus('Wolo Code found. Capturing...');
		var autoVideo = getCodeScanVideo();
		var autoCanvas = getCodeScanCanvas();
		if(autoVideo && autoCanvas && autoVideo.readyState >= 2) {
			var recognitionWidth = canvas.width;
			var recognitionHeight = canvas.height;
			captureCodeScanFullRes(autoVideo, autoCanvas);
			if(match.regions) {
				var scaleX = autoCanvas.width / recognitionWidth;
				var scaleY = autoCanvas.height / recognitionHeight;
				Object.keys(match.regions).forEach(function(key) {
					var box = match.regions[key];
					if(box) match.regions[key] = { x0: box.x0 * scaleX, y0: box.y0 * scaleY, x1: box.x1 * scaleX, y1: box.y1 * scaleY };
				});
			}
			resetCodeScanLiveZoom();
			saveCodeScanSourceFromCanvas(autoCanvas, true);
			resetCodeScanZoom();
		}
		resetCodeScanGuide();
		beginCodeScanCapture(match);
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
	captureCodeScanFullRes(video, canvas);
	resetCodeScanLiveZoom();
	saveCodeScanSourceFromCanvas(canvas, true);
	resetCodeScanZoom();
	resetCodeScanGuide();
	// Read the full-resolution card again on a manual shutter press.
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

function beginCodeScanCapture(detectedMatch) {
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
	processCodeScanCapture(detectedMatch);
}

function processCodeScanCapture(detectedMatch) {
	var canvas = getCodeScanCanvas();
	var rawCanvas = codeScanState.originalSourceCanvas || canvas;
	var ocrCanvas;
	if(!codeScanState.worker || !canvas) {
		codeScanState.processing = false;
		if(codeScanState.active)
			showCodeScanReview(detectedMatch || null);
		return;
	}
	ocrCanvas = canvas;
	recognizeCodeScanCanvas(ocrCanvas).then(function(result) {
		if(!codeScanState.active)
			return null;
		var match = extractMatchFromOcrResult(result);
		if(detectedMatch && (!match || match.code !== detectedMatch.code)) match = detectedMatch;
		if(match && detectedMatch && match !== detectedMatch && detectedMatch.metadata) {
			match.metadata = match.metadata || {};
			['title', 'segment', 'address_line_1', 'address_line_2'].forEach(function(key) {
				if(!match.metadata[key]) match.metadata[key] = detectedMatch.metadata[key] || '';
			});
		}
		return enrichCodeScanMetadata(ocrCanvas, match);
	}).then(function(match) {
		codeScanState.processing = false;
		if(!codeScanState.active)
			return;
		showCodeScanReview(match);
		if(!match) setCodeScanStatus('');
	}).catch(function() {
		codeScanState.processing = false;
		if(codeScanState.active)
			showCodeScanReview(detectedMatch || null);
	});
}

function showCodeScanReview(match) {
	populateCodeScanMetadata(match);
	codeScanState.reviewMatch = match;
	var review = codeScanOcrMatch.splitMatchForReview(match);
	setCodeScanPhase('review');
	setCodeScanReviewVisible(true);
	setCodeScanLiveControlsVisible(false);
	setCodeScanPhotoFallbackVisible(false);
	setCodeScanFrozenPreview(true);
	setCodeScanCropControlsVisible(true);
	setCodeScanEditingCrop(true);
	resetCodeScanGuide();
	populateCodeScanReviewFields(review.city, review.words[0], review.words[1], review.words[2]);
	populateCodeScanCityChoices(review.city);
	updateCodeScanReviewValidity();
	drawCodeScanMatchRegions(match, getCodeScanCanvas());
	setCodeScanStatus('Check the city and words. Address details are optional.');
}

function setCodeScanDetailsExpanded(expanded) {
	var panel = document.getElementById('code_scan_details');
	var heading = document.getElementById('code_scan_heading_details');
	var toggle = document.getElementById('code_scan_details_toggle');
	if(panel) panel.hidden = !expanded;
	if(heading) heading.hidden = !expanded;
	if(toggle) {
		toggle.setAttribute('aria-expanded', String(expanded));
		toggle.setAttribute('aria-label', expanded ? 'Hide address details' : 'Show address details');
	}
}

function toggleCodeScanDetails() {
	var panel = document.getElementById('code_scan_details');
	if(!panel) return;
	setCodeScanDetailsExpanded(panel.hidden);
	redrawCodeScanReviewRegions();
}

function resetCodeScanDetails() {
	codeScanState.saveRevision += 1;
	codeScanState.saving = false;
	codeScanState.reviewMetadata = null;
	codeScanState.metadataDirty = {};
	['title', 'segment', 'address_line_1', 'address_line_2'].forEach(function(key) {
		var field = document.getElementById('code_scan_' + key);
		if(field) field.value = '';
	});
	setCodeScanDetailsExpanded(false);
}

function populateCodeScanMetadata(match) {
	var previous = codeScanState.reviewMatch;
	var same = match && previous && match.code === previous.code && match.regions && previous.regions &&
		codeScanOcrMatch.bboxIoU(match.regions.card || match.regions.container, previous.regions.card || previous.regions.container) >= 0.55;
	if(!same) resetCodeScanDetails();
	var metadata = {};
	['title', 'segment', 'address_line_1', 'address_line_2'].forEach(function(key) {
		metadata[key] = same && codeScanState.metadataDirty[key] ? codeScanState.reviewMetadata[key] : (match && match.metadata && match.metadata[key] || '');
		var field = document.getElementById('code_scan_' + key);
		if(field) field.value = metadata[key];
	});
	metadata.address = codeScanOcrMatch.formatScanAddress(metadata);
	codeScanState.reviewMetadata = metadata;
	if(match) match.metadata = metadata;
	if(!same) setCodeScanDetailsExpanded(false);
}

function editCodeScanMetadata(key, value) {
	if(!codeScanState.reviewMetadata) return;
	codeScanState.metadataDirty[key] = true;
	codeScanState.reviewMetadata[key] = value;
	codeScanState.reviewMetadata.address = codeScanOcrMatch.formatScanAddress(codeScanState.reviewMetadata);
	if(codeScanState.reviewMatch) codeScanState.reviewMatch.metadata = codeScanState.reviewMetadata;
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
	codeScanCityChoices = choices;
	datalist.innerHTML = '';
	hideCodeScanCityChoices();
	var toggle = document.getElementById('code_scan_city_select');
	if(toggle) {
		toggle.setAttribute('aria-expanded', 'false');
		toggle.disabled = choices.length === 0;
	}
	for(i = 0; i < choices.length; i++) {
		var option = document.createElement('button');
		option.type = 'button';
		option.textContent = choices[i];
		option.addEventListener('click', function(event) {
			document.getElementById('code_scan_review_city').value = event.currentTarget.textContent;
			hideCodeScanCityChoices();
			if(toggle) {
				toggle.setAttribute('aria-expanded', 'false');
				toggle.focus();
			}
			updateCodeScanReviewValidity();
		});
		datalist.appendChild(option);
	}
}

function toggleCodeScanCityChoices() {
	var choices = document.getElementById('code_scan_city_choices');
	var toggle = document.getElementById('code_scan_city_select');
	if(!choices || !toggle) return;
	var expanded = choices.classList.contains('hide');
	choices.classList.toggle('hide', !expanded);
	if(expanded && typeof choices.showModal === 'function') choices.showModal();
	if(!expanded && typeof choices.close === 'function') choices.close();
	toggle.setAttribute('aria-expanded', String(expanded));
	if(expanded && choices.firstElementChild) choices.firstElementChild.focus();
}

function hideCodeScanCityChoices() {
	var choices = document.getElementById('code_scan_city_choices');
	var toggle = document.getElementById('code_scan_city_select');
	if(choices) {
		if(typeof choices.close === 'function') choices.close();
		choices.classList.add('hide');
	}
	if(toggle) toggle.setAttribute('aria-expanded', 'false');
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
	var useCodeButton = document.getElementById('code_scan_apply_crop');
	var validityNode = document.getElementById('code_scan_review_validity');
	var inputs = [w1Input, w2Input, w3Input];
	var invalidWords = [];
	var newlyInvalidWords = [];
	var valid = true;
	inputs.forEach(function(input, index) {
		if(!input) { valid = false; return; }
		var value = input.value.trim().toLowerCase();
		var listed = !!(value && typeof wordList !== 'undefined' && wordList && wordList.includes(value));
		var possible = !value || listed || (typeof wordList !== 'undefined' && wordList &&
			(wordList.wordList || [wordList.curList || []]).some(function(group) {
				return group.some(function(word) { return String(word).toLowerCase().indexOf(value) === 0; });
			}));
		var invalid = !!value && !possible;
		if(invalid && !input.classList.contains('code_scan_word_invalid')) newlyInvalidWords.push(input.value.trim());
		input.classList.toggle('code_scan_word_pending', !listed && !invalid);
		valid = valid && listed;
		input.classList.toggle('code_scan_word_invalid', invalid);
		input.setAttribute('aria-invalid', String(invalid));
		input.setCustomValidity(invalid ? 'This word is not in the Wolo word list.' : '');
		if(invalid) invalidWords.push(input.value.trim());
	});
	if(useCodeButton)
		useCodeButton.disabled = !valid || codeScanState.phase !== 'review';
	var saveButton = document.getElementById('code_scan_save');
	if(saveButton) saveButton.disabled = !valid || codeScanState.saving;
	if(validityNode) {
		if(!invalidWords.length) {
			clearTimeout(codeScanWordPopupTimer);
			validityNode.classList.remove('code_scan_word_popup_visible');
			validityNode.textContent = '';
		}
		if(newlyInvalidWords.length) {
			clearTimeout(codeScanWordPopupTimer);
			validityNode.textContent = newlyInvalidWords.map(function(word) { return '“' + word + '”'; }).join(', ') + ': not in the Wolo word list.';
			validityNode.classList.add('code_scan_word_popup_visible');
			codeScanWordPopupTimer = setTimeout(function() {
				validityNode.classList.remove('code_scan_word_popup_visible');
				validityNode.textContent = '';
			}, 3000);
		}
	}
	if(cityInput) {
		var city = cityInput.value.trim().toLowerCase();
		cityInput.classList.toggle('code_scan_city_tag', !!city && codeScanCityChoices.some(function(choice) {
			return String(choice).trim().toLowerCase() === city;
		}));
	}
	if(cityInput && !cityInput.value && typeof selected_decode_city !== 'undefined' && selected_decode_city && selected_decode_city.name)
		cityInput.placeholder = selected_decode_city.name;
}

function getCodeScanReviewCode(event) {
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
	return code;
}

function useCodeScanReview(event) {
	var code = getCodeScanReviewCode(event);
	if(code) applyScannedWoloCode(code);
}

function getCodeScanReviewMetadata() {
	var metadata = Object.assign({}, codeScanState.reviewMetadata);
	['title', 'segment', 'address_line_1', 'address_line_2'].forEach(function(key) {
		metadata[key] = String(metadata[key] || '').trim();
	});
	return metadata;
}

function saveCodeScanReview(event) {
	var code = getCodeScanReviewCode(event);
	if(!code || codeScanState.saving) return;
	var metadata = getCodeScanReviewMetadata();
	if(!metadata.title) {
		setCodeScanDetailsExpanded(true);
		document.getElementById('code_scan_title').focus();
		showNotification('Title is required');
		return;
	}
	var parts = code.split(' ');
	var words = parts.slice(-3);
	var cityParts = parts.slice(0, -3);
	var revision = ++codeScanState.saveRevision;
	codeScanState.saving = true;
	updateCodeScanReviewValidity();
	function resolved(city) {
		if(!codeScanState.active || revision !== codeScanState.saveRevision) return;
		codeScanState.saving = false;
		updateCodeScanReviewValidity();
		if(!city || city.id == null) {
			showNotification('Choose a recognized city before saving');
			return;
		}
		var dialog = document.getElementById('code_scan_message');
		if(dialog && dialog.classList.contains('hide')) showOverlay(dialog);
		saveAddress(metadata.title, metadata.segment, metadata, undefined, { city: city, code: words });
	}
	if(cityParts.length) {
		getCityFromName(cityParts.slice(0, -1), cityParts[cityParts.length - 1], resolved, function() { resolved(null); });
	}
	else {
		var selected = typeof selected_decode_city !== 'undefined' ? selected_decode_city : null;
		if(selected && selected.id == null && selected.name) {
			getCityFromName([], selected.name.toLowerCase(), resolved, function() { resolved(null); });
		}
		else resolved(selected);
	}
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
	codeScanState.reviewMatch = null;
	resetCodeScanDetails();
	setCodeScanReviewVisible(false);
	setCodeScanFrozenPreview(false);
	setCodeScanCropControlsVisible(false);
	resetCodeScanZoom();
	resetCodeScanLiveZoom();
	resetCodeScanGuide();
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
	var metadata = getCodeScanReviewMetadata();
	var hasMetadata = metadata && (metadata.title || metadata.segment || metadata.address_line_1 || metadata.address_line_2);
	var details = document.getElementById('code_scan_details');
	var options = { showAddress: !!details && !details.hidden };
	stopCodeScan();
	hideOverlay(document.getElementById('code_scan_message'));
	if(fromMap) {
		if(pacInput)
			pacInput.value = code;
		if(typeof syncProceedButtons == 'function')
			syncProceedButtons();
		if((hasMetadata || options.showAddress) && typeof beginDecode == 'function') beginDecode(code, metadata, options);
		else if(typeof decode_input_from_map == 'function')
			decode_input_from_map();
		return;
	}
	if(decodeInput)
		decodeInput.value = '\\ ' + code + ' /';
	if(typeof resizeInput == 'function' && decodeInput)
		resizeInput.call(decodeInput);
	if(typeof syncProceedButtons == 'function')
		syncProceedButtons();
	if((hasMetadata || options.showAddress) && typeof beginDecode == 'function') beginDecode(code, metadata, options);
	else if(typeof decode_input_from_form == 'function')
		decode_input_from_form();
}

function handleCodeScanPhotoInput(event) {
	var file = event && event.target && event.target.files && event.target.files[0];
	if(!file)
		return;
	codeScanState.reviewMatch = null;
	resetCodeScanDetails();
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
		if(!codeScanState.active)
			return;
		setCodeScanFrozenPreview(true);
		setCodeScanCropControlsVisible(true);
		var photoCanvas = getCodeScanCanvas();
		var match = extractMatchFromOcrResult(result);
		return enrichCodeScanMetadata(photoCanvas, match);
	}).then(function(match) {
		codeScanState.processing = false;
		if(!codeScanState.active || match === undefined)
			return;
		showCodeScanReview(match);
		if(!match) setCodeScanStatus('');
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
				canvas.width = width;
				canvas.height = height;
				canvas.getContext('2d').drawImage(image, 0, 0, width, height);
				saveCodeScanSourceFromCanvas(canvas, true);
				resetCodeScanZoom();
				setCodeScanFrozenPreview(true);
				setCodeScanCropControlsVisible(true);
				ocrCanvas = canvas;
				if(!codeScanState.worker) {
					reject(new Error('Scanner not ready'));
					return;
				}
				recognizeCodeScanCanvas(ocrCanvas).then(resolve).catch(reject);
			};
			image.onerror = reject;
			image.src = reader.result;
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function setCodeScanCandidateHighlight(bbox, canvas, id, padded) {
	var highlight = document.getElementById(id || 'code_scan_candidate_highlight');
	var viewport = document.querySelector('.code_scan_viewport');
	var video = getCodeScanVideo();
	var width;
	var height;
	var left;
	var top;
	var boxWidth;
	var boxHeight;
	if(!codeScanState.showRegions || !highlight || !viewport || !bbox || !canvas)
		return;
	width = canvas.width;
	height = canvas.height;
	if(!width || !height)
		return;
	var padX = padded === false ? 0 : (bbox.x1 - bbox.x0) * 0.05;
	var padY = padded === false ? 0 : (bbox.y1 - bbox.y0) * 0.05;
	var x0 = Math.max(0, bbox.x0 - padX);
	var y0 = Math.max(0, bbox.y0 - padY);
	left = (x0 / width) * 100;
	top = (y0 / height) * 100;
	boxWidth = ((Math.min(width, bbox.x1 + padX) - x0) / width) * 100;
	boxHeight = ((Math.min(height, bbox.y1 + padY) - y0) / height) * 100;
	highlight.style.left = left + '%';
	highlight.style.top = top + '%';
	highlight.style.width = boxWidth + '%';
	highlight.style.height = boxHeight + '%';
	if(viewport.classList && viewport.classList.contains('code_scan_viewport_frozen')) {
			var imageRect = getCodeScanRenderedImageRect(canvas);
			var viewportRect = viewport.getBoundingClientRect();
			highlight.style.left = (imageRect.left - viewportRect.left + left / 100 * imageRect.width) + 'px';
			highlight.style.top = (imageRect.top - viewportRect.top + top / 100 * imageRect.height) + 'px';
			highlight.style.width = (boxWidth / 100 * imageRect.width) + 'px';
			highlight.style.height = (boxHeight / 100 * imageRect.height) + 'px';
	}
	highlight.classList.remove('hide');
}

function drawCodeScanMatchRegions(match, canvas) {
	codeScanState.regionMatch = match;
	codeScanState.regionCanvas = canvas;
	clearCodeScanCandidateHighlight();
	if(!match || !match.regions || !canvas) return;
	if(match.regions.card) setCodeScanCandidateHighlight(match.regions.card, canvas, 'code_scan_card_highlight', false);
	setCodeScanCandidateHighlight(match.regions.container, canvas, 'code_scan_container_highlight', false);
	setCodeScanCandidateHighlight(match.regions.code, canvas);
	if(match.regions.city) setCodeScanCandidateHighlight(match.regions.city, canvas, 'code_scan_city_highlight');
}

function redrawCodeScanReviewRegions() {
	if(codeScanState.active && codeScanState.reviewMatch)
		drawCodeScanMatchRegions(codeScanState.reviewMatch, getCodeScanCanvas());
}

function clearCodeScanCandidateHighlight() {
	['code_scan_card_highlight', 'code_scan_candidate_highlight', 'code_scan_container_highlight', 'code_scan_city_highlight'].forEach(function(id) {
		var highlight = document.getElementById(id);
		if(highlight) highlight.classList.add('hide');
	});
}

function positionCodeScanGuideToDetectedRegion(bbox, canvas) {
	var guide = document.getElementById('code_scan_fixed_guide');
	var viewport = document.querySelector('.code_scan_viewport');
	var canvasEl = getCodeScanCanvas();
	var vpRect;
	var imgRect;
	var normX0;
	var normY0;
	var normX1;
	var normY1;
	var boxCenterX;
	var boxCenterY;
	var boxWidth;
	var boxHeight;
	var guideWidth;
	var guideHeight;
	var guideLeft;
	var guideTop;
	if(!guide || !viewport || !bbox || !canvas)
		return;
	canvasEl = canvasEl || canvas;
	vpRect = viewport.getBoundingClientRect();
	imgRect = getCodeScanRenderedImageRect(canvasEl);
	if(!vpRect.width || !vpRect.height || !imgRect.width || !imgRect.height)
		return;
	normX0 = bbox.x0 / canvas.width;
	normY0 = bbox.y0 / canvas.height;
	normX1 = bbox.x1 / canvas.width;
	normY1 = bbox.y1 / canvas.height;
	boxCenterX = (imgRect.left - vpRect.left) + ((normX0 + normX1) / 2) * imgRect.width;
	boxCenterY = (imgRect.top - vpRect.top) + ((normY0 + normY1) / 2) * imgRect.height;
	boxWidth = (normX1 - normX0) * imgRect.width;
	boxHeight = (normY1 - normY0) * imgRect.height;

	guideWidth = Math.min(vpRect.width * 0.94, Math.max(boxWidth * 1.35, boxHeight * 3.6, vpRect.width * 0.5));
	guideHeight = guideWidth / ((1 + Math.sqrt(5)) / 2);
	if(guideHeight > vpRect.height * 0.92) {
		guideHeight = vpRect.height * 0.92;
		guideWidth = guideHeight * ((1 + Math.sqrt(5)) / 2);
	}
	guideLeft = Math.max(guideWidth / 2, Math.min(vpRect.width - guideWidth / 2, boxCenterX));
	guideTop = Math.max(guideHeight / 2, Math.min(vpRect.height - guideHeight / 2, boxCenterY));

	guide.style.left = Math.round(guideLeft) + 'px';
	guide.style.top = Math.round(guideTop) + 'px';
	guide.style.width = Math.round(guideWidth) + 'px';
	guide.style.height = Math.round(guideHeight) + 'px';
	guide.style.transform = 'translate(-50%, -50%)';
	guide.style.aspectRatio = 'unset';
}

function resetCodeScanGuide() {
	var guide = document.getElementById('code_scan_fixed_guide');
	if(guide) {
		guide.style.left = '';
		guide.style.top = '';
		guide.style.width = '';
		guide.style.height = '';
		guide.style.transform = '';
		guide.style.aspectRatio = '';
	}
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

function setCodeScanEditingCrop(isEditing) {
	var viewport = document.querySelector('.code_scan_viewport');
	if (viewport) {
		viewport.classList.toggle('code_scan_is_editing_crop', !!isEditing);
	}
}

function setCodeScanZoom(zoom, panX, panY) {
	var canvas = getCodeScanCanvas();
	var zoomLevelNode = document.getElementById('code_scan_zoom_level');
	var clampedZoom = Math.max(1, Math.min(4, typeof zoom === 'number' ? zoom : 1));
	var previousZoom = codeScanState.zoom;
	var previousPanX = codeScanState.panX;
	var previousPanY = codeScanState.panY;
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
	var resetButton = document.getElementById('code_scan_zoom_reset');
	if(resetButton)
		resetButton.classList.toggle('code_scan_zoom_changed', codeScanState.zoom !== 1);
	
	if (codeScanState.phase !== 'live' && (codeScanState.zoom !== 1 || codeScanState.panX !== 0 || codeScanState.panY !== 0 || (codeScanState.originalSourceCanvas && codeScanState.sourceCanvas === codeScanState.originalSourceCanvas))) {
		setCodeScanEditingCrop(true);
	}
	if(previousZoom !== codeScanState.zoom || previousPanX !== codeScanState.panX || previousPanY !== codeScanState.panY)
		scheduleCodeScanCropRecognition();
	if(codeScanState.reviewMatch && codeScanState.phase === 'review')
		drawCodeScanMatchRegions(codeScanState.reviewMatch, canvas);
}

function scheduleCodeScanCropRecognition() {
	if(!codeScanState.active || !codeScanState.hasCaptured || !codeScanState.worker)
		return;
	codeScanState.cropRevision += 1;
	clearTimeout(codeScanState.cropScanTimer);
	codeScanState.cropScanTimer = setTimeout(function retry() {
		codeScanState.cropScanTimer = null;
		if(!codeScanState.active || !codeScanState.hasCaptured) return;
		if(codeScanState.phase === 'processing' || codeScanState.isDragging) {
			codeScanState.cropScanTimer = setTimeout(retry, 350);
			return;
		}
		applyCodeScanCrop();
	}, 350);
}

function resetCodeScanZoom() {
	var canvas = getCodeScanCanvas();
	var didRestoreOriginal = false;
	if(codeScanState.zoom === 1 && codeScanState.originalSourceCanvas && codeScanState.sourceCanvas !== codeScanState.originalSourceCanvas && canvas) {
		canvas.width = codeScanState.originalSourceCanvas.width;
		canvas.height = codeScanState.originalSourceCanvas.height;
		canvas.getContext('2d').drawImage(codeScanState.originalSourceCanvas, 0, 0);
		codeScanState.sourceCanvas = codeScanState.originalSourceCanvas;
		resetCodeScanGuide();
		didRestoreOriginal = true;
	}
	else if(codeScanState.sourceCanvas && canvas) {
		canvas.width = codeScanState.sourceCanvas.width;
		canvas.height = codeScanState.sourceCanvas.height;
		canvas.getContext('2d').drawImage(codeScanState.sourceCanvas, 0, 0);
	}
	setCodeScanZoom(1.0, 0, 0);
	if (didRestoreOriginal) {
		setCodeScanEditingCrop(true);
	}
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
	codeScanState.cropRevision += 1;
	var video = getCodeScanVideo();
	var clampedZoom = Math.max(1, Math.min(4, typeof zoom === 'number' ? zoom : 1));
	codeScanState.liveZoom = Math.round(clampedZoom * 100) / 100;
	if(video)
		video.style.transform = codeScanState.liveZoom > 1 ? 'scale(' + codeScanState.liveZoom + ')' : '';
	updateCodeScanLiveZoomIndicator();
	resetCodeScanMatchState();
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	if(codeScanState.active && codeScanState.phase === 'live') {
		clearCodeScanTimer();
		codeScanState.scanTimer = setTimeout(runCodeScanFrame, 350);
	}
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
	if(event.stopPropagation)
		event.stopPropagation();
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
	if(event.stopPropagation)
		event.stopPropagation();
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
	if(event.stopPropagation)
		event.stopPropagation();
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
	var dialog = document.querySelector('.code_scan_dialog');
	if(dialog) {
		dialog.addEventListener('touchmove', function(e) { e.stopPropagation(); }, {passive: false});
		dialog.addEventListener('touchstart', function(e) { e.stopPropagation(); }, {passive: false});
	}
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
	var revision = codeScanState.cropRevision;
	var canvas = getCodeScanCanvas();
	var source = codeScanState.originalSourceCanvas || codeScanState.sourceCanvas || canvas;
	if(!canvas || !source || !codeScanState.worker || codeScanState.phase === 'processing') return;
	clearTimeout(codeScanState.cropScanTimer);
	codeScanState.cropScanTimer = null;
	var focus = { x: source.width / 2, y: source.height / 2 };
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport) {
		var viewportRect = viewport.getBoundingClientRect();
		var imageRect = getCodeScanRenderedImageRect(canvas);
		if(imageRect.width && imageRect.height) {
			focus.x = Math.max(0, Math.min(source.width, (viewportRect.left + viewportRect.width / 2 - imageRect.left) / imageRect.width * source.width));
			focus.y = Math.max(0, Math.min(source.height, (viewportRect.top + viewportRect.height / 2 - imageRect.top) / imageRect.height * source.height));
		}
	}
	setCodeScanPhase('processing');
	setCodeScanStatus('Reading label on your device...');
	// Reframing changes candidate preference, never clips the card to the guide.
	recognizeCodeScanCanvas(source, focus).then(function(result) {
		if(!codeScanState.active) return;
		if(revision !== codeScanState.cropRevision) { setCodeScanPhase('review'); return; }
		var match = extractMatchFromOcrResult(result);
		return enrichCodeScanMetadata(source, match).then(function(detailed) {
			if(!codeScanState.active || revision !== codeScanState.cropRevision) { setCodeScanPhase('review'); return; }
			if(detailed) {
				showCodeScanReview(detailed);
				setCodeScanStatus('Label recognized. Check the city and words.');
			}
			else {
				setCodeScanPhase('review');
				setCodeScanStatus('Could not read the code box. Try another photo or edit the words.');
			}
		});
	}).catch(function() {
		if(!codeScanState.active) return;
		setCodeScanPhase('review');
		setCodeScanStatus('Recognition failed. Try again or edit the words.');
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
