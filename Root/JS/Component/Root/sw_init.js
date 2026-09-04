if ('serviceWorker' in navigator) {
	window.addEventListener('load', function() {
		navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function(registration) {
			if (!registration.waiting) {
				return;
			}
			registration.waiting.postMessage({ type: 'SKIP_WAITING' });
		}, function(err) {
			if (typeof console !== 'undefined' && console.error) {
				console.error('Service worker registration failed', err);
			}
		});

		navigator.serviceWorker.addEventListener('controllerchange', function() {
			if (sessionStorage.wolo_sw_reloading === '1') {
				return;
			}
		});
	});
}
