'use strict';

var offlineBannerVisible = false;
var mapViewportTimer = null;

function initOfflineStatus() {
	renderOfflineBanner();
	syncOfflineBanner();
	window.addEventListener('online', syncOfflineBanner);
	window.addEventListener('offline', syncOfflineBanner);
	initOfflineSaveQueue();
	initMapViewportTracking();
	registerServiceWorkerUpdates();
}

function renderOfflineBanner() {
	if (document.getElementById('offline_status_banner')) {
		return;
	}
	var banner = document.createElement('div');
	banner.id = 'offline_status_banner';
	banner.className = 'offline_status_banner hide';
	banner.setAttribute('role', 'status');
	banner.innerHTML = '<span id="offline_status_text">You are offline. Encode/decode works with cached data; sign-in and new city lookup need a connection.</span>';
	document.body.appendChild(banner);
}

function syncOfflineBanner() {
	var banner = document.getElementById('offline_status_banner');
	if (!banner) {
		return;
	}
	var offline = typeof navigator !== 'undefined' && navigator.onLine === false;
	banner.classList.toggle('hide', !offline);
	offlineBannerVisible = offline;
}

function showNetworkRequiredMessage(feature) {
	var label = feature || 'This feature';
	if (typeof showNotification === 'function') {
		showNotification(label + ' needs an internet connection', NOTIFICATION_DURATION_LONG);
	}
}

function initMapViewportTracking() {
	document.addEventListener('DOMContentLoaded', function() {
		if (typeof map !== 'object' || !map) {
			return;
		}
		trackMapViewport();
	});
}

function trackMapViewport() {
	if (typeof map !== 'object' || !map || map.__offlineViewportTracking) {
		return;
	}
	map.__offlineViewportTracking = true;
	var updateViewport = function() {
		if (mapViewportTimer) {
			clearTimeout(mapViewportTimer);
		}
		mapViewportTimer = setTimeout(persistMapViewport, 500);
	};
	map.addListener('idle', updateViewport);
	map.addListener('zoom_changed', updateViewport);
	persistMapViewport();
}

function persistMapViewport() {
	if (typeof map !== 'object' || !map || typeof map.getCenter !== 'function') {
		return;
	}
	var center = map.getCenter();
	var bounds = map.getBounds();
	if (!center) {
		return;
	}
	var viewport = {
		center: { lat: center.lat(), lng: center.lng() },
		zoom: map.getZoom(),
		updatedAt: Date.now()
	};
	if (bounds) {
		var ne = bounds.getNorthEast();
		var sw = bounds.getSouthWest();
		viewport.bounds = {
			north: ne.lat(),
			east: ne.lng(),
			south: sw.lat(),
			west: sw.lng()
		};
	}
	saveMapViewport(viewport);
	if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
		navigator.serviceWorker.controller.postMessage({
			type: 'PRUNE_TILE_CACHE',
			keepUrls: []
		});
	}
}

function registerServiceWorkerUpdates() {
	if (!('serviceWorker' in navigator)) {
		return;
	}
	navigator.serviceWorker.addEventListener('controllerchange', function() {
		if (sessionStorage.wolo_sw_reloading === '1') {
			return;
		}
	});
}

function notifyOfflineMapTilesMissing() {
	if (!offlineBannerVisible || typeof showNotification !== 'function') {
		return;
	}
	showNotification('Some map tiles are unavailable offline for this area', NOTIFICATION_DURATION_DEFAULT);
}
