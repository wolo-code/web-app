var codeScanState = {
	active: false,
	debug: false,
	debugPaused: false,
	showRegions: false,
	regionMatch: null,
	regionCanvas: null,
	regionBoxes: [],
	recognizedFrame: null,
	source: 'decode',
	phase: 'live',
	detectionMode: 'fixed',
	hasCaptured: false,
	stream: null,
	worker: null,
	workerPromise: null,
	workerQueue: Promise.resolve(),
	workerEpoch: 0,
	workerJobs: [],
	session: 0,
	cameraRequest: 0,
	cameraState: 'idle',
	previewFrame: null,
	scanTimer: null,
	processing: false,
	stableMatchCount: 0,
	missedMatchFrame: false,
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

var CODE_SCAN_FRAME_INTERVAL_MS = 250;
var CODE_SCAN_CONFIRM_INTERVAL_MS = 70;
var CODE_SCAN_STABLE_MATCHES = 2;
var CODE_SCAN_BBOX_IOU_MIN = 0.55;
var CODE_SCAN_TESSERACT_BASE = '/tesseract';
var CODE_SCAN_LOAD_TIMEOUT_MS = 45000;
var CODE_SCAN_OCR_TIMEOUT_MS = 60000;
var CODE_SCAN_PRELOAD_KEEPALIVE_MS = 30000;
var CODE_SCAN_MAX_PHOTO_PIXELS = 24000000;
var codeScanInitialStatus = '';
var codeScanCityChoices = [];
var codeScanWordPopupTimer = null;
var CODE_SCAN_METADATA_KEYS = ['title', 'segment', 'address_line_1', 'address_line_2'];

function getCodeScanInitialStatus() {
	if(!codeScanInitialStatus) {
		var node = document.getElementById('code_scan_status');
		if(node) codeScanInitialStatus = Array.prototype.map.call(node.childNodes, function(part) {
			return part.textContent.trim();
		}).filter(Boolean).join('\n');
	}
	return codeScanInitialStatus;
}

function initCodeScan() {
	['decode_code_scan_button', 'map_code_scan_button'].forEach(function(id) {
		addLongpressListener(document.getElementById(id), openCodeScan, function(event) {
			openCodeScan(event, true);
		});
	});
	bindControl('code_scan_close', 'click', closeCodeScan);
	bindControl('code_scan_type_instead', 'click', openCodeScanManualEntry);
	bindControl('code_scan_use_photo', 'click', openCodeScanPhotoPicker);
	bindControl('code_scan_flashlight', 'click', toggleCodeScanFlashlight);
	bindControl('code_scan_save', 'click', saveCodeScanReview);
	bindControl('code_scan_rescan', 'click', rescanCodeScan);
	bindControl('code_scan_zoom_out', 'click', zoomOutCodeScan);
	bindControl('code_scan_zoom_in', 'click', zoomInCodeScan);
	bindControl('code_scan_zoom_level', 'click', function() { resetCodeScanZoom(); });
	bindControl('code_scan_city_select', 'click', toggleCodeScanCityChoices);
	bindControl('code_scan_details_toggle', 'click', toggleCodeScanDetails);
	CODE_SCAN_METADATA_KEYS.forEach(function(key) {
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
	document.addEventListener('visibilitychange', function() {
		if(document.hidden) suspendCodeScanMedia();
		else resumeCodeScanCamera();
	});
	window.addEventListener('pagehide', suspendCodeScanMedia);
	window.addEventListener('pageshow', resumeCodeScanCamera);
	window.addEventListener('resize', function() {
		if(!codeScanState.active || !codeScanState.hasCaptured) return;
		if(codeScanState.zoom > 1) {
			setCodeScanZoom(codeScanState.zoom);
			scheduleCodeScanCropRecognition();
		}
		else redrawCodeScanReviewRegions();
	});
	var previewCanvas = getCodeScanCanvas();
	if(previewCanvas) previewCanvas.addEventListener('transitionend', redrawCodeScanReviewRegions);
	var photoInput = document.getElementById('code_scan_photo_input');
	if(photoInput) {
		photoInput.addEventListener('change', handleCodeScanPhotoInput);
		var connection = navigator.connection;
		if(!connection || (!connection.saveData && !/2g$/.test(connection.effectiveType))) {
			if(window.requestIdleCallback) window.requestIdleCallback(preloadCodeScanWorker);
			else setTimeout(preloadCodeScanWorker, 1500);
		}
	}
}

function preloadCodeScanWorker() {
	if(document.hidden || codeScanState.active) return;
	var epoch = codeScanState.workerEpoch;
	prepareCodeScanWorker().then(function() {
		setTimeout(function() {
			if(!codeScanState.active && epoch === codeScanState.workerEpoch) terminateCodeScanWorker();
		}, CODE_SCAN_PRELOAD_KEEPALIVE_MS);
	}).catch(function() {});
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

function setCodeScanDebug(enabled) {
	codeScanState.debug = enabled;
	setCodeScanRegionInspection(enabled);
	codeScanState.debugPaused = false;
	var overlay = document.getElementById('code_scan_debug');
	var steps = document.getElementById('code_scan_debug_steps');
	if(overlay) overlay.classList.toggle('hide', !enabled);
	if(steps) steps.textContent = '';
}

function logCodeScanStep(message, startedAt) {
	if(!codeScanState.debug || codeScanState.debugPaused || !codeScanState.active) return;
	var overlay = document.getElementById('code_scan_debug');
	var steps = document.getElementById('code_scan_debug_steps');
	if(startedAt !== undefined) message += ' (' + Math.round(performance.now() - startedAt) + ' ms)';
	if(!overlay || !steps || (steps.lastElementChild && steps.lastElementChild.textContent === message)) return;
	var following = overlay.scrollHeight - overlay.clientHeight - overlay.scrollTop <= 2;
	var step = document.createElement('li');
	step.textContent = message;
	steps.appendChild(step);
	if(steps.childElementCount > 200) steps.firstElementChild.remove();
	if(following) overlay.scrollTop = overlay.scrollHeight;
}

function openCodeScan(event, debug) {
	if(event && event.preventDefault)
		event.preventDefault();
	if(typeof wordList == 'undefined' || !wordList) {
		showNotification('Word list is still loading. Try again in a moment.');
		return;
	}
	invalidateCodeScanSession(!codeScanState.active);
	codeScanState.source = document.body.classList.contains('decode') ? 'decode' : 'map';
	codeScanState.hasCaptured = false;
	resetCodeScanUi();
	setCodeScanPhotoFallbackVisible(true);
	showOverlay(document.getElementById('code_scan_message'));
	codeScanState.active = true;
	setCodeScanDebug(!!debug);
	logCodeScanStep('Debug mode started');
	setCodeScanDetectionMode('fixed');
	if(codeScanOcrMatch.isCodeScanSupported()) {
		setCodeScanStatus('Requesting camera...');
		setCodeScanPreviewFrameVisible(true);
		startCodeScanCamera();
		return;
	}
	prepareCodeScanWorker().catch(function() {});
	codeScanState.cameraAvailable = false;
	setCodeScanPreviewFrameVisible(false);
	setCodeScanViewportVisible(codeScanState.debug);
	logCodeScanStep('Live camera unsupported');
	setCodeScanStatus('Live camera is not supported here. Use a photo of the label or type the code instead.');
}

function openCodeScanPhotoPicker(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	var photoInput = document.getElementById('code_scan_photo_input');
	if(!photoInput)
		return;
	setCodeScanPreviewFrameVisible(false);
	prepareCodeScanWorker().catch(function() {});
	photoInput.value = '';
	photoInput.click();
}

function openCodeScanManualEntry(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	if(!codeScanState.active || codeScanState.phase !== 'live') return;
	setCodeScanPreviewFrameVisible(false);
	invalidateCodeScanSession();
	resetCodeScanMatchState();
	showCodeScanReview(null, true);
	var firstWord = document.getElementById('code_scan_review_w1');
	if(firstWord) firstWord.focus();
}

function closeCodeScan(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	stopCodeScan();
	hideOverlay(document.getElementById('code_scan_message'));
}

function stopCodeScan() {
	invalidateCodeScanSession();
	clearTimeout(codeScanState.cropScanTimer);
	codeScanState.cropScanTimer = null;
	codeScanState.cropRevision += 1;
	codeScanState.active = false;
	setCodeScanDebug(false);
	codeScanState.processing = false;
	codeScanState.cameraAvailable = false;
	codeScanState.phase = 'live';
	codeScanState.hasCaptured = false;
	codeScanState.originalSourceCanvas = null;
	codeScanState.sourceCanvas = null;
	resetCodeScanMatchState();
	clearCodeScanTimer();
	resetCodeScanUi();
	var photoInput = document.getElementById('code_scan_photo_input');
	if(photoInput)
		photoInput.value = '';
}

function invalidateCodeScanSession(keepWorker) {
	codeScanState.session += 1;
	setCodeScanDetailsLoading(false);
	codeScanState.recognizedFrame = null;
	codeScanState.cropRevision += 1;
	codeScanState.processing = false;
	clearTimeout(codeScanState.cropScanTimer);
	codeScanState.cropScanTimer = null;
	clearCodeScanTimer();
	stopCodeScanCamera();
	if(!keepWorker) terminateCodeScanWorker();
}

function isCurrentCodeScanSession(session) {
	return codeScanState.active && session === codeScanState.session;
}

function resetCodeScanUi() {
	codeScanState.reviewMatch = null;
	resetCodeScanDetails();
	setCodeScanPhase('live');
	clearCodeScanReviewFields();
	setCodeScanManualEntry(false);
	setCodeScanViewportVisible(true);
	setCodeScanFrozenPreview(false);
	setCodeScanCropControlsVisible(false);
	setCodeScanLiveControlsVisible(true);
	setCodeScanReviewVisible(false);
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
	setCodeScanPreviewFrameVisible(false);
	setCodeScanStatus(getCodeScanInitialStatus());
	codeScanState.originalSourceCanvas = null;
	codeScanState.sourceCanvas = null;
	codeScanState.isDragging = false;
	codeScanState.touchStartDist = 0;
	resetCodeScanZoom();
	resetCodeScanLiveZoom();
}

function resetCodeScanMatchState() {
	codeScanState.recognizedFrame = null;
	codeScanState.regionMatch = null;
	codeScanState.regionCanvas = null;
	codeScanState.regionBoxes = [];
	codeScanState.stableMatchCount = 0;
	codeScanState.missedMatchFrame = false;
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

function scheduleCodeScanFrame(delay) {
	clearCodeScanTimer();
	if(!codeScanState.active || !isCodeScanVisible() || codeScanState.hasCaptured) {
		if(codeScanState.active && !codeScanState.hasCaptured)
			stopCodeScan();
		return;
	}
	if(codeScanState.phase !== 'live')
		return;
	codeScanState.scanTimer = setTimeout(runCodeScanFrame, delay === undefined ? CODE_SCAN_FRAME_INTERVAL_MS : delay);
}

function getCodeScanVideo() {
	return document.getElementById('code_scan_video');
}

function startCodeScanLivePreview(video) {
	var canvas = document.getElementById('code_scan_live_canvas');
	var context = canvas && canvas.getContext('2d');
	if(!context) throw new Error('Camera preview unavailable');
	var viewport = canvas.parentElement;
	var lastDraw = -Infinity;
	// Draw from the decoded frame so the browser's video layer cannot letterbox the Viewfinder.
	function draw(timestamp) {
		codeScanState.previewFrame = window.requestAnimationFrame(draw);
		if(video.readyState < 2 || timestamp - lastDraw < 32) return;
		var width = viewport.clientWidth;
		var height = viewport.clientHeight;
		if(!width || !height) return;
		var crop = getCodeScanVideoSourceRect(video, viewport);
		if(!crop.sw || !crop.sh) return;
		var density = Math.min(window.devicePixelRatio || 1, 2);
		width = Math.round(width * density);
		height = Math.round(height * density);
		if(canvas.width !== width) canvas.width = width;
		if(canvas.height !== height) canvas.height = height;
		try {
			context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
		} catch(error) {
			handleCodeScanCameraError(error);
			return;
		}
		if(lastDraw === -Infinity) {
			canvas.classList.remove('hide');
			setCodeScanPreviewFrameVisible(false);
		}
		lastDraw = timestamp;
	}
	codeScanState.previewFrame = window.requestAnimationFrame(draw);
}

function getCodeScanVideoTrack() {
	var stream = codeScanState.stream;
	return stream && stream.getVideoTracks && stream.getVideoTracks()[0];
}

function setCodeScanFlashlightAvailable(track) {
	var button = document.getElementById('code_scan_flashlight');
	if(!button) return;
	var torch = track && track.getCapabilities && track.getCapabilities()['torch'];
	var available = !!(track && track.applyConstraints &&
		(torch === true || (Array.isArray(torch) && torch.includes(true) && torch.includes(false))));
	button.classList.toggle('hide', !available);
	button.disabled = !available;
	button.setAttribute('aria-pressed', 'false');
}

async function toggleCodeScanFlashlight(event) {
	var button = event.currentTarget;
	var track = getCodeScanVideoTrack();
	if(button.disabled || !codeScanState.cameraAvailable || !track || track.readyState !== 'live') return;
	var request = codeScanState.cameraRequest;
	var enabled = button.getAttribute('aria-pressed') !== 'true';
	button.disabled = true;
	try {
		await track.applyConstraints({ advanced: [{ 'torch': enabled }] });
		if(request === codeScanState.cameraRequest)
			button.setAttribute('aria-pressed', String(enabled));
	} catch(error) {
		if(request === codeScanState.cameraRequest) setCodeScanStatus('Could not change the flashlight.');
	} finally {
		if(request === codeScanState.cameraRequest) button.disabled = false;
	}
}

function getCodeScanCanvas() {
	return document.getElementById('code_scan_canvas');
}

function suspendCodeScanMedia() {
	if(!codeScanState.active && codeScanState.workerPromise) terminateCodeScanWorker();
	if(codeScanState.cameraState !== 'active') return;
	invalidateCodeScanSession();
	codeScanState.cameraState = 'suspended';
	setCodeScanPreviewFrameVisible(false);
	resetCodeScanMatchState();
	clearCodeScanCandidateHighlight();
	setCodeScanWoloFoundCue(false);
}

function resumeCodeScanCamera() {
	if(document.hidden || codeScanState.cameraState !== 'suspended' || !codeScanState.active ||
		!isCodeScanVisible() || codeScanState.phase !== 'live' || codeScanState.hasCaptured) return;
	setCodeScanStatus('Requesting camera...');
	setCodeScanPreviewFrameVisible(true);
	startCodeScanCamera();
}

function startCodeScanCamera() {
	var video = getCodeScanVideo();
	if(!video) return;
	if(document.hidden) {
		codeScanState.cameraState = 'suspended';
		return;
	}
	codeScanState.cameraState = 'active';
	var session = codeScanState.session;
	var request = ++codeScanState.cameraRequest;
	function current() {
		return isCurrentCodeScanSession(session) && request === codeScanState.cameraRequest && !document.hidden && !codeScanState.hasCaptured;
	}
	// Load the worker while the browser starts the camera. Camera readiness owns the visible status.
	var startedAt = codeScanState.debug ? performance.now() : undefined;
	logCodeScanStep('Requesting camera');
	var workerReady = prepareCodeScanWorker();
	workerReady.catch(function() {});
	navigator.mediaDevices.getUserMedia({
		video: {
			facingMode: {ideal: 'environment'},
			width: {ideal: 1920},
			height: {ideal: 1080}
		},
		audio: false
	}).then(function(stream) {
		if(!current()) {
			stream.getTracks().forEach(function(track) {
				track.stop();
			});
			return;
		}
		codeScanState.stream = stream;
		video.srcObject = stream;
		return video.play();
	}).then(function() {
		if(!current())
			return;
		codeScanState.cameraAvailable = true;
		setCodeScanFlashlightAvailable(getCodeScanVideoTrack());
		logCodeScanStep('Camera ready', startedAt);
		setCodeScanViewportVisible(true);
		setCodeScanLiveControlsVisible(true);
		setCodeScanFrozenPreview(false);
		startCodeScanLivePreview(video);
		setCodeScanStatus(getCodeScanInitialStatus());
		workerReady.then(function() {
			if(current() && codeScanState.phase === 'live') {
				logCodeScanStep('Camera and OCR worker ready', startedAt);
				runCodeScanFrame();
			}
		}).catch(function(error) { if(current()) handleCodeScanWorkerError(error); });
	}).catch(function(error) { if(current()) handleCodeScanCameraError(error); });
}

function stopCodeScanCamera() {
	codeScanState.cameraRequest += 1;
	codeScanState.cameraState = 'idle';
	codeScanState.cameraAvailable = false;
	setCodeScanFlashlightAvailable(null);
	if(codeScanState.previewFrame !== null) {
		window.cancelAnimationFrame(codeScanState.previewFrame);
		codeScanState.previewFrame = null;
		var canvas = document.getElementById('code_scan_live_canvas');
		canvas.classList.add('hide');
		canvas.width = 0;
		canvas.height = 0;
	}
	var video = getCodeScanVideo();
	if(codeScanState.stream) {
		codeScanState.stream.getTracks().forEach(function(track) {
			track.stop();
		});
		codeScanState.stream = null;
	}
	if(video) {
		var hadStream = !!video.srcObject;
		video.pause();
		video.srcObject = null;
		if(hadStream) video.replaceWith(video.cloneNode(false));
	}
}

function loadCodeScanTesseractScript() {
	if(window.Tesseract)
		return Promise.resolve(window.Tesseract);
	if(codeScanState.tesseractPromise)
		return codeScanState.tesseractPromise;
	var loading = new Promise(function(resolve, reject) {
		var script = document.createElement('script');
		var timer = setTimeout(function() { finish(new Error('Scanner download timed out')); }, CODE_SCAN_LOAD_TIMEOUT_MS);
		function finish(error) {
			clearTimeout(timer);
			script.onload = script.onerror = null;
			if(error) {
				if(script.parentNode) script.parentNode.removeChild(script);
				reject(error);
			} else resolve(window.Tesseract);
		}
		script.src = CODE_SCAN_TESSERACT_BASE + '/tesseract.min.js';
		script.async = true;
		script.onload = function() {
			finish(window.Tesseract ? null : new Error('Tesseract failed to load'));
		};
		script.onerror = function() {
			finish(new Error('Tesseract failed to load'));
		};
		document.head.appendChild(script);
	});
	codeScanState.tesseractPromise = loading.catch(function(error) {
		codeScanState.tesseractPromise = null;
		throw error;
	});
	return codeScanState.tesseractPromise;
}

function codeScanCancelledError() {
	var error = new Error('Scan cancelled');
	error.name = 'AbortError';
	return error;
}

// Termination must settle callers too: Tesseract can leave its promises pending.
function waitForCodeScanWorker(promise, timeout) {
	return new Promise(function(resolve, reject) {
		var timer = setTimeout(function() { finish(new Error('Scanner timed out')); }, timeout);
		var settled = false;
		function cancel(error) { finish(error || codeScanCancelledError()); }
		function finish(error, value) {
			if(settled) return;
			settled = true;
			clearTimeout(timer);
			var index = codeScanState.workerJobs.indexOf(cancel);
			if(index >= 0) codeScanState.workerJobs.splice(index, 1);
			if(error) reject(error); else resolve(value);
		}
		codeScanState.workerJobs.push(cancel);
		Promise.resolve(promise).then(function(value) { finish(null, value); }, cancel);
	});
}

function disposeCodeScanWorker(worker) {
	if(!worker || typeof worker.terminate !== 'function') return;
	try { Promise.resolve(worker.terminate()).catch(function() {}); } catch(error) {}
}

function prepareCodeScanWorker() {
	if(codeScanState.worker)
		return Promise.resolve(codeScanState.worker);
	logCodeScanStep('Loading OCR worker');
	if(codeScanState.workerPromise) return codeScanState.workerPromise;
	var epoch = codeScanState.workerEpoch;
	var loading = loadCodeScanTesseractScript().then(function(Tesseract) {
		if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
		return Tesseract.createWorker('eng', 1, {
			workerPath: CODE_SCAN_TESSERACT_BASE + '/worker.min.js',
			langPath: CODE_SCAN_TESSERACT_BASE + '/lang',
			cachePath: 'wolo-lstm',
			corePath: CODE_SCAN_TESSERACT_BASE + '/tesseract-core.wasm.min.js',
			logger: function() {},
			errorHandler: function(error) {
				if(epoch === codeScanState.workerEpoch) terminateCodeScanWorker(error instanceof Error ? error : new Error(String(error)));
			}
		});
	}).then(function(worker) {
		if(epoch !== codeScanState.workerEpoch) {
			disposeCodeScanWorker(worker);
			throw codeScanCancelledError();
		}
		codeScanState.worker = worker;
		return worker;
	});
	codeScanState.workerPromise = waitForCodeScanWorker(loading, CODE_SCAN_LOAD_TIMEOUT_MS).catch(function(error) {
		if(epoch === codeScanState.workerEpoch) terminateCodeScanWorker();
		throw error;
	});
	return codeScanState.workerPromise;
}

function terminateCodeScanWorker(error) {
	var worker = codeScanState.worker;
	codeScanState.workerEpoch += 1;
	codeScanState.worker = null;
	codeScanState.workerPromise = null;
	codeScanState.workerQueue = Promise.resolve();
	codeScanState.workerJobs.slice().forEach(function(cancel) { cancel(error); });
	disposeCodeScanWorker(worker);
}

// Serialize recognition on the single OCR worker.
function runCodeScanWorkerTask(work) {
	var epoch = codeScanState.workerEpoch;
	var session = codeScanState.session;
	var task = codeScanState.workerQueue.then(function() {
		if(epoch !== codeScanState.workerEpoch || session !== codeScanState.session) throw codeScanCancelledError();
		return prepareCodeScanWorker();
	}).then(function(worker) {
		if(epoch !== codeScanState.workerEpoch || session !== codeScanState.session) throw codeScanCancelledError();
		return waitForCodeScanWorker(Promise.resolve().then(function() { return work(worker); }), CODE_SCAN_OCR_TIMEOUT_MS);
	}).catch(function(error) {
		if(epoch === codeScanState.workerEpoch && (session === codeScanState.session || error.name !== 'AbortError')) terminateCodeScanWorker();
		throw error;
	});
	codeScanState.workerQueue = task.catch(function() {});
	return task;
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
	setCodeScanPreviewFrameVisible(false);
	setCodeScanViewportVisible(codeScanState.debug);
	logCodeScanStep('Camera error: ' + (error && error.name || 'unavailable'));
	setCodeScanStatus(message);
	showNotification(message);
	stopCodeScanCamera();
}

function handleCodeScanWorkerError() {
	logCodeScanStep('Could not load OCR worker');
	setCodeScanStatus('Scanner failed to load. Type or paste your Wolo Code instead.');
	showNotification('Scanner failed to load. Type or paste your Wolo Code instead.');
}

function runCodeScanFrame() {
	var revision = codeScanState.cropRevision;
	var session = codeScanState.session;
	if(!codeScanState.active || codeScanState.processing || codeScanState.phase !== 'live' || codeScanState.hasCaptured) {
		if(codeScanState.active && codeScanState.phase === 'live' && !codeScanState.hasCaptured)
			scheduleCodeScanFrame();
		return;
	}
	var video = getCodeScanVideo();
	if(!video || video.readyState < 2) {
		scheduleCodeScanFrame(CODE_SCAN_CONFIRM_INTERVAL_MS);
		return;
	}
	var frame = document.createElement('canvas');
	var superseded = false;
	codeScanState.processing = true;
	var startedAt = codeScanState.debug ? performance.now() : undefined;
	// Use the full visible camera image. The Scan Frame is a visual overlay.
	Promise.resolve().then(function() {
		if(!isCurrentCodeScanSession(session)) throw codeScanCancelledError();
		logCodeScanStep('Reading camera frame');
		if(!captureCodeScanFullRes(video, frame)) throw new Error('Camera frame unavailable');
		var checkScene = makeCodeScanSceneCheck(video, frame);
		var previous = codeScanState.recognizedFrame;
		var sameSize = previous && previous.frame.width === frame.width && previous.frame.height === frame.height;
		return recognizeCodeScanCanvas(frame, null, {
			live: {
				previousBox: sameSize ? previous.match.regions.container : null,
				previousCard: sameSize && !codeScanState.missedMatchFrame ? previous.match.regions.card : null,
				isCurrent: function() {
					return isCurrentCodeScanSession(session) && codeScanState.phase === 'live' && revision === codeScanState.cropRevision;
				},
				shouldYield: function() {
					if(!superseded && checkScene()) {
						superseded = true;
						logCodeScanStep('Retrying on a fresh camera frame');
					}
					return superseded;
				},
				showBoxes: function(boxes) {
					if(codeScanState.showRegions && !codeScanState.recognizedFrame)
						drawCodeScanMatchRegions(null, frame, boxes);
				}
			}
		});
	}).then(function(result) {
		if(!isCurrentCodeScanSession(session) || codeScanState.phase !== 'live') return;
		codeScanState.processing = false;
		if(revision !== codeScanState.cropRevision) {
			scheduleCodeScanFrame();
			return;
		}
		logCodeScanStep('Camera frame processed', startedAt);
		if(superseded) {
			scheduleCodeScanFrame(0);
			return;
		}
		handleCodeScanLiveOcrResult(result, frame);
		scheduleCodeScanFrame(codeScanState.recognizedFrame ? CODE_SCAN_CONFIRM_INTERVAL_MS : CODE_SCAN_FRAME_INTERVAL_MS);
	}).catch(function() {
		if(!isCurrentCodeScanSession(session) || codeScanState.phase !== 'live') return;
		if(revision === codeScanState.cropRevision) logCodeScanStep('Frame processing failed');
		codeScanState.processing = false;
		resetCodeScanMatchState();
		clearCodeScanCandidateHighlight();
		if(codeScanState.active && codeScanState.phase === 'live' && !codeScanState.hasCaptured)
			scheduleCodeScanFrame();
	});
}

function makeCodeScanSceneCheck(video, frame) {
	var checkedTime = video.currentTime;
	var context;
	var original;
	function sample(source, x, y, width, height) {
		context.drawImage(source, x, y, width, height, 0, 0, 48, 32);
		return context.getImageData(0, 0, 48, 32).data;
	}
	return function() {
		if(video.readyState < 2 || video.currentTime === checkedTime) return false;
		checkedTime = video.currentTime;
		var rect = getCodeScanVideoSourceRect(video);
		if(!rect.sw || !rect.sh) return false;
		if(rect.sw !== frame.width || rect.sh !== frame.height) return true;
		try {
			if(!context) {
				var thumbnail = document.createElement('canvas');
				thumbnail.width = 48;
				thumbnail.height = 32;
				context = thumbnail.getContext('2d', { willReadFrequently: true });
				original = sample(frame, 0, 0, frame.width, frame.height);
			}
			var current = sample(video, rect.sx, rect.sy, rect.sw, rect.sh);
			var changed = 0;
			for(var index = 0; index < current.length; index += 4) {
				var red = current[index] - original[index];
				var green = current[index + 1] - original[index + 1];
				var blue = current[index + 2] - original[index + 2];
				if(Math.abs(red * 2 + green * 5 + blue) >= 24 * 8) changed++;
			}
			// Ignore small changes from sensor noise or normal hand movement.
			return changed >= 48 * 32 * 0.12;
		} catch(error) {
			// Sampling is optional. Keep the original recovery path if it fails.
			context = null;
			return false;
		}
	};
}

function getCodeScanVideoSourceRect(video, viewport) {
	viewport = viewport || document.querySelector('.code_scan_viewport');
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

function saveCodeScanSourceFromCanvas(canvas, forceOriginal) {
	if(!canvas || !canvas.width || !canvas.height)
		return;
	var copy = document.createElement('canvas');
	copy.width = canvas.width;
	copy.height = canvas.height;
	copy.getContext('2d').drawImage(canvas, 0, 0);
	codeScanState.sourceCanvas = copy;
	if(forceOriginal || !codeScanState.originalSourceCanvas) codeScanState.originalSourceCanvas = copy;
}

function detectCodeScanContainers(canvas, bounds, search) {
	// Detection uses a bounded working image; preview and OCR keep native pixels.
	var scale = Math.min(1, 1200 / Math.max(canvas.width, canvas.height));
	var x0 = bounds ? bounds.x0 : 0;
	var y0 = bounds ? bounds.y0 : 0;
	var width = bounds ? bounds.x1 - x0 : canvas.width;
	var height = bounds ? bounds.y1 - y0 : canvas.height;
	var detectionCanvas = canvas;
	if(bounds || scale < 1) {
		detectionCanvas = document.createElement('canvas');
		detectionCanvas.width = Math.max(1, Math.round(width * scale));
		detectionCanvas.height = Math.max(1, Math.round(height * scale));
		var ctx = detectionCanvas.getContext('2d');
		if(bounds) ctx.drawImage(canvas, x0, y0, width, height, 0, 0, detectionCanvas.width, detectionCanvas.height);
		else ctx.drawImage(canvas, 0, 0, detectionCanvas.width, detectionCanvas.height);
	}
	var image = detectionCanvas.getContext('2d').getImageData(0, 0, detectionCanvas.width, detectionCanvas.height);
	var sx = width / detectionCanvas.width;
	var sy = height / detectionCanvas.height;
	function toSource(boxes) {
		return boxes.map(function(box) {
			return Object.assign({}, box, { x0: x0 + box.x0 * sx, y0: y0 + box.y0 * sy, x1: x0 + box.x1 * sx, y1: y0 + box.y1 * sy });
		});
	}
	if(search) {
		var focus = search.focus || { x: canvas.width / 2, y: canvas.height / 2 };
		var result = codeScanOcrMatch.detectLabelRegions(image, detectionCanvas.width, detectionCanvas.height,
			{ x: (focus.x - x0) / sx, y: (focus.y - y0) / sy });
		if(result.searchFullImage) search.findRemaining = function() { return toSource(result.searchFullImage()); };
		search.perspectiveSeeds = toSource(result.perspectiveSeeds || []);
		search.findCorners = function(box) {
			var corners = codeScanOcrMatch.findLabelQuadrilateral(image, {
				x0: (box.x0 - x0) / sx, y0: (box.y0 - y0) / sy,
				x1: (box.x1 - x0) / sx, y1: (box.y1 - y0) / sy
			});
			return corners && corners.map(function(point) { return { x: x0 + point.x * sx, y: y0 + point.y * sy }; });
		};
		return toSource(result.rectangles);
	}
	return toSource(codeScanOcrMatch.detectLabelRectangles(image, detectionCanvas.width, detectionCanvas.height));
}

function detectCodeScanConfirmation(canvas, live) {
	if(!live || !live.previousBox || !live.previousCard) return null;
	var card = live.previousCard;
	// Leave room for hand motion and for the detector to see the edge against its background.
	var padX = Math.max(4, (card.x1 - card.x0) * 0.15);
	var padY = Math.max(4, (card.y1 - card.y0) * 0.15);
	var bounds = {
		x0: Math.max(0, Math.floor(card.x0 - padX)), y0: Math.max(0, Math.floor(card.y0 - padY)),
		x1: Math.min(canvas.width, Math.ceil(card.x1 + padX)), y1: Math.min(canvas.height, Math.ceil(card.y1 + padY))
	};
	var width = bounds.x1 - bounds.x0;
	var height = bounds.y1 - bounds.y0;
	if(width <= 0 || height <= 0 || width * height > canvas.width * canvas.height / 2) return null;
	logCodeScanStep('Checking previous card region');
	var containers = detectCodeScanContainers(canvas, bounds);
	var box = codeScanOcrMatch.getLabelCodeBoxes(containers).find(function(candidate) {
		return candidate.x1 - candidate.x0 >= 1.2 * (candidate.y1 - candidate.y0) &&
			codeScanOcrMatch.bboxIoU(candidate, live.previousBox) >= CODE_SCAN_BBOX_IOU_MIN;
	});
	var currentCard = box && codeScanOcrMatch.findLabelCard(containers, box);
	return currentCard ? [box, currentCard] : null;
}

function getCodeScanLabelRoll(canvas) {
	var scale = Math.min(1, 480 / Math.max(canvas.width, canvas.height));
	var working = document.createElement('canvas');
	working.width = Math.max(1, Math.round(canvas.width * scale));
	working.height = Math.max(1, Math.round(canvas.height * scale));
	var ctx = working.getContext('2d', { willReadFrequently: true });
	ctx.drawImage(canvas, 0, 0, working.width, working.height);
	return codeScanOcrMatch.estimateLabelRoll(ctx.getImageData(0, 0, working.width, working.height), working.width, working.height);
}

function getCodeScanRollTransform(width, height, angle) {
	var radians = angle * Math.PI / 180;
	var cos = Math.cos(radians);
	var sin = Math.sin(radians);
	var boundsWidth = Math.abs(width * cos) + Math.abs(height * sin);
	var boundsHeight = Math.abs(width * sin) + Math.abs(height * cos);
	// A temporary straightened photo can cover more pixels than its original.
	var scale = Math.min(1, 4096 / Math.max(boundsWidth, boundsHeight), Math.sqrt(8000000 / (boundsWidth * boundsHeight)));
	var rotatedWidth = Math.ceil(boundsWidth * scale);
	var rotatedHeight = Math.ceil(boundsHeight * scale);
	function mapPoint(point, inverse) {
		var fromWidth = inverse ? rotatedWidth : width;
		var fromHeight = inverse ? rotatedHeight : height;
		var toWidth = inverse ? width : rotatedWidth;
		var toHeight = inverse ? height : rotatedHeight;
		var sine = inverse ? -sin : sin;
		var factor = inverse ? 1 / scale : scale;
		var x = (point.x - fromWidth / 2) * factor;
		var y = (point.y - fromHeight / 2) * factor;
		return { x: toWidth / 2 + x * cos - y * sine, y: toHeight / 2 + x * sine + y * cos };
	}
	return {
		point: mapPoint,
		image: function(source) {
			var image = document.createElement('canvas');
			image.width = rotatedWidth;
			image.height = rotatedHeight;
			var ctx = image.getContext('2d');
			ctx.fillStyle = '#fff';
			ctx.fillRect(0, 0, rotatedWidth, rotatedHeight);
			ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
			ctx.rotate(radians);
			ctx.drawImage(source, -width * scale / 2, -height * scale / 2, width * scale, height * scale);
			return image;
		},
		box: function(box) {
			if(!box) return box;
			var corners = [mapPoint({ x: box.x0, y: box.y0 }, true), mapPoint({ x: box.x1, y: box.y0 }, true),
				mapPoint({ x: box.x1, y: box.y1 }, true), mapPoint({ x: box.x0, y: box.y1 }, true)];
			return Object.assign({}, box, {
				x0: Math.max(0, Math.min.apply(null, corners.map(function(point) { return point.x; }))),
				y0: Math.max(0, Math.min.apply(null, corners.map(function(point) { return point.y; }))),
				x1: Math.min(width, Math.max.apply(null, corners.map(function(point) { return point.x; }))),
				y1: Math.min(height, Math.max.apply(null, corners.map(function(point) { return point.y; })))
			});
		}
	};
}

function restoreCodeScanRollMatch(match, transform, angle) {
	var regions = {};
	Object.keys(match.regions).forEach(function(key) { regions[key] = transform.box(match.regions[key]); });
	return Object.assign({}, match, { regions: regions, roll: { angle: angle, match: match } });
}

function getCodeScanPerspectiveTransform(canvas, corners) {
	var project = codeScanOcrMatch.labelPerspectiveProjector(corners);
	if(!project) return null;
	function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
	var width = Math.max(distance(corners[0], corners[1]), distance(corners[3], corners[2]));
	var height = Math.max(distance(corners[0], corners[3]), distance(corners[1], corners[2]));
	var scale = Math.min(1, 1600 / Math.max(width, height));
	width = Math.round(width * scale);
	height = Math.round(height * scale);
	var padding = 8;
	function point(x, y) { return project((x - padding) / width, (y - padding) / height); }
	return {
		box: function(box) {
			if(!box) return box;
			var points = [point(box.x0, box.y0), point(box.x1, box.y0), point(box.x1, box.y1), point(box.x0, box.y1)];
			var xs = points.map(function(p) { return p.x; });
			var ys = points.map(function(p) { return p.y; });
			return Object.assign({}, box, {
				x0: Math.max(0, Math.min.apply(null, xs)), y0: Math.max(0, Math.min.apply(null, ys)),
				x1: Math.min(canvas.width, Math.max.apply(null, xs)), y1: Math.min(canvas.height, Math.max.apply(null, ys))
			});
		},
		image: function() {
			var target = document.createElement('canvas');
			target.width = width + 2 * padding;
			target.height = height + 2 * padding;
			var ctx = target.getContext('2d');
			var output = ctx.createImageData(target.width, target.height);
			var bounds = this.box({ x0: 0, y0: 0, x1: target.width, y1: target.height });
			var left = Math.floor(bounds.x0), topRow = Math.floor(bounds.y0);
			var sourceWidth = Math.ceil(bounds.x1) - left;
			var sourceHeight = Math.ceil(bounds.y1) - topRow;
			var source = canvas.getContext('2d').getImageData(left, topRow, sourceWidth, sourceHeight).data;
			output.data.fill(255);
			for(var y = 0; y < target.height; y++) {
				for(var x = 0; x < target.width; x++) {
					var p = point(x, y);
					var sx = Math.floor(p.x) - left, sy = Math.floor(p.y) - topRow;
					if(sx < 0 || sy < 0 || sx + 1 >= sourceWidth || sy + 1 >= sourceHeight) continue;
					var dx = p.x - (sx + left), dy = p.y - (sy + topRow);
					var top = (sy * sourceWidth + sx) * 4;
					var bottom = top + sourceWidth * 4;
					var index = (y * target.width + x) * 4;
					for(var channel = 0; channel < 3; channel++) {
						var upper = source[top + channel] * (1 - dx) + source[top + channel + 4] * dx;
						var lower = source[bottom + channel] * (1 - dx) + source[bottom + channel + 4] * dx;
						output.data[index + channel] = upper * (1 - dy) + lower * dy;
					}
				}
			}
			ctx.putImageData(output, 0, 0);
			return target;
		}
	};
}

function restoreCodeScanPerspectiveMatch(match, transform, corners, wholeCard) {
	var regions = {};
	Object.keys(match.regions).forEach(function(key) { regions[key] = transform.box(match.regions[key]); });
	return Object.assign({}, match, { regions: regions, perspective: wholeCard ? { corners: corners, match: match } : null });
}

async function tryCodeScanPerspective(canvas, focus, options, worker, search, result) {
	if(!search.findCorners) return null;
	var live = options && options.live;
	var codeBox = result.data.codeBoxes[0];
	var card = codeBox && codeScanOcrMatch.findLabelCard(result.data.labelContainers, codeBox);
	focus = focus || { x: canvas.width / 2, y: canvas.height / 2 };
	var seeds = search.perspectiveSeeds || [];
	card = card || codeScanOcrMatch.findPortraitCard(result.data.labelContainers, focus) || codeScanOcrMatch.findPortraitCard(seeds, focus);
	var codeSeed = codeScanOcrMatch.getLabelCodeBoxes(seeds, focus).find(function(box) {
		return box.x1 - box.x0 >= 1.2 * (box.y1 - box.y0) && focus.x >= box.x0 && focus.x <= box.x1 && focus.y >= box.y0 && focus.y <= box.y1;
	});
	for(var box of [card, codeBox || codeSeed]) {
		if(!box) continue;
		if(codeScanShouldYield(live)) return null;
		var corners = search.findCorners(box);
		if(!corners) continue;
		var transform = getCodeScanPerspectiveTransform(canvas, corners);
		if(!transform) continue;
		logCodeScanStep(box === card ? 'Correcting card perspective' : 'Correcting code frame perspective');
		var aligned = transform.image();
		var alignedOptions = Object.assign({}, options);
		if(live) alignedOptions.live = {
			isCurrent: live.isCurrent,
			shouldYield: live.shouldYield,
			showBoxes: function() {}
		};
		var corrected = await recognizeCodeScanImage(aligned, null, alignedOptions, worker, detectCodeScanContainers(aligned));
		if(!corrected.data.scanMatch) continue;
		result.data.scanMatch = restoreCodeScanPerspectiveMatch(corrected.data.scanMatch, transform, corners, box === card);
		result.data.debugBoxes = corrected.data.debugBoxes.map(transform.box);
		return result;
	}
	return null;
}

function codeScanShouldYield(live) {
	return live && (!live.isCurrent() || (live.shouldYield && live.shouldYield()));
}

function recognizeCodeScanCanvas(canvas, focus, options) {
	return runCodeScanWorkerTask(async function(worker) {
		var live = options && options.live;
		if(live && !live.isCurrent()) return { data: {} };
		if(!canvas || !canvas.width || !canvas.height) throw new Error('Empty scan image');
		var epoch = codeScanState.workerEpoch;
		var search = { focus: focus };
		var startedAt = codeScanState.debug ? performance.now() : undefined;
		var containers = detectCodeScanConfirmation(canvas, live);
		if(!containers) {
			logCodeScanStep('Detecting card and code regions');
			containers = detectCodeScanContainers(canvas, null, search);
		}
		logCodeScanStep('Detected card and code regions', startedAt);
		var result = await recognizeCodeScanImage(canvas, focus, options, worker, containers);
		if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
		if(result.data.scanMatch || codeScanShouldYield(live)) return result;
		if(search.findRemaining) {
			// The card crop missed in OCR. Try other code boxes using the same edge scan.
			logCodeScanStep('Searching for other code regions');
			var remaining = search.findRemaining();
			var tried = result.data.codeBoxes;
			var retry = remaining.filter(function(box) {
				return !tried.some(function(previous) { return codeScanOcrMatch.bboxIoU(previous, box) > 0.9; });
			});
			var fallback = await recognizeCodeScanImage(canvas, focus, options, worker, retry, remaining);
			if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
			if(fallback.data.scanMatch) return fallback;
			if(codeScanShouldYield(live)) return result;
			if(!result.data.codeBoxes.length && fallback.data.codeBoxes.length) result = fallback;
		}
		var corrected = await tryCodeScanPerspective(canvas, focus, options, worker, search, result);
		if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
		if(corrected || codeScanShouldYield(live)) return result;
		var angle = -getCodeScanLabelRoll(canvas);
		if(!angle) return result;
		logCodeScanStep('Straightening tilted label');
		var transform = getCodeScanRollTransform(canvas.width, canvas.height, angle);
		var aligned = transform.image(canvas);
		var tiltedOptions = Object.assign({}, options);
		if(live) tiltedOptions.live = {
			isCurrent: live.isCurrent,
			shouldYield: live.shouldYield,
			showBoxes: function(boxes) { if(boxes.length) live.showBoxes(boxes.map(transform.box)); }
		};
		var alignedResult = await recognizeCodeScanImage(aligned, focus && transform.point(focus), tiltedOptions, worker, detectCodeScanContainers(aligned));
		var data = alignedResult.data;
		if(data.scanMatch) result.data.scanMatch = restoreCodeScanRollMatch(data.scanMatch, transform, angle);
		if(data.labelContainers.length && (data.scanMatch || !result.data.debugBoxes || !result.data.debugBoxes.length))
			result.data.labelContainers = data.labelContainers.map(transform.box);
		if(data.debugBoxes && data.debugBoxes.length) result.data.debugBoxes = data.debugBoxes.map(transform.box);
		return result;
	});
}

async function recognizeCodeScanImage(canvas, focus, options, worker, containers, allContainers) {
	var epoch = codeScanState.workerEpoch;
	var live = options && options.live;
	focus = focus || { x: canvas.width / 2, y: canvas.height / 2 };
	allContainers = allContainers || containers;
	var result = { data: { labelContainers: allContainers, scanFocus: focus } };
	var boxes = codeScanOcrMatch.getLabelCodeBoxes(allContainers, focus).filter(function(box) { return containers.includes(box); });
	if(live) {
		boxes = boxes.filter(function(box) {
			return box.x1 - box.x0 >= 1.2 * (box.y1 - box.y0);
		});
		var card = codeScanOcrMatch.findPortraitCard(allContainers, focus);
		if(card) {
			// Printed code boxes are usually centered on the card. The viewfinder
			// center can land on an address row or other graphics on the same card.
			var distanceFromCardCenter = function(box) {
				if(!codeScanOcrMatch.findLabelCard([card], box)) return Infinity;
				return Math.hypot(box.x0 + box.x1 - card.x0 - card.x1, box.y0 + box.y1 - card.y0 - card.y1);
			};
			boxes.sort(function(a, b) { return distanceFromCardCenter(a) - distanceFromCardCenter(b); });
		}
		if(live.previousBox) {
			// Try the previously read region first on its confirmation frame.
			var overlap = function(box) {
				var iou = codeScanOcrMatch.bboxIoU(box, live.previousBox);
				return iou >= CODE_SCAN_BBOX_IOU_MIN ? iou : 0;
			};
			boxes.sort(function(a, b) { return overlap(b) - overlap(a); });
		}
		boxes = boxes.slice(0, 2);
		result.data.codeBoxes = boxes;
		result.data.debugBoxes = getCodeScanDebugBoxes(allContainers, boxes[0], focus);
		if(allContainers === containers && live.isCurrent()) live.showBoxes(result.data.debugBoxes);
		return recognizeCodeScanBoxes(canvas, result, worker, boxes, live);
	}
	boxes = boxes.filter(function(box) {
		var width = box.x1 - box.x0;
		var height = box.y1 - box.y0;
		return width > height;
	}).slice(0, 4);
	result.data.codeBoxes = boxes;
	result.data.debugBoxes = getCodeScanDebugBoxes(allContainers, boxes[0], focus);
	if(!boxes.length) return result;
	await recognizeCodeScanBoxes(canvas, result, worker, boxes);
	if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
	if(result.data.scanMatch) return result;
	// Keep both OCR modes on the smaller code crop before trying the card.
	await recognizeCodeScanBoxes(canvas, result, worker, boxes.slice(0, 2), null, '11');
	if(result.data.scanMatch) return result;
	return recognizeCodeScanBoxes(canvas, result, worker, boxes, null, '11', true);
}

function getCodeScanDebugBoxes(containers, box, focus) {
	var card = box && codeScanOcrMatch.findLabelCard(containers, box, box.y1 - box.y0 > box.x1 - box.x0);
	if(!card) card = codeScanOcrMatch.findPortraitCard(containers, focus);
	return card ? [box, card] : box ? [box] : [];
}

function rotateCodeScanCanvas(source, rotation) {
	var rotated = document.createElement('canvas');
	var sideways = rotation % 180 !== 0;
	rotated.width = sideways ? source.height : source.width;
	rotated.height = sideways ? source.width : source.height;
	var ctx = rotated.getContext('2d');
	ctx.translate(rotated.width / 2, rotated.height / 2);
	ctx.rotate(rotation * Math.PI / 180);
	ctx.drawImage(source, -source.width / 2, -source.height / 2);
	return rotated;
}

function rotateCodeScanMatch(match, canvas, rotation) {
	var regions = {};
	Object.keys(match.regions).forEach(function(key) {
		regions[key] = codeScanOcrMatch.rotateLabelBox(match.regions[key], canvas.width, canvas.height, rotation);
	});
	return Object.assign({}, match, { regions: regions });
}

async function recognizeCodeScanBoxes(canvas, result, worker, boxes, live, segmentation, useCardCrop) {
	var data = result.data;
	var epoch = codeScanState.workerEpoch;
	for(var box of boxes) {
		if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
		if(live && !live.isCurrent()) break;
		var card = codeScanOcrMatch.findLabelCard(data.labelContainers, box);
		if(useCardCrop && !card) continue;
		var inset = Math.max(2, Math.round((box.y1 - box.y0) * 0.06));
		var crop = useCardCrop ? card : {
			x0: box.x0 + inset, y0: box.y0 + inset, x1: box.x1 - inset, y1: box.y1 - inset
		};
		var startedAt = codeScanState.debug ? performance.now() : undefined;
		var words = await ocrCodeScanBand(canvas, crop, worker, useCardCrop ? 1600 : live ? 240 : 480, 0, segmentation);
		if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
		if(live && !live.isCurrent()) break;
		var mode = useCardCrop ? 'card crop' : segmentation === '11' ? 'sparse code text' : 'code box';
		logCodeScanStep('OCR read ' + mode, startedAt);
		var match = extractMatchFromOcrResult({ data: { words: words, labelContainers: card ? [box, card] : [box] } });
		if(!match || match.regions.container !== box) {
			if(codeScanShouldYield(live)) break;
			continue;
		}
		data.scanMatch = match;
		break;
	}
	return result;
}

function extractMatchFromOcrResult(result) {
	if(result && result.data && result.data.scanMatch) return result.data.scanMatch;
	return codeScanOcrMatch.matchOcrRegionsToWoloCode(result, wordList.includes.bind(wordList), wordList.curList);
}

function detailBandScale(height) {
	return height < 100 ? 4 : 3;
}

async function ocrCodeScanBand(canvas, band, worker, maxHeight, rotation, segmentation) {
	worker = worker || codeScanState.worker;
	var epoch = codeScanState.workerEpoch;
	var session = codeScanState.session;
	var sideways = rotation % 180 === 90;
	var imageWidth = sideways ? canvas.height : canvas.width;
	var imageHeight = sideways ? canvas.width : canvas.height;
	var x0 = Math.max(0, Math.round(band.x0));
	var y0 = Math.max(0, Math.round(band.y0));
	var x1 = Math.min(imageWidth || 0, Math.round(band.x1));
	var y1 = Math.min(imageHeight || 0, Math.round(band.y1));
	var width = x1 - x0;
	var height = y1 - y0;
	var scale;
	var target;
	var ctx;
	if(!Number.isFinite(width) || !Number.isFinite(height) || width < 20 || height < 12 || !worker) return [];
	scale = Math.min(detailBandScale(height), 4096 / Math.max(width, height), Math.sqrt(4000000 / (width * height)));
	if(maxHeight) scale = Math.min(scale, maxHeight / height, 1200 / width);
	target = document.createElement('canvas');
	target.width = Math.round(width * scale);
	target.height = Math.round(height * scale);
	var sx = target.width / width;
	var sy = target.height / height;
	ctx = target.getContext('2d');
	if(!ctx) return [];
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, target.width, target.height);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';
	if(rotation) {
		var source = codeScanOcrMatch.rotateLabelBox({ x0: x0, y0: y0, x1: x1, y1: y1 }, imageWidth, imageHeight, 360 - rotation);
		var targetWidth = sideways ? target.height : target.width;
		var targetHeight = sideways ? target.width : target.height;
		ctx.translate(target.width / 2, target.height / 2);
		ctx.rotate(rotation * Math.PI / 180);
		ctx.drawImage(canvas, source.x0, source.y0, source.x1 - source.x0, source.y1 - source.y0,
			-targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight);
	}
	else ctx.drawImage(canvas, x0, y0, width, height, 0, 0, target.width, target.height);
	// Check cancellation after encoding, before Tesseract sends work to its worker.
	var input = target;
	if(target.toBlob) {
		var blob = await new Promise(function(resolve) { target.toBlob(resolve); });
		if(!blob) throw new Error('Could not encode scanner image');
		input = new Uint8Array(await blob.arrayBuffer());
	}
	if(epoch !== codeScanState.workerEpoch || session !== codeScanState.session) throw codeScanCancelledError();
	var result = await worker.recognize(input, { tessedit_pageseg_mode: segmentation || '6' }, { text: false, hocr: false, tsv: false });
	if(epoch !== codeScanState.workerEpoch || session !== codeScanState.session) throw codeScanCancelledError();
	if(!result || typeof result !== 'object') throw new Error('Invalid scanner result');
	var words = result.data && result.data.words || [];
	return words.map(function(word) {
		var box = word && word.bbox;
		if(!box) return null;
		return {
			text: word.text,
			confidence: word.confidence,
			bbox: {
				x0: x0 + box.x0 / sx,
				y0: y0 + box.y0 / sy,
				x1: x0 + box.x1 / sx,
				y1: y0 + box.y1 / sy
			}
		};
	}).filter(Boolean);
}

function headingRowCount(words, match) {
	var read = codeScanOcrMatch.readLabelMetadata(words, match.regions.container, match.regions.card);
	return (read.metadata.title ? 1 : 0) + (read.metadata.segment ? 1 : 0);
}

function addressLineCount(words, match) {
	var read = codeScanOcrMatch.readLabelMetadata(words, match.regions.container, match.regions.card);
	return (read.metadata.address_line_1 ? 1 : 0) + (read.metadata.address_line_2 ? 1 : 0);
}

function enrichCodeScanMetadata(canvas, match) {
	if(canvas && match && match.perspective) {
		var perspective = match.perspective;
		var correction = getCodeScanPerspectiveTransform(canvas, perspective.corners);
		var rectified = Object.assign({}, perspective.match, {
			regions: Object.assign({}, perspective.match.regions), metadata: Object.assign({}, match.metadata)
		});
		return enrichCodeScanMetadata(correction.image(), rectified).then(function(detailed) {
			return restoreCodeScanPerspectiveMatch(detailed, correction, perspective.corners, true);
		});
	}
	if(canvas && match && match.roll) {
		var angle = match.roll.angle;
		var transform = getCodeScanRollTransform(canvas.width, canvas.height, angle);
		var aligned = Object.assign({}, match.roll.match, {
			regions: Object.assign({}, match.roll.match.regions), metadata: Object.assign({}, match.metadata)
		});
		return enrichCodeScanMetadata(transform.image(canvas), aligned).then(function(detailed) {
			return restoreCodeScanRollMatch(detailed, transform, angle);
		});
	}
	if(match && match.rotation) {
		var rotation = match.rotation;
		var rotated = rotateCodeScanCanvas(canvas, rotation);
		var upright = rotateCodeScanMatch(match, canvas, rotation);
		upright.rotation = 0;
		return enrichCodeScanMetadata(rotated, upright).then(function(detailed) {
			var restored = rotateCodeScanMatch(detailed, rotated, 360 - rotation);
			restored.rotation = rotation;
			return restored;
		});
	}
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
	if(!codeScanState.worker || typeof codeScanState.worker.recognize !== 'function') return Promise.resolve(finish(match));
	if(CODE_SCAN_METADATA_KEYS.every(function(key) { return match.metadata && match.metadata[key]; })) return Promise.resolve(finish(match));
	bands = codeScanOcrMatch.detailScanBands(match.regions.container, match.regions.card);
	if(!bands.length) return Promise.resolve(finish(match));
	extra = [];
	headingRows = 0;
	addressRows = 0;
	var epoch = codeScanState.workerEpoch;
	return runCodeScanWorkerTask(function(worker) {
		var chain = Promise.resolve();
		bands.forEach(function(band) {
			chain = chain.then(function() {
				if(epoch !== codeScanState.workerEpoch) throw codeScanCancelledError();
				if(band.role === 'above' && headingRows >= 2) return;
				if(band.role === 'below' && addressRows >= 2) return;
				return ocrCodeScanBand(canvas, band, worker).then(function(words) {
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

function handleCodeScanLiveOcrResult(result, frame) {
	var match = extractMatchFromOcrResult(result);
	var boxes = result.data && result.data.debugBoxes || [];
	var previous = codeScanState.recognizedFrame;
	if(!match || !match.regions.container) {
		logCodeScanStep('No Wolo Code match in this frame');
		// One soft or blurred frame should not erase a recent read.
		if(previous && !codeScanState.missedMatchFrame) {
			codeScanState.missedMatchFrame = true;
			return;
		}
		setCodeScanStatus(getCodeScanInitialStatus());
		resetCodeScanMatchState();
		if(codeScanState.showRegions) drawCodeScanMatchRegions(null, frame, boxes);
		setCodeScanWoloFoundCue(false);
		return;
	}
	var current = { match: match, frame: frame };
	codeScanState.recognizedFrame = current;
	codeScanState.missedMatchFrame = false;
	drawCodeScanMatchRegions(match, frame, boxes);
	setCodeScanWoloFoundCue(true);
	setCodeScanStatus('Wolo Code found');
	var words = match.words.slice(-3).join(' ');
	var sameLabel = previous && previous.match.words.slice(-3).join(' ') === words &&
		codeScanOcrMatch.bboxIoU(previous.match.regions.container, match.regions.container) >= CODE_SCAN_BBOX_IOU_MIN;
	codeScanState.stableMatchCount = sameLabel ? codeScanState.stableMatchCount + 1 : 1;
	logCodeScanStep(match.highConfidence || codeScanState.stableMatchCount >= CODE_SCAN_STABLE_MATCHES ?
		'Confirmed Wolo Code' : 'Candidate found. Checking next frame');
	if(match.highConfidence) captureCodeScanDetection();
	else if(codeScanState.stableMatchCount >= CODE_SCAN_STABLE_MATCHES) {
		if(previous.match.highConfidence || (!match.cityWordCount && previous.match.cityWordCount))
			codeScanState.recognizedFrame = previous;
		else if(previous.match.cityWordCount && match.cityWordCount && previous.match.code !== match.code) {
			current.match = Object.assign({}, match, {
				words: match.words.slice(-3), code: words, cityWordCount: 0,
				regions: Object.assign({}, match.regions, { city: null })
			});
		}
		captureCodeScanDetection();
	}
}

function captureCodeScanDetection() {
	var detected = codeScanState.recognizedFrame;
	if(!detected || !codeScanState.active || codeScanState.phase !== 'live' || codeScanState.hasCaptured) return;
	var canvas = getCodeScanCanvas();
	if(!canvas) return;
	var frame = detected.frame;
	var match = detected.match;
	canvas.width = frame.width;
	canvas.height = frame.height;
	canvas.getContext('2d').drawImage(frame, 0, 0);
	resetCodeScanMatchState();
	resetCodeScanLiveZoom();
	saveCodeScanSourceFromCanvas(canvas, true);
	resetCodeScanZoom(true);
	beginCodeScanCapture(match);
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
	return true;
}

function beginCodeScanCapture(detectedMatch) {
	clearCodeScanTimer();
	codeScanState.hasCaptured = true;
	setCodeScanLiveControlsVisible(false);
	setCodeScanPhotoFallbackVisible(false);
	setCodeScanWoloFoundCue(false);
	stopCodeScanCamera();
	setCodeScanFrozenPreview(true);
	setCodeScanCropControlsVisible(true);
	showCodeScanReview(detectedMatch);
	fillCodeScanReviewDetails(detectedMatch);
}

function fillCodeScanReviewDetails(match, cropRead) {
	if(!match.regions || !match.regions.container) return;
	var session = codeScanState.session;
	var revision = codeScanState.cropRevision;
	var source = cropRead ? cropRead.image : codeScanState.originalSourceCanvas || getCodeScanCanvas();
	if(!source || CODE_SCAN_METADATA_KEYS.every(function(key) { return match.metadata && match.metadata[key]; })) return;
	var localMatch = cropRead ? cropRead.match : match;
	var details = Object.assign({}, localMatch, { regions: Object.assign({}, localMatch.regions), metadata: Object.assign({}, match.metadata) });
	function ownsFields() {
		return isCurrentCodeScanSession(session) && codeScanState.reviewMatch === match;
	}
	setCodeScanDetailsLoading(true);
	Promise.resolve().then(function() {
		if(ownsFields() && revision === codeScanState.cropRevision) return enrichCodeScanMetadata(source, details);
	}).then(function(detailed) {
		if(!ownsFields()) return;
		setCodeScanDetailsLoading(false);
		if(!detailed || revision !== codeScanState.cropRevision) return;
		if(cropRead) detailed = offsetCodeScanReviewMatch(detailed, cropRead.x, cropRead.y);
		populateCodeScanMetadata(detailed);
		codeScanState.reviewMatch = detailed;
	}).catch(function() {
		if(ownsFields()) setCodeScanDetailsLoading(false);
	});
}

function showCodeScanReview(match, manualEntry) {
	if(!manualEntry) logCodeScanStep(match ? 'Wolo Code ready for review' : 'No Wolo Code read. Review manually');
	codeScanState.debugPaused = true;
	setCodeScanDetailsLoading(false);
	setCodeScanPreviewFrameVisible(false);
	populateCodeScanMetadata(match);
	codeScanState.reviewMatch = match;
	var review = codeScanOcrMatch.splitMatchForReview(match);
	setCodeScanPhase('review');
	setCodeScanManualEntry(!!manualEntry);
	setCodeScanReviewVisible(true);
	setCodeScanLiveControlsVisible(false);
	setCodeScanPhotoFallbackVisible(false);
	setCodeScanViewportVisible(!manualEntry);
	setCodeScanFrozenPreview(!manualEntry);
	setCodeScanCropControlsVisible(true);
	populateCodeScanReviewFields(review.city, review.words[0], review.words[1], review.words[2]);
	populateCodeScanCityChoices(review.city);
	updateCodeScanReviewValidity();
	drawCodeScanMatchRegions(match, getCodeScanCanvas(), match ? [] : codeScanState.regionBoxes);
	setCodeScanStatus(manualEntry || !match ? '' : 'Please verify the code below');
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

function setCodeScanDetailsLoading(loading) {
	CODE_SCAN_METADATA_KEYS.forEach(function(key) {
		var field = document.getElementById('code_scan_' + key);
		if(field) field.setAttribute('aria-busy', String(loading && !field.value && !codeScanState.metadataDirty[key]));
	});
}

function resetCodeScanDetails() {
	codeScanState.saveRevision += 1;
	codeScanState.saving = false;
	codeScanState.reviewMetadata = null;
	codeScanState.metadataDirty = {};
	CODE_SCAN_METADATA_KEYS.forEach(function(key) {
		var field = document.getElementById('code_scan_' + key);
		if(field) field.value = '';
	});
	setCodeScanDetailsExpanded(false);
}

function populateCodeScanMetadata(match) {
	var previous = codeScanState.reviewMatch;
	var same = match && previous && match.code === previous.code && match.regions && previous.regions &&
		codeScanOcrMatch.bboxIoU(match.regions.container, previous.regions.container) >= 0.55;
	if(!same) resetCodeScanDetails();
	var metadata = {};
	CODE_SCAN_METADATA_KEYS.forEach(function(key) {
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
	var field = document.getElementById('code_scan_' + key);
	if(field) field.setAttribute('aria-busy', 'false');
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
		setCodeScanStatus('Enter three valid Wolo words from the list.');
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
	CODE_SCAN_METADATA_KEYS.forEach(function(key) {
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
		setCodeScanStatus('Title is required');
		return;
	}
	var parts = code.split(' ');
	var words = parts.slice(-3);
	var cityParts = parts.slice(0, -3);
	var revision = ++codeScanState.saveRevision;
	var session = codeScanState.session;
	codeScanState.saving = true;
	updateCodeScanReviewValidity();
	setCodeScanStatus('Saving address...');
	function notify(message) {
		if(isCurrentCodeScanSession(session) && revision === codeScanState.saveRevision) {
			codeScanState.saving = false;
			updateCodeScanReviewValidity();
			if(isCodeScanVisible()) {
				setCodeScanStatus(message);
				return;
			}
		}
		showNotification(message);
	}
	function resolved(city) {
		if(!codeScanState.active || revision !== codeScanState.saveRevision) return;
		if(!city || city.id == null) {
			notify('Choose a recognized city before saving');
			return;
		}
		var dialog = document.getElementById('code_scan_message');
		if(dialog && dialog.classList.contains('hide')) showOverlay(dialog);
		saveAddress(metadata.title, metadata.segment, metadata, undefined, { city: city, code: words }, notify);
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
	codeScanState.debugPaused = false;
	logCodeScanStep('Restarting scan');
	invalidateCodeScanSession();
	codeScanState.hasCaptured = false;
	resetCodeScanMatchState();
	resetCodeScanUi();
	setCodeScanPhotoFallbackVisible(true);
	if(codeScanOcrMatch.isCodeScanSupported()) {
		setCodeScanStatus('Requesting camera...');
		setCodeScanPreviewFrameVisible(true);
		startCodeScanCamera();
		return;
	}
	setCodeScanViewportVisible(codeScanState.debug);
	logCodeScanStep('Live camera unsupported');
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
	if((file.type && file.type.indexOf('image/') !== 0) || file.size > 40000000) {
		setCodeScanStatus('Choose an image smaller than 40 MB.');
		return;
	}
	// Reuse a preloading or idle worker. Cancel any OCR already in flight.
	invalidateCodeScanSession(!codeScanState.hasCaptured && (!codeScanState.processing || !codeScanState.worker));
	var session = codeScanState.session;
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
	setCodeScanStatus('Reading photo on your device...');
	logCodeScanStep('Decoding gallery photo');
	prepareCodeScanWorker().catch(function() {});
	recognizeCodeScanPhoto(file).then(function(result) {
		if(!isCurrentCodeScanSession(session)) return;
		codeScanState.processing = false;
		var match = extractMatchFromOcrResult(result);
		codeScanState.regionBoxes = result.data && result.data.debugBoxes || [];
		showCodeScanReview(match);
		if(match) fillCodeScanReviewDetails(match);
		else setCodeScanStatus('Could not read the code box. Try another photo or edit the words.');
	}).catch(function() {
		if(!isCurrentCodeScanSession(session)) return;
		codeScanState.processing = false;
		codeScanState.hasCaptured = false;
		if(codeScanState.active) {
			setCodeScanFrozenPreview(false);
			setCodeScanViewportVisible(codeScanState.debug);
			logCodeScanStep('Gallery photo recognition failed');
			setCodeScanCropControlsVisible(false);
			setCodeScanPhase('live');
			setCodeScanLiveControlsVisible(true);
			setCodeScanPhotoFallbackVisible(true);
			setCodeScanStatus('Could not read that photo. Try another shot or type the code.');
		}
	});
}

function recognizeCodeScanPhoto(file) {
	var session = codeScanState.session;
	var finished = false;
	var reader;
	var image;
	var objectUrl;
	function releaseImage() {
		if(image) image.onload = image.onerror = null;
		image = null;
		if(objectUrl) window.URL.revokeObjectURL(objectUrl);
		objectUrl = null;
	}
	var reading = new Promise(function(resolve, reject) {
		image = new Image();
		image.onload = function() {
			try {
				if(finished || !isCurrentCodeScanSession(session)) throw codeScanCancelledError();
				var canvas = getCodeScanCanvas();
				var width;
				var height;
				if(!canvas) {
					reject(new Error('Missing scan canvas'));
					return;
				}
				width = image.naturalWidth || image.width;
				height = image.naturalHeight || image.height;
				if(!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || width * height > CODE_SCAN_MAX_PHOTO_PIXELS || Math.max(width, height) > 16384) {
					reject(new Error('Invalid photo dimensions'));
					return;
				}
				canvas.width = width;
				canvas.height = height;
				canvas.getContext('2d').drawImage(image, 0, 0, width, height);
				releaseImage();
				saveCodeScanSourceFromCanvas(canvas, true);
				resetCodeScanZoom(true);
				setCodeScanViewportVisible(true);
				setCodeScanFrozenPreview(true);
				setCodeScanCropControlsVisible(true);
				recognizeCodeScanCanvas(canvas).then(resolve, reject);
			} catch(error) { reject(error); }
		};
		image.onerror = reject;
		if(window.URL && typeof window.URL.createObjectURL === 'function' && typeof window.URL.revokeObjectURL === 'function') {
			objectUrl = window.URL.createObjectURL(file);
			image.src = objectUrl;
			return;
		}
		reader = new FileReader();
		reader.onload = function() {
			if(finished || !isCurrentCodeScanSession(session)) { reject(codeScanCancelledError()); return; }
			image.src = reader.result;
		};
		reader.onerror = reject;
		reader.onabort = function() { reject(codeScanCancelledError()); };
		reader.readAsDataURL(file);
	});
	function cleanup() {
		finished = true;
		if(reader) {
			reader.onload = reader.onerror = reader.onabort = null;
			if(reader.readyState === 1) reader.abort();
		}
		releaseImage();
	}
	return waitForCodeScanWorker(reading, CODE_SCAN_LOAD_TIMEOUT_MS + CODE_SCAN_OCR_TIMEOUT_MS).then(function(result) {
		cleanup();
		return result;
	}, function(error) { cleanup(); throw error; });
}

function setCodeScanCandidateHighlight(bbox, canvas, id, padded, element) {
	var highlight = element || document.getElementById(id || 'code_scan_candidate_highlight');
	var viewport = document.querySelector('.code_scan_viewport');
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

function drawCodeScanMatchRegions(match, canvas, boxes) {
	codeScanState.regionMatch = match;
	codeScanState.regionCanvas = canvas;
	codeScanState.regionBoxes = boxes || [];
	clearCodeScanCandidateHighlight();
	if(!codeScanState.showRegions || !canvas) return;
	var detected = document.getElementById('code_scan_detected_boxes');
	var card = match && match.regions ? match.regions.card : codeScanState.regionBoxes[1];
	if(card) setCodeScanCandidateHighlight(card, canvas, 'code_scan_card_highlight', false);
	if(!match || !match.regions) {
		var box = codeScanState.regionBoxes[0];
		if(detected && box) {
			var outline = document.createElement('div');
			outline.className = 'code_scan_candidate_highlight code_scan_detected_box';
			setCodeScanCandidateHighlight(box, canvas, null, false, outline);
			detected.appendChild(outline);
		}
		return;
	}
	setCodeScanCandidateHighlight(match.regions.container, canvas, 'code_scan_container_highlight', false);
	setCodeScanCandidateHighlight(match.regions.code, canvas);
	if(match.regions.city) setCodeScanCandidateHighlight(match.regions.city, canvas, 'code_scan_city_highlight');
}

function redrawCodeScanReviewRegions() {
	if(codeScanState.active && codeScanState.hasCaptured && codeScanState.showRegions)
		drawCodeScanMatchRegions(codeScanState.regionMatch, getCodeScanCanvas(), codeScanState.regionBoxes);
}

function clearCodeScanCandidateHighlight() {
	var detected = document.getElementById('code_scan_detected_boxes');
	if(detected) detected.replaceChildren();
	['code_scan_card_highlight', 'code_scan_candidate_highlight', 'code_scan_container_highlight', 'code_scan_city_highlight'].forEach(function(id) {
		var highlight = document.getElementById(id);
		if(highlight) highlight.classList.add('hide');
	});
}

function setCodeScanRegionInspection(active) {
	codeScanState.showRegions = active;
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport) viewport.classList.toggle('code_scan_inspecting', active);
}

function setCodeScanWoloFoundCue(active) {
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport)
		viewport.classList.toggle('code_scan_wolo_found', !!active);
}

function setCodeScanPreviewFrameVisible(visible) {
	var frame = document.getElementById('code_scan_preview_frame');
	if(frame)
		frame.classList.toggle('hide', !visible);
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
	['code_scan_review', 'code_scan_review_actions'].forEach(function(id) {
		var node = document.getElementById(id);
		if(node) node.classList.toggle('hide', !visible);
	});
	var heading = document.getElementById('code_scan_heading');
	if(heading) heading.textContent = visible ? 'Edit label' : 'Scan Wolo Code';
}

function setCodeScanManualEntry(manualEntry) {
	var dialog = document.getElementById('code_scan_message');
	if(dialog) dialog.classList.toggle('code_scan_manual_entry', manualEntry);
}

function setCodeScanCropControlsVisible(visible) {
	['code_scan_crop_controls', 'code_scan_rescan'].forEach(function(id) {
		var node = document.getElementById(id);
		if(node) node.classList.toggle('hide', !visible);
	});
}

function clampCodeScanPan(canvas) {
	if(!canvas || !canvas.width || !canvas.height) return;
	var viewport = document.querySelector('.code_scan_viewport');
	if(!viewport) return;
	var scale = Math.min(canvas.clientWidth / canvas.width, canvas.clientHeight / canvas.height) * codeScanState.zoom;
	var maxPanX = Math.max(0, (canvas.width * scale - viewport.clientWidth) / 2);
	var maxPanY = Math.max(0, (canvas.height * scale - viewport.clientHeight) / 2);
	codeScanState.panX = Math.max(-maxPanX, Math.min(maxPanX, codeScanState.panX));
	codeScanState.panY = Math.max(-maxPanY, Math.min(maxPanY, codeScanState.panY));
}

function setCodeScanZoom(zoom, panX, panY) {
	var canvas = getCodeScanCanvas();
	var zoomLevelNode = document.getElementById('code_scan_zoom_level');
	var zoomPercentageNode = document.getElementById('code_scan_zoom_percentage');
	var clampedZoom = Math.max(1, Math.min(4, typeof zoom === 'number' ? zoom : 1));
	var previousZoom = codeScanState.zoom;
	var previousPanX = codeScanState.panX;
	var previousPanY = codeScanState.panY;
	codeScanState.zoom = Math.round(clampedZoom * 100) / 100;
	if(typeof panX === 'number')
		codeScanState.panX = panX;
	if(typeof panY === 'number')
		codeScanState.panY = panY;
	clampCodeScanPan(canvas);
	if(canvas)
		canvas.style.transform = 'translate(' + codeScanState.panX + 'px, ' + codeScanState.panY + 'px) scale(' + codeScanState.zoom + ')';
	if(zoomLevelNode) {
		var percentage = Math.round(codeScanState.zoom * 100) + '%';
		zoomLevelNode.setAttribute('aria-label', 'Zoom ' + percentage + '. Reset zoom');
		if(zoomPercentageNode)
			zoomPercentageNode.textContent = codeScanState.zoom === 1 ? '' : percentage;
	}

	if(previousZoom !== codeScanState.zoom || previousPanX !== codeScanState.panX || previousPanY !== codeScanState.panY)
		scheduleCodeScanCropRecognition();
	redrawCodeScanReviewRegions();
}

function scheduleCodeScanCropRecognition() {
	if(!codeScanState.active || !codeScanState.hasCaptured)
		return;
	codeScanState.cropRevision += 1;
	clearTimeout(codeScanState.cropScanTimer);
	codeScanState.cropScanTimer = setTimeout(function retry() {
		codeScanState.cropScanTimer = null;
		if(!codeScanState.active || !codeScanState.hasCaptured) return;
		if(codeScanState.phase === 'processing' || codeScanState.isDragging || codeScanState.touchStartDist > 0) {
			codeScanState.cropScanTimer = setTimeout(retry, 350);
			return;
		}
		applyCodeScanCrop();
	}, 350);
}

function resetCodeScanZoom(keepPreview) {
	var canvas = getCodeScanCanvas();
	if(!keepPreview && codeScanState.zoom === 1 && codeScanState.originalSourceCanvas && codeScanState.sourceCanvas !== codeScanState.originalSourceCanvas && canvas) {
		canvas.width = codeScanState.originalSourceCanvas.width;
		canvas.height = codeScanState.originalSourceCanvas.height;
		canvas.getContext('2d').drawImage(codeScanState.originalSourceCanvas, 0, 0);
		codeScanState.sourceCanvas = codeScanState.originalSourceCanvas;
	}
	else if(!keepPreview && codeScanState.sourceCanvas && canvas) {
		canvas.width = codeScanState.sourceCanvas.width;
		canvas.height = codeScanState.sourceCanvas.height;
		canvas.getContext('2d').drawImage(codeScanState.sourceCanvas, 0, 0);
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
	codeScanState.cropRevision += 1;
	var clampedZoom = Math.max(1, Math.min(4, typeof zoom === 'number' ? zoom : 1));
	codeScanState.liveZoom = Math.round(clampedZoom * 100) / 100;
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
	var debugLog = document.getElementById('code_scan_debug');
	if(debugLog) {
		['mousedown', 'wheel', 'touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach(function(type) {
			debugLog.addEventListener(type, function(event) { event.stopPropagation(); }, { passive: true });
		});
	}
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

function getCodeScanReviewCrop(canvas, source, viewport) {
	var image = getCodeScanRenderedImageRect(canvas);
	var frame = viewport.getBoundingClientRect();
	if(!image.width || !image.height) return null;
	var xScale = source.width / image.width;
	var yScale = source.height / image.height;
	var x = Math.max(0, Math.floor((frame.left - image.left) * xScale));
	var y = Math.max(0, Math.floor((frame.top - image.top) * yScale));
	var right = Math.min(source.width, Math.ceil((frame.right - image.left) * xScale));
	var bottom = Math.min(source.height, Math.ceil((frame.bottom - image.top) * yScale));
	if(right <= x || bottom <= y) return null;
	return { x: x, y: y, width: right - x, height: bottom - y };
}

function offsetCodeScanReviewBox(box, x, y) {
	return box && Object.assign({}, box, { x0: box.x0 + x, y0: box.y0 + y, x1: box.x1 + x, y1: box.y1 + y });
}

function offsetCodeScanReviewMatch(match, x, y) {
	var regions = {};
	Object.keys(match.regions).forEach(function(key) {
		regions[key] = offsetCodeScanReviewBox(match.regions[key], x, y);
	});
	return Object.assign({}, match, { regions: regions });
}

function applyCodeScanCrop() {
	var revision = codeScanState.cropRevision;
	var session = codeScanState.session;
	var canvas = getCodeScanCanvas();
	var source = codeScanState.originalSourceCanvas || codeScanState.sourceCanvas || canvas;
	var viewport = document.querySelector('.code_scan_viewport');
	if(!canvas || !source || !viewport || codeScanState.phase === 'processing') return;
	clearTimeout(codeScanState.cropScanTimer);
	codeScanState.cropScanTimer = null;
	var crop = getCodeScanReviewCrop(canvas, source, viewport);
	if(!crop) return;
	var image = source;
	if(crop.width !== source.width || crop.height !== source.height) {
		image = document.createElement('canvas');
		image.width = crop.width;
		image.height = crop.height;
		image.getContext('2d').drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
	}
	setCodeScanPhase('processing');
	setCodeScanStatus('Reading label on your device...');
	logCodeScanStep('Reading the visible photo crop');
	recognizeCodeScanCanvas(image).then(function(result) {
		if(!isCurrentCodeScanSession(session)) return;
		if(revision !== codeScanState.cropRevision) { setCodeScanPhase('review'); return; }
		var match = extractMatchFromOcrResult(result);
		if(match) {
			var reviewMatch = offsetCodeScanReviewMatch(match, crop.x, crop.y);
			showCodeScanReview(reviewMatch);
			fillCodeScanReviewDetails(reviewMatch, { image: image, match: match, x: crop.x, y: crop.y });
		}
		else {
			setCodeScanPhase('review');
			logCodeScanStep('No match in reframed image');
			var boxes = result.data && result.data.debugBoxes || [];
			drawCodeScanMatchRegions(null, canvas, boxes.map(function(box) { return offsetCodeScanReviewBox(box, crop.x, crop.y); }));
			setCodeScanStatus('Could not read a code in this crop. Reframe or edit the words.');
		}
	}).catch(function() {
		if(!isCurrentCodeScanSession(session)) return;
		setCodeScanPhase('review');
		if(revision !== codeScanState.cropRevision) return;
		logCodeScanStep('Reframed image recognition failed');
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
	if(viewport && viewport.classList)
		viewport.classList.toggle('code_scan_viewport_frozen', !!frozen);
	if(canvas && canvas.classList)
		canvas.classList.toggle('hide', !frozen);
}

function setCodeScanStatus(message) {
	var node = document.getElementById('code_scan_status');
	if(node)
		node.textContent = message || '';
}

function showCodeScanStatus(message) {
	setCodeScanStatus(message);
}
