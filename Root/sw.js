/* eslint-disable no-restricted-globals */
'use strict';

var CACHE_VERSION = 'wolo-offline-v1';
var STATIC_CACHE = CACHE_VERSION + ':static';
var SHELL_CACHE = CACHE_VERSION + ':shell';
var TILE_CACHE = CACHE_VERSION + ':tiles';
var MAX_TILE_ENTRIES = 500;
var TILE_HOSTS = [
	'maps.googleapis.com',
	'maps.gstatic.com',
	'khms0.googleapis.com',
	'khms1.googleapis.com',
	'khms2.googleapis.com',
	'khms3.googleapis.com'
];

var NETWORK_ONLY_HOSTS = [
	'firebaseio.com',
	'googleapis.com/identitytoolkit',
	'googleapis.com/securetoken',
	'googleapis.com/firestore',
	'googleapis.com/firebase',
	'gstatic.com/firebasejs',
	'cloudfunctions.net'
];

var SHELL_FALLBACKS = ['/', '/index.html'];

self.addEventListener('install', function(event) {
	event.waitUntil(
		loadPrecacheManifest()
			.then(function(manifest) {
				if (manifest && manifest.version) {
					CACHE_VERSION = manifest.version;
					STATIC_CACHE = CACHE_VERSION + ':static';
					SHELL_CACHE = CACHE_VERSION + ':shell';
					TILE_CACHE = CACHE_VERSION + ':tiles';
				}
				return precacheAssets(manifest && manifest.assets ? manifest.assets : []);
			})
			.then(function() {
				return self.skipWaiting();
			})
	);
});

self.addEventListener('activate', function(event) {
	event.waitUntil(
		caches.keys().then(function(cacheNames) {
			return Promise.all(cacheNames.map(function(cacheName) {
				if (cacheName.indexOf(CACHE_VERSION) !== 0) {
					return caches.delete(cacheName);
				}
			}));
		}).then(function() {
			return self.clients.claim();
		})
	);
});

self.addEventListener('message', function(event) {
	if (!event.data) {
		return;
	}
	if (event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
		return;
	}
	if (event.data.type === 'PRUNE_TILE_CACHE') {
		event.waitUntil(pruneTileCache(event.data.keepUrls || []));
	}
});

self.addEventListener('fetch', function(event) {
	var request = event.request;
	if (request.method !== 'GET') {
		return;
	}

	var url = new URL(request.url);

	if (request.mode === 'navigate') {
		event.respondWith(networkFirstShell(request));
		return;
	}

	if (isMapTileRequest(url)) {
		event.respondWith(cacheFirstTile(request));
		return;
	}

	if (url.origin !== self.location.origin && isNetworkOnlyRequest(url)) {
		event.respondWith(fetch(request));
		return;
	}

	if (url.origin === self.location.origin) {
		event.respondWith(cacheFirstStatic(request));
		return;
	}
});

function loadPrecacheManifest() {
	return fetch('/precache-manifest.json', { cache: 'no-store' })
		.then(function(response) {
			if (!response.ok) {
				throw new Error('precache manifest missing');
			}
			return response.json();
		})
		.catch(function() {
			return {
				version: CACHE_VERSION,
				assets: SHELL_FALLBACKS.concat([
					'/root.js',
					'/console.js',
					'/geofire.min.js',
					'/html2canvas.min.js',
					'/sw.js',
					'/manifest.json',
					'/offline-data/WordList.json'
				])
			};
		});
}

function precacheAssets(assets) {
	return caches.open(STATIC_CACHE).then(function(cache) {
		return Promise.all(assets.map(function(asset) {
			return cacheAsset(cache, asset);
		}));
	});
}

function cacheAsset(cache, asset) {
	var url = new URL(asset, self.location.origin).toString();
	return fetch(url, { credentials: 'same-origin' }).then(function(response) {
		if (response && response.ok) {
			return cache.put(url, response);
		}
	}).catch(function() {});
}

