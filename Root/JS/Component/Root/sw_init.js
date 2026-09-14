if ('serviceWorker' in navigator) {
	// A worker taking control for the first time does not require a reload: the
	// current page already came from the network. Only reload pages that began
	// under an older controller and need to switch to an updated worker.
	var hadServiceWorkerControllerAtLoad = !!navigator.serviceWorker.controller;

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
			return registration.update();
		}, function(err) {
			if (typeof console !== 'undefined' && console.error) {
				console.error('Service worker registration failed', err);
			}
		});

		navigator.serviceWorker.addEventListener('controllerchange', function() {
			if (!hadServiceWorkerControllerAtLoad) {
				return;
			}
			if (sessionStorage.wolo_sw_reloading === '1') {
				return;
			}
			sessionStorage.wolo_sw_reloading = '1';
			window.location.reload();
		});
	});
}
