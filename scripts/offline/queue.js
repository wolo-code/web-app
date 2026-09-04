'use strict';

function createQueueItem(payload) {
	return {
		id: 'offline-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
		createdAt: Date.now(),
		payload: payload
	};
}

function enqueue(queue, item) {
	return queue.concat([item]);
}

function removeQueueItem(queue, id) {
	return queue.filter(function(entry) {
		return entry.id !== id;
	});
}

function sortQueue(queue) {
	return queue.slice().sort(function(a, b) {
		return a.createdAt - b.createdAt;
	});
}

function isNetworkError(error) {
	if (!error) {
		return false;
	}
	var message = '';
	if (error.message) {
		message = error.message;
	} else if (typeof error === 'string') {
		message = error;
	}
	if (error.code === 'auth/network-request-failed') {
		return true;
	}
	return message.indexOf('network') !== -1
		|| message.indexOf('Network Error') !== -1
		|| message.indexOf('Failed to fetch') !== -1
		|| message.indexOf('Load failed') !== -1;
}

function shouldQueueSave(isOnline, error) {
	return isOnline === false || isNetworkError(error);
}

async function flushQueue(queue, flushFn) {
	var results = {
		flushed: 0,
		failed: 0,
		remaining: []
	};
	var ordered = sortQueue(queue);
	for (var i = 0; i < ordered.length; i++) {
		var item = ordered[i];
		try {
			await flushFn(item.payload);
			results.flushed += 1;
		} catch (error) {
			if (shouldQueueSave(true, error)) {
				results.remaining.push(item);
				results.failed += 1;
			} else {
				throw error;
			}
		}
	}
	return results;
}

module.exports = {
	createQueueItem,
	enqueue,
	removeQueueItem,
	sortQueue,
	isNetworkError,
	shouldQueueSave,
	flushQueue
};
