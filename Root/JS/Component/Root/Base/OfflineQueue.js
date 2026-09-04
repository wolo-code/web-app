'use strict';

var offlineQueueFlushing = false;

function createOfflineQueueItem(payload) {
	return {
		id: 'offline-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
		createdAt: Date.now(),
		payload: payload
	};
}

function isOfflineNetworkError(error) {
	if (!error) {
		return false;
	}
	if (typeof isFirebaseAuthNetworkError === 'function' && isFirebaseAuthNetworkError(error)) {
		return true;
	}
	var message = '';
	if (error.message) {
		message = error.message;
	} else if (typeof error === 'string') {
		message = error;
	}
	return message.indexOf('network') !== -1
		|| message.indexOf('Network Error') !== -1
		|| message.indexOf('Failed to fetch') !== -1
		|| message.indexOf('Load failed') !== -1;
}

function shouldQueueOfflineSave(error) {
	return isOfflineMode() || isOfflineNetworkError(error);
}

function enqueueOfflineSave(payload) {
	var item = createOfflineQueueItem(payload);
	return putOfflineSaveQueueItem(item).then(function() {
		updateOfflineQueueBadge();
		if (typeof showNotification === 'function') {
			showNotification('Saved offline — will sync when online', NOTIFICATION_DURATION_LONG);
		}
		return item;
	});
}

function updateOfflineQueueBadge() {
	return getOfflineSaveQueue().then(function(queue) {
		var badge = document.getElementById('offline_queue_badge');
		if (!badge) {
			return;
		}
		if (queue.length) {
			badge.textContent = String(queue.length);
			badge.classList.remove('hide');
		} else {
			badge.textContent = '';
			badge.classList.add('hide');
		}
	});
}

function flushOfflineSaveQueue() {
	if (offlineQueueFlushing) {
		return Promise.resolve();
	}
	if (!firebase || !firebase.auth || !firebase.auth().currentUser) {
		return Promise.resolve();
	}
	offlineQueueFlushing = true;
	return getOfflineSaveQueue().then(function(queue) {
		if (!queue.length) {
			offlineQueueFlushing = false;
			return;
		}
		var ordered = queue.slice().sort(function(a, b) {
			return a.createdAt - b.createdAt;
		});
		return ordered.reduce(function(chain, item) {
			return chain.then(function() {
				return pushOfflineSave(item.payload).then(function() {
					return deleteOfflineSaveQueueItem(item.id);
				});
			});
		}, Promise.resolve()).then(function() {
			updateOfflineQueueBadge();
			if (typeof showNotification === 'function') {
				showNotification('Offline saves synced');
			}
		}).catch(function(error) {
			if (typeof showNotification === 'function' && !shouldQueueOfflineSave(error)) {
				showNotification('Could not sync offline saves');
			}
		}).finally(function() {
			offlineQueueFlushing = false;
		});
	});
}

function pushOfflineSave(payload) {
	return new Promise(function(resolve, reject) {
		firebase.database().ref('/UserData/' + payload.uid).push({
			city_id: payload.city_id,
			code: payload.code,
			title: payload.title,
			segment: payload.segment,
			address: payload.address,
			time: firebase.database.ServerValue.TIMESTAMP
		}, function(error) {
			if (error) {
				reject(error);
				return;
			}
			resolve();
		});
	});
}

function initOfflineSaveQueue() {
	window.addEventListener('online', function() {
		flushOfflineSaveQueue();
	});
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.addEventListener('message', function(event) {
			if (event.data && event.data.type === 'FLUSH_OFFLINE_QUEUE') {
				flushOfflineSaveQueue();
			}
		});
	}
	updateOfflineQueueBadge();
	if (navigator.onLine) {
		flushOfflineSaveQueue();
	}
}
