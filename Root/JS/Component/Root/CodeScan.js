var codeScanState = {
	active: false,
	source: 'decode',
	stream: null,
	worker: null,
	scanTimer: null,
	processing: false,
	lastMatchCode: '',
	stableMatchCount: 0,
	tesseractPromise: null,
	cameraAvailable: false
};

var CODE_SCAN_FRAME_INTERVAL_MS = 1600;
var CODE_SCAN_STABLE_MATCHES = 2;
var CODE_SCAN_MIN_CONFIDENCE = 55;
var CODE_SCAN_TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist';

function initCodeScan() {
	bindControl('decode_code_scan_button', 'click', openCodeScan);
	bindControl('map_code_scan_button', 'click', openCodeScan);
	bindControl('code_scan_close', 'click', closeCodeScan);
	bindControl('code_scan_type_instead', 'click', closeCodeScan);
	bindControl('code_scan_use_photo', 'click', openCodeScanPhotoPicker);
	var photoInput = document.getElementById('code_scan_photo_input');
	if(photoInput)
		photoInput.addEventListener('change', handleCodeScanPhotoInput);
}

function openCodeScan(event) {
	if(event && event.preventDefault)
		event.preventDefault();
	if(typeof wordList == 'undefined' || !wordList) {
		showNotification('Word list is still loading. Try again in a moment.');
		return;
	}
	codeScanState.source = event && event.currentTarget && event.currentTarget.id === 'map_code_scan_button' ? 'map' : 'decode';
	resetCodeScanMatchState();
	setCodeScanCandidate('');
	setCodeScanPhotoFallbackVisible(true);
	showOverlay(document.getElementById('code_scan_message'));
	codeScanState.active = true;
	if(codeScanOcrMatch.isCodeScanSupported()) {
		setCodeScanStatus('Requesting camera...');
		startCodeScanCamera();
		return;
	}
	codeScanState.cameraAvailable = false;
	setCodeScanViewportVisible(false);
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
	resetCodeScanMatchState();
	clearCodeScanTimer();
	stopCodeScanCamera();
	terminateCodeScanWorker();
	var photoInput = document.getElementById('code_scan_photo_input');
	if(photoInput)
		photoInput.value = '';
}

function resetCodeScanMatchState() {
	codeScanState.lastMatchCode = '';
	codeScanState.stableMatchCount = 0;
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

function scheduleCodeScanFrame() {
	clearCodeScanTimer();
	if(!codeScanState.active || !isCodeScanVisible()) {
		if(codeScanState.active)
			stopCodeScan();
		return;
	}
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
		setCodeScanStatus('Point your camera at the printed Wolo Code label.');
		prepareCodeScanWorker().then(function() {
			if(codeScanState.active)
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
		script.src = CODE_SCAN_TESSERACT_CDN + '/tesseract.min.js';
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
			workerPath: CODE_SCAN_TESSERACT_CDN + '/worker.min.js',
			langPath: CODE_SCAN_TESSERACT_CDN + '/lang',
			corePath: CODE_SCAN_TESSERACT_CDN + '/tesseract-core.wasm.js',
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
	setCodeScanStatus(message);
	showNotification(message);
	stopCodeScanCamera();
}

function handleCodeScanWorkerError() {
	setCodeScanStatus('Scanner failed to load. Type or paste your Wolo Code instead.');
	showNotification('Scanner failed to load. Type or paste your Wolo Code instead.');
}

function runCodeScanFrame() {
	if(!codeScanState.active || codeScanState.processing) {
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
	codeScanState.worker.recognize(canvas).then(function(result) {
		codeScanState.processing = false;
		if(!codeScanState.active)
			return;
		handleCodeScanOcrResult(result);
		scheduleCodeScanFrame();
	}).catch(function() {
		codeScanState.processing = false;
		if(codeScanState.active)
			scheduleCodeScanFrame();
	});
}

function captureCodeScanFrame(video, canvas) {
	var width = video.videoWidth;
	var height = video.videoHeight;
	if(!width || !height)
		return;
	var targetWidth = Math.min(width, 960);
	var targetHeight = Math.round(height * (targetWidth / width));
	canvas.width = targetWidth;
	canvas.height = targetHeight;
	var ctx = canvas.getContext('2d');
	ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
}

function handleCodeScanOcrResult(result, fromPhoto) {
	var text = result && result.data && result.data.text ? result.data.text : '';
	var confidence = result && result.data && typeof result.data.confidence == 'number' ? result.data.confidence : 0;
	var requiredMatches = fromPhoto ? 1 : CODE_SCAN_STABLE_MATCHES;
	var match;
	if(!text || confidence < CODE_SCAN_MIN_CONFIDENCE) {
		setCodeScanStatus(fromPhoto ? 'No readable text in that photo. Try another shot.' : 'Looking for a Wolo Code label...');
		setCodeScanCandidate('');
		resetCodeScanMatchState();
		return;
	}
	match = codeScanOcrMatch.matchOcrTextToWoloCode(text, wordList.includes.bind(wordList), wordList.curList);
	if(!match) {
		setCodeScanStatus(fromPhoto ? 'No valid Wolo Code in that photo. Try another shot.' : 'No valid Wolo Code found yet. Hold the label steady.');
		setCodeScanCandidate('');
		resetCodeScanMatchState();
		return;
	}
	setCodeScanCandidate(match.code);
	if(match.code === codeScanState.lastMatchCode)
		codeScanState.stableMatchCount += 1;
	else {
		codeScanState.lastMatchCode = match.code;
		codeScanState.stableMatchCount = 1;
	}
	setCodeScanStatus('Found: ' + match.code);
	if(codeScanState.stableMatchCount >= requiredMatches)
		applyScannedWoloCode(match.code);
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
	if(!file || !codeScanState.active)
		return;
	codeScanState.processing = true;
	setCodeScanStatus('Reading photo on your device...');
	prepareCodeScanWorker().then(function() {
		return recognizeCodeScanPhoto(file);
	}).then(function(result) {
		codeScanState.processing = false;
		if(!codeScanState.active)
			return;
		handleCodeScanOcrResult(result, true);
	}).catch(function() {
		codeScanState.processing = false;
		if(codeScanState.active)
			setCodeScanStatus('Could not read that photo. Try another shot or type the code.');
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

function setCodeScanViewportVisible(visible) {
	var viewport = document.querySelector('.code_scan_viewport');
	if(viewport)
		viewport.classList.toggle('hide', !visible);
}

function setCodeScanPhotoFallbackVisible(visible) {
	var button = document.getElementById('code_scan_use_photo');
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

function setCodeScanCandidate(code) {
	var node = document.getElementById('code_scan_candidate');
	if(!node)
		return;
	if(code) {
		node.textContent = code;
		node.classList.remove('hide');
	}
	else {
		node.textContent = '';
		node.classList.add('hide');
	}
}
