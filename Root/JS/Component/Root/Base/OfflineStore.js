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

function withStore(storeName, mode, onStore) {
	return openOfflineDb().then(function(db) {
		return new Promise(function(resolve, reject) {
			var tx = db.transaction(storeName, mode);
			var store = tx.objectStore(storeName);
			var value;
			try {
				value = onStore(store);
			} catch (error) {
				reject(error);
				return;
			}
			tx.oncomplete = function() {
				resolve(value);
			};
			tx.onerror = function() {
				reject(tx.error || new Error('IndexedDB transaction failed'));
			};
			tx.onabort = function() {
				reject(tx.error || new Error('IndexedDB transaction aborted'));
			};
		});
	});
}

function offlineStoreGet(storeName, key) {
	return openOfflineDb().then(function(db) {
		return new Promise(function(resolve, reject) {
			var tx = db.transaction(storeName, 'readonly');
			var request = tx.objectStore(storeName).get(key);
			var value;
			request.onsuccess = function() {
				value = request.result;
			};
			tx.oncomplete = function() {
				resolve(value);
			};
			tx.onerror = function() {
				reject(tx.error || request.error || new Error('IndexedDB get failed'));
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
	return openOfflineDb().then(function(db) {
		return new Promise(function(resolve, reject) {
			var tx = db.transaction(storeName, 'readonly');
			var request = tx.objectStore(storeName).getAll();
			var value = [];
			request.onsuccess = function() {
				value = request.result || [];
			};
			tx.oncomplete = function() {
				resolve(value);
			};
			tx.onerror = function() {
				reject(tx.error || request.error || new Error('IndexedDB getAll failed'));
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

function plainCityCenter(center) {
	if (!center) {
		return null;
	}
	var lat = typeof center.lat === 'function' ? center.lat() : center.lat;
	var lng = typeof center.lng === 'function' ? center.lng() : center.lng;
	if (lat == null || lng == null || !isFinite(Number(lat)) || !isFinite(Number(lng))) {
		return null;
	}
	return { lat: Number(lat), lng: Number(lng) };
}

function sanitizeCityDetail(city) {
	if (!city) {
		return null;
	}
	var payload = {
		name: city.name || null,
		name_id: city.name_id || null,
		accent: city.accent || null,
		country: city.country || null,
		administrative_level_1: city.administrative_level_1 || null,
		administrative_level_2: city.administrative_level_2 || null,
		locality: city.locality || null,
		gp_id: city.gp_id || null
	};
	if (city.name_id == null && city.name) {
		payload.name_id = String(city.name).toLowerCase();
	}
	return payload;
}

function cacheCityDetail(id, city) {
	if (!id || !city) {
		return Promise.resolve();
	}
	var payload = sanitizeCityDetail(city);
	if (!payload) {
		return Promise.resolve();
	}
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
	var plain = plainCityCenter(center);
	if (!id || !plain) {
		return Promise.resolve();
	}
	return offlineStorePut('cityCenter', id, plain);
}

function getCachedCityCenter(id) {
	return offlineStoreGet('cityCenter', id);
}

function scanCityDetail(matchFn) {
	return openOfflineDb().then(function(db) {
		return new Promise(function(resolve, reject) {
			var tx = db.transaction('cityDetail', 'readonly');
			var request = tx.objectStore('cityDetail').openCursor();
			var matches = [];
			request.onsuccess = function(event) {
				var cursor = event.target.result;
				if (!cursor) {
					return;
				}
				var city = cursor.value;
				if (city && matchFn(city, cursor.key)) {
					city.id = cursor.key;
					matches.push(city);
				}
				cursor.continue();
			};
			tx.oncomplete = function() {
				resolve(matches);
			};
			tx.onerror = function() {
				reject(tx.error || request.error || new Error('IndexedDB city scan failed'));
			};
		});
	});
}

function findCachedCitiesByNameId(name_id) {
	if (name_id == null || name_id === '') {
		return Promise.resolve([]);
	}
	var needle = String(name_id).toLowerCase();
	return scanCityDetail(function(city) {
		var candidate = city.name_id != null ? city.name_id : city.name;
		return candidate != null && String(candidate).toLowerCase() === needle;
	});
}

function findCachedCityByGpId(gp_id) {
	if (!gp_id) {
		return Promise.resolve(null);
	}
	return scanCityDetail(function(city) {
		return city.gp_id === gp_id;
	}).then(function(matches) {
		return matches.length ? matches[0] : null;
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
	var plain = plainCityCenter(center);
	if (plain) {
		city.center = plain;
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
	var center = plainCityCenter(city.center);
	if (center) {
		city.center = center;
	}
	return cacheCityDetail(city.id, city).then(function() {
		if (center) {
			return cacheCityCenter(city.id, center);
		}
	}).catch(function() {
		return null;
	});
}

function seedCitiesFromHistory(history) {
	if (!history || !history.length) {
		return Promise.resolve();
	}
	return history.reduce(function(chain, city) {
		return chain.then(function() {
			return rememberCity(city);
		});
	}, Promise.resolve());
}
