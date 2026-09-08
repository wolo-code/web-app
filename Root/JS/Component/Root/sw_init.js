if ('serviceWorker' in navigator) {
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
			if (sessionStorage.wolo_sw_reloading === '1') {
				return;
			}
			sessionStorage.wolo_sw_reloading = '1';
			window.location.reload();
		});
	});
}
