'use strict';

var OFFLINE_DB_NAME = 'wolo-offline';
var OFFLINE_DB_VERSION = 1;
var offlineDbPromise = null;

function openOfflineDb() {
	if (offlineDbPromise) {
		return offlineDbPromise;
	}
	if (typeof indexedDB === 'undefined') {
		return Promise.reject(new Error('IndexedDB unavailable'));
	}
	offlineDbPromise = new Promise(function(resolve, reject) {
		var request = indexedDB.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
		request.onupgradeneeded = function(event) {
			var db = event.target.result;
			if (!db.objectStoreNames.contains('wordList')) {
				db.createObjectStore('wordList');
			}
			if (!db.objectStoreNames.contains('cityDetail')) {
				db.createObjectStore('cityDetail');
			}
			if (!db.objectStoreNames.contains('cityCenter')) {
				db.createObjectStore('cityCenter');
			}
			if (!db.objectStoreNames.contains('saveQueue')) {
				db.createObjectStore('saveQueue', { keyPath: 'id' });
			}
			if (!db.objectStoreNames.contains('meta')) {
				db.createObjectStore('meta');
			}
		};
		request.onsuccess = function(event) {
			resolve(event.target.result);
		};
		request.onerror = function() {
			reject(request.error || new Error('Failed to open offline database'));
		};
	});
	return offlineDbPromise;
}

function withStore(storeName, mode, callback) {
	return openOfflineDb().then(function(db) {
		return new Promise(function(resolve, reject) {
			var tx = db.transaction(storeName, mode);
			var store = tx.objectStore(storeName);
			var result;
			try {
				result = callback(store);
			} catch (error) {
				reject(error);
				return;
			}
			tx.oncomplete = function() {
				resolve(result);
			};
			tx.onerror = function() {
				reject(tx.error || new Error('IndexedDB transaction failed'));
			};
		});
	});
}

function offlineStoreGet(storeName, key) {
	return withStore(storeName, 'readonly', function(store) {
		return new Promise(function(resolve, reject) {
			var request = store.get(key);
			request.onsuccess = function() {
				resolve(request.result);
			};
			request.onerror = function() {
				reject(request.error);
			};
		});
	});
}

function offlineStorePut(storeName, key, value) {
	return withStore(storeName, 'readwrite', function(store) {
		store.put(value, key);
	});
}

function offlineStoreGetAll(storeName) {
	return withStore(storeName, 'readonly', function(store) {
		return new Promise(function(resolve, reject) {
			var request = store.getAll();
			request.onsuccess = function() {
				resolve(request.result || []);
			};
			request.onerror = function() {
				reject(request.error);
			};
		});
	});
}

function offlineStoreDelete(storeName, key) {
	return withStore(storeName, 'readwrite', function(store) {
		store.delete(key);
	});
}

function saveWordListSnapshot(list) {
	return offlineStorePut('wordList', 'current', list);
}

function getWordListSnapshot() {
	return offlineStoreGet('wordList', 'current');
}

function cacheCityDetail(id, city) {
	if (!id || !city) {
		return Promise.resolve();
	}
	var payload = Object.assign({}, city);
	delete payload.id;
	return offlineStorePut('cityDetail', id, payload);
}

function getCachedCityDetail(id) {
	return offlineStoreGet('cityDetail', id).then(function(city) {
		if (!city) {
			return null;
		}
		city.id = id;
		return city;
	});
}

function cacheCityCenter(id, center) {
	if (!id || !center) {
		return Promise.resolve();
	}
	return offlineStorePut('cityCenter', id, center);
}

function getCachedCityCenter(id) {
	return offlineStoreGet('cityCenter', id);
}

function findCachedCitiesByNameId(name_id) {
	return withStore('cityDetail', 'readonly', function(store) {
		return new Promise(function(resolve, reject) {
			var matches = [];
			var request = store.openCursor();
			request.onsuccess = function(event) {
				var cursor = event.target.result;
				if (!cursor) {
					resolve(matches);
					return;
				}
				var city = cursor.value;
				if (city && city.name_id === name_id) {
					city.id = cursor.key;
					matches.push(city);
				}
				cursor.continue();
			};
			request.onerror = function() {
				reject(request.error);
			};
		});
	});
}

function saveMapViewport(viewport) {
	return offlineStorePut('meta', 'mapViewport', viewport);
}

function getMapViewport() {
	return offlineStoreGet('meta', 'mapViewport');
}

function getOfflineSaveQueue() {
	return offlineStoreGetAll('saveQueue');
}

function putOfflineSaveQueueItem(item) {
	return withStore('saveQueue', 'readwrite', function(store) {
		store.put(item);
	});
}

function deleteOfflineSaveQueueItem(id) {
	return offlineStoreDelete('saveQueue', id);
}

function loadBootstrapWordList() {
	return fetch('/offline-data/WordList.json', { cache: 'no-store' })
		.then(function(response) {
			if (!response.ok) {
				throw new Error('bootstrap word list missing');
			}
			return response.json();
		});
}

function applyWordListSnapshot(list) {
	if (!list) {
		return false;
	}
	wordList = new WordList(list);
	city_styled_wordlist = wordList.curList;
	return true;
}

function initOfflineWordList() {
	return getWordListSnapshot()
		.then(function(snapshot) {
			if (applyWordListSnapshot(snapshot)) {
				initData();
				return true;
			}
			return loadBootstrapWordList().then(function(list) {
				if (applyWordListSnapshot(list)) {
					initData();
					return saveWordListSnapshot(list);
				}
				return false;
			});
		})
		.catch(function() {
			return false;
		});
}

function isOfflineMode() {
	return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function mergeCityWithCenter(city, center) {
	if (!city) {
		return null;
	}
	if (center) {
		city.center = center;
	}
	return city;
}

function getCityFromCache(id, callback) {
	getCachedCityDetail(id).then(function(city) {
		if (!city) {
			callback(null);
			return;
		}
		getCachedCityCenter(id).then(function(center) {
			callback(mergeCityWithCenter(city, center));
		});
	}).catch(function() {
		callback(null);
	});
}

function rememberCity(city) {
	if (!city || !city.id) {
		return Promise.resolve();
	}
	var center = city.center ? { lat: city.center.lat, lng: city.center.lng } : null;
	return cacheCityDetail(city.id, city).then(function() {
		if (center) {
			return cacheCityCenter(city.id, center);
		}
	});
}
