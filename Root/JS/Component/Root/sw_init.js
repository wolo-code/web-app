function isIdleServiceWorkerRegistration(registration) {
	return !!(registration && !registration.installing);
}

function ignoreServiceWorkerRegistrationError(err) {
	if(typeof isIgnorableServiceWorkerError == 'function' && isIgnorableServiceWorkerError(err))
		return true;
	if(typeof console !== 'undefined' && console.error)
		console.error('Service worker registration failed', err);
	return false;
}

function requestServiceWorkerUpdate(registration) {
	if(!isIdleServiceWorkerRegistration(registration) || typeof registration.update != 'function')
		return Promise.resolve();
	return Promise.resolve(registration.update()).then(function() {}, function(err) {
		if(!ignoreServiceWorkerRegistrationError(err))
			throw err;
	});
}

if ('serviceWorker' in navigator) {
	// Worker updates affect future requests. Keep the current UI and result alive;
	// new page assets take effect on the next user navigation or refresh.
	window.addEventListener('load', function() {
		sessionStorage.removeItem('wolo_sw_reloading');
		navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(registration) {
			function promptWaiting(worker) {
				if (worker) {
					worker.postMessage({ type: 'SKIP_WAITING' });
				}
			}

			if (!registration) {
				return;
			}
			promptWaiting(registration.waiting);
			registration.addEventListener('updatefound', function() {
				var installing = registration.installing;
				if (!installing) {
					return;
				}
				installing.addEventListener('statechange', function() {
					if (installing.state === 'installed') {
						promptWaiting(installing);
					}
				});
			});
			// register() already started an update check. A second update()
			// during that install is aborted by Chrome (script "Unknown").
			return requestServiceWorkerUpdate(registration);
		}).then(function() {}, function(err) {
			ignoreServiceWorkerRegistrationError(err);
		});
	});
}