function networkFirstShell(request) {
	return fetch(request)
		.then(function(response) {
			if (response && response.ok) {
				var copy = response.clone();
				caches.open(SHELL_CACHE).then(function(cache) {
					cache.put(request, copy);
				});
			}
			return response;
		})
		.catch(function() {
			return caches.match(request).then(function(cached) {
				if (cached) {
					return cached;
				}
				return findShellFallback();
			});
		});
}

function findShellFallback() {
	return caches.open(SHELL_CACHE).then(function(shellCache) {
		return tryShellPaths(shellCache, 0).then(function(response) {
			if (response) {
				return response;
			}
			return caches.open(STATIC_CACHE).then(function(staticCache) {
				return tryShellPaths(staticCache, 0);
			});
		});
	}).catch(function() {
		return caches.open(STATIC_CACHE).then(function(staticCache) {
			return tryShellPaths(staticCache, 0);
		});
	});
}

function tryShellPaths(cache, index) {
	if (index >= SHELL_FALLBACKS.length) {
		return Promise.resolve(new Response('Offline', {
			status: 503,
			statusText: 'Offline',
			headers: { 'Content-Type': 'text/plain' }
		}));
	}
	return cache.match(SHELL_FALLBACKS[index]).then(function(response) {
		if (response) {
			return response;
		}
		return tryShellPaths(cache, index + 1);
	});
}

function cacheFirstStatic(request) {
	return caches.match(request).then(function(cached) {
		if (cached) {
			return cached;
		}
		return fetch(request).then(function(response) {
			if (response && response.ok) {
				var copy = response.clone();
				caches.open(STATIC_CACHE).then(function(cache) {
					cache.put(request, copy);
				});
			}
			return response;
		});
	});
}

function cacheFirstTile(request) {
	return caches.open(TILE_CACHE).then(function(cache) {
		return cache.match(request).then(function(cached) {
			var networkPromise = fetch(request).then(function(response) {
				if (response && response.ok) {
					cache.put(request, response.clone());
					trimTileCache(cache);
				}
				return response;
			}).catch(function() {
				return cached;
			});

			if (cached) {
				eventWait(networkPromise);
				return cached;
			}
			return networkPromise;
		});
	});
}

function eventWait(promise) {
	try {
		if (promise && promise.catch) {
			promise.catch(function() {});
		}
	} catch (error) {}
}

function trimTileCache(cache) {
	cache.keys().then(function(keys) {
		if (keys.length <= MAX_TILE_ENTRIES) {
			return;
		}
		var excess = keys.length - MAX_TILE_ENTRIES;
		var removals = keys.slice(0, excess);
		return Promise.all(removals.map(function(key) {
			return cache.delete(key);
		}));
	});
}

function pruneTileCache(keepUrls) {
	var keep = {};
	keepUrls.forEach(function(url) {
		keep[url] = true;
	});
	return caches.open(TILE_CACHE).then(function(cache) {
		return cache.keys().then(function(keys) {
			return Promise.all(keys.map(function(request) {
				if (!keep[request.url]) {
					return cache.delete(request);
				}
			}));
		});
	});
}

function isMapTileRequest(url) {
	if (TILE_HOSTS.indexOf(url.hostname) === -1) {
		return false;
	}
	return url.pathname.indexOf('/vt') !== -1
		|| url.pathname.indexOf('/kh') !== -1
		|| url.pathname.indexOf('/mapfiles') !== -1
		|| url.pathname.indexOf('/maps/vt') !== -1
		|| /\.(png|jpg|jpeg|webp)$/.test(url.pathname);
}

function isNetworkOnlyRequest(url) {
	var href = url.href;
	for (var i = 0; i < NETWORK_ONLY_HOSTS.length; i++) {
		if (href.indexOf(NETWORK_ONLY_HOSTS[i]) !== -1) {
			return true;
		}
	}
	if (url.hostname === 'maps.googleapis.com' && !isMapTileRequest(url)) {
		return true;
	}
	if (url.hostname.indexOf('googleapis.com') !== -1 && url.pathname.indexOf('/maps/api/js') !== -1) {
		return true;
	}
	return false;
}
