var pendingInitMap;
var clickHandler;
var map;
var pendingExceptionLogs = [];
var EXCEPTION_RELOAD_ATTEMPTED_KEY = 'wolo_exception_reload_attempted';

function getGooglePlacesLibrary() {
	if(typeof google == 'object' && google.maps && google.maps.places)
		return google.maps.places;
	return null;
}

function getSearchBoxPlaceList(searchBox) {
	if(!searchBox || typeof searchBox.getPlaces != 'function')
		return [];
	var places = searchBox.getPlaces();
	if(!places || !places.length)
		return [];
	return places;
}

function syncInitMap() {
	try {
		if (document.readyState !== 'loading' && typeof google === 'object' && typeof google.maps === 'object' && typeof google.maps.Map === 'function' && typeof initMap == 'function' && pendingInitMap) {
			var fillMinZoom = typeof getMinZoomToFillMapHeight === 'function' ? getMinZoomToFillMapHeight() : DEFAULT_INIT_ZOOM;
			var mapOptions = {
				center: DEFAULT_LATLNG,
				zoom: Math.max(DEFAULT_INIT_ZOOM, fillMinZoom),
				minZoom: fillMinZoom,
				mapTypeControl: false,
				fullscreenControl: false,
				streetViewControl: false,
				zoomControl: false,
				backgroundColor: 'none'
			};
			if(typeof getGoogleMapStyles == 'function')
				mapOptions.styles = getGoogleMapStyles();
			map = new google.maps.Map(document.getElementById('map'), mapOptions);
			initMap();

			initDecodeCityContext();
			finishInitialLoader();

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
			addClassIfPresent(document.getElementById('logo'), 'plain_background');
			addClassIfPresent(document.getElementById('footer-content'), 'plain_background');
		}
		initExceptionMessageControls();
		flushExceptionPrompt();
		if(!pendingExceptionLogs.length)
			clearExceptionReloadAttempt();
	}
	catch(error) {
		showErrorPrompt(error);
	}
});

function initExceptionMessageControls() {
	var message = document.getElementById('exception_message');
	var continueButton = document.getElementById('exception_message_continue');
	var reloadButton = document.getElementById('exception_message_reload');
	var copyButton = document.getElementById('exception_log_copy');
	var title = document.getElementById('exception_message_title');

	if(!message || !continueButton || message.dataset.controlsReady)
		return;

	continueButton.addEventListener('click', hideExceptionMessage);
	if(reloadButton)
		reloadButton.addEventListener('click', clearCacheAndReload);
	if(copyButton)
		copyButton.addEventListener('click', copyExceptionLog);
	if(title && typeof addLongpressListener == 'function')
		addLongpressListener(title, function() {}, showExceptionLog);
	message.dataset.controlsReady = 'true';
}

function copyExceptionLog() {
	var log = document.getElementById('exception_log');
	if(!log)
		return;
	if(typeof copyPlainText == 'function')
		copyPlainText(log.textContent || '');
	else if(navigator.clipboard && navigator.clipboard.writeText)
		navigator.clipboard.writeText(log.textContent || '');
}

function setExceptionReloadAttempted() {
	if(typeof sessionStorage != 'undefined')
		sessionStorage.setItem(EXCEPTION_RELOAD_ATTEMPTED_KEY, '1');
}

function hadExceptionReloadAttempt() {
	return typeof sessionStorage != 'undefined' && sessionStorage.getItem(EXCEPTION_RELOAD_ATTEMPTED_KEY) === '1';
}

function clearExceptionReloadAttempt() {
	if(typeof sessionStorage != 'undefined')
		sessionStorage.removeItem(EXCEPTION_RELOAD_ATTEMPTED_KEY);
}

function syncExceptionSupportVisibility() {
	var support = document.querySelector('#exception_message .exception_support_copy');

	if(!support)
		return;

	if(hadExceptionReloadAttempt())
		support.classList.remove('hide');
	else
		support.classList.add('hide');
}

function clearCacheAndReload() {
	setExceptionReloadAttempted();
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
	var logFrame = document.getElementById('exception_log_frame');
	var controls = document.getElementById('exception_prompt_controls');
	var continueControls = document.getElementById('exception_dev_controls');

	if(!message || !logNode || !controls)
		return;

	initExceptionMessageControls();
	syncExceptionSupportVisibility();
	logNode.textContent = log;
	if(logFrame)
		logFrame.classList.add('hide');
	controls.classList.remove('hide');
	if(continueControls)
		continueControls.classList.add('hide');
	message.classList.remove('exception_log_open');

	if(typeof showOverlay == 'function')
		showOverlay(message);
	else {
		removeClassIfPresent(document.getElementById('overlay'), 'hide');
		removeClassIfPresent(message, 'hide');
	}
}

function hideExceptionMessage() {
	var message = document.getElementById('exception_message');

	pendingExceptionLogs = [];
	if(message)
		message.classList.remove('exception_log_open');
	if(typeof hideOverlay == 'function')
		hideOverlay(message);
	else {
		addClassIfPresent(document.getElementById('overlay'), 'hide');
		addClassIfPresent(message, 'hide');
	}
}

function showExceptionLog() {
	var message = document.getElementById('exception_message');
	var log = document.getElementById('exception_log');
	var logFrame = document.getElementById('exception_log_frame');
	var controls = document.getElementById('exception_prompt_controls');
	var continueControls = document.getElementById('exception_dev_controls');

	if(!log || !controls)
		return;

	if(logFrame)
		logFrame.classList.remove('hide');
	controls.classList.add('hide');
	if(continueControls)
		continueControls.classList.remove('hide');
	if(message)
		message.classList.add('exception_log_open');
}

window.onerror = function myErrorHandler(errorMsg, url, lineNumber, columnNumber, error) {
	showErrorPrompt(errorMsg, url, lineNumber, columnNumber, error);
	return false;
}

window.addEventListener('unhandledrejection', function myRejectionHandler(event) {
	var reason = event.reason || 'Unhandled promise rejection';
	showErrorPrompt(reason.message || reason, '', '', '', reason);
});
