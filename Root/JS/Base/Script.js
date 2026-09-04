var pendingInitMap;
var clickHandler;
var map;
var pendingExceptionLogs = [];

function syncInitMap() {
	try {
		if (document.readyState !== 'loading' && typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.Map === 'function' && typeof initMap == 'function' && pendingInitMap) {
			map = new google.maps.Map(document.getElementById('map'), {
				center: DEFAULT_LATLNG,
				zoom: DEFAULT_INIT_ZOOM,
				mapTypeControl: false,
				fullscreenControl: false,
				streetViewControl: false,
				zoomControl: false,
				backgroundColor: 'none'
			});
			initMap();

			initDecodeCityContext();

			pendingInitMap = false;
		}
	}
	catch(error) {
		showErrorPrompt(error);
	}
}

document.addEventListener('DOMContentLoaded', function() {
	try {
		if(typeof initLoad != 'undefined')
			initLoad();
		if( typeof CSS == 'undefined' || !CSS.supports("backdrop-filter: blur()") ) {
			document.getElementById('logo').classList.add('plain_background');
			document.getElementById('footer-content').classList.add('plain_background');
		}
		initExceptionMessageControls();
		flushExceptionPrompt();
	}
	catch(error) {
		showErrorPrompt(error);
	}
});

function initExceptionMessageControls() {
	var message = document.getElementById('exception_message');
	var close = document.getElementById('exception_message_close');
	var toggle = document.getElementById('exception_log_toggle');
	var continueButton = document.getElementById('exception_message_continue');
	var reloadButton = document.getElementById('exception_message_reload');

	if(!message || !close || !toggle || !continueButton || message.dataset.controlsReady)
		return;

	close.addEventListener('click', hideExceptionMessage);
	toggle.addEventListener('click', toggleExceptionLog);
	continueButton.addEventListener('click', hideExceptionMessage);
	if(reloadButton)
		reloadButton.addEventListener('click', clearCacheAndReload);
	message.dataset.controlsReady = 'true';
}

function clearCacheAndReload() {
	var reload = function() {
		if (typeof sessionStorage != 'undefined') {
			sessionStorage.wolo_sw_reloading = '1';
		}
		var url = new URL(window.location.href);
		url.searchParams.set('_reload', String(Date.now()));
		window.location.replace(url.toString());
	};

	var tasks = [];

	if(typeof caches != 'undefined' && caches.keys) {
		tasks.push(caches.keys().then(function(keys) {
			return Promise.all(keys.map(function(key) {
				return caches.delete(key);
			}));
		}).catch(function() {}));
	}

	if(typeof navigator != 'undefined' && navigator.serviceWorker && navigator.serviceWorker.getRegistrations) {
		tasks.push(navigator.serviceWorker.getRegistrations().then(function(regs) {
			return Promise.all(regs.map(function(reg) {
				return reg.unregister();
			}));
		}).catch(function() {}));
	}

	Promise.all(tasks).catch(function() {}).then(reload);
}

function normalizeException(errorMsg, url, lineNumber, columnNumber, error) {
	if(errorMsg instanceof Error) {
		error = errorMsg;
		errorMsg = error.message;
	}

	return {
		msg: errorMsg && errorMsg.message ? errorMsg.message : String(errorMsg || 'Unhandled error'),
		src: url || '',
		line: lineNumber || '',
		col: columnNumber || '',
		stack: error && error.stack ? error.stack : ''
	};
}

function formatExceptionLog(error) {
	var log = ['Message: ' + error.msg];

	if(error.src)
		log.push('Source: ' + error.src);
	if(error.line)
		log.push('Line: ' + error.line);
	if(error.col)
		log.push('Column: ' + error.col);
	if(error.stack)
		log.push('', error.stack);

	return log.join('\n');
}

function deferExceptionPrompt(callback) {
	if(typeof queueMicrotask == 'function')
		queueMicrotask(callback);
	else
		setTimeout(callback, 0);
}

function showErrorPrompt(errorMsg, url, lineNumber, columnNumber, error) {
	var exception = normalizeException(errorMsg, url, lineNumber, columnNumber, error);
	pendingExceptionLogs.push(exception);
	reportExceptionPrompt(error || errorMsg || exception.msg, exception);
	deferExceptionPrompt(flushExceptionPrompt);
}

function reportExceptionPrompt(error, exception) {
	if(typeof Sentry == 'undefined' || typeof Sentry.captureException != 'function')
		return;

	if(error instanceof Error)
		Sentry.captureException(error);
	else
		Sentry.captureException(new Error(exception.msg));
}

function flushExceptionPrompt() {
	var message = document.getElementById('exception_message');

	if(!message || !pendingExceptionLogs.length)
		return;

	showExceptionMessage(pendingExceptionLogs.map(formatExceptionLog).join('\n\n---\n\n'));
}

function showExceptionMessage(log) {
	var message = document.getElementById('exception_message');
	var logNode = document.getElementById('exception_log');
	var toggle = document.getElementById('exception_log_toggle');
	var controls = document.getElementById('exception_prompt_controls');

	if(!message || !logNode || !toggle || !controls)
		return;

	initExceptionMessageControls();
	logNode.textContent = log;
	logNode.classList.add('hide');
	controls.classList.remove('hide');
	toggle.setAttribute('aria-expanded', 'false');
	toggle.setAttribute('aria-label', 'Show technical log');

	if(typeof showOverlay == 'function')
		showOverlay(message);
	else {
		document.getElementById('overlay').classList.remove('hide');
		message.classList.remove('hide');
	}
}

function hideExceptionMessage() {
	var message = document.getElementById('exception_message');

	pendingExceptionLogs = [];
	if(typeof hideOverlay == 'function')
		hideOverlay(message);
	else {
		document.getElementById('overlay').classList.add('hide');
		message.classList.add('hide');
	}
}

function toggleExceptionLog() {
	var log = document.getElementById('exception_log');
	var toggle = document.getElementById('exception_log_toggle');
	var controls = document.getElementById('exception_prompt_controls');
	var isHidden = log.classList.toggle('hide');

	controls.classList.toggle('hide', !isHidden);
	toggle.setAttribute('aria-expanded', !isHidden);
	toggle.setAttribute('aria-label', isHidden ? 'Show technical log' : 'Hide technical log');
}

window.onerror = function myErrorHandler(errorMsg, url, lineNumber, columnNumber, error) {
	showErrorPrompt(errorMsg, url, lineNumber, columnNumber, error);
	return false;
}

window.addEventListener('unhandledrejection', function myRejectionHandler(event) {
	var reason = event.reason || 'Unhandled promise rejection';
	showErrorPrompt(reason.message || reason, '', '', '', reason);
});
