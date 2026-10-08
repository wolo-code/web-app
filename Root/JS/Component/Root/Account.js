function onAccount() {
	if(firebase.auth().currentUser)
		showAccountDialog();
	else
		onLogin();
}

function showSavedDialog() {
	loadSaveList();
	showOverlay(document.getElementById('saved_dialog_container'));
	setAccountDialogSavesOpen(true);
	syncAccountDialogSaveForm();
	var inner = document.querySelector('#account_dialog_save_list_container > .account_dialog_fold_inner');
	if(inner) inner.scrollTop = 0;
}

var editingSaveKey = null;
var menuSaveEntry = null;

function showAccountDialog() {
	showOverlay(document.getElementById('account_dialog_container'));
	var dialogBody = document.querySelector('#account_dialog > .message_dialog_body');
	if(dialogBody)
		dialogBody.scrollTop = 0;
	var saveListInner = document.querySelector('#account_dialog_save_list_container > .account_dialog_fold_inner');
	if(saveListInner)
		saveListInner.scrollTop = 0;
	setAccountDialogSavesOpen(false);
	syncAccountDialogSaveForm();
}

function hideAccountDialog() {
	hideOverlay(document.getElementById('account_dialog_container'));
	hideOverlay(document.getElementById('saved_dialog_container'));
	closeSaveEntryMenus();
	setAccountDialogAddOpen(false);
	setAccountDialogSavesOpen(false);
	clearAccountDialogSaveForm();
	clearSaveEntry();
}

function syncAccountDialogSaveForm() {
	if(current_title)
		document.getElementById('save_title_main').value = current_title;
	else
		document.getElementById('save_title_main').value = '';
	if(current_segment)
		document.getElementById('save_title_segment').value = current_segment;
	else
		document.getElementById('save_title_segment').value = '';
	setAccountDialogAddressFields(current_address_lines || { address_line_1: current_address || '', address_line_2: '' });
}

function setAccountDialogAddOpen(open) {
	var form = document.getElementById('account_dialog_options');
	var toggle = document.getElementById('account_dialog_add_toggle');
	if(!form || !toggle)
		return;
	if(open) {
		form.classList.remove('hide');
		toggle.setAttribute('aria-expanded', 'true');
		syncAccountDialogSaveForm();
	}
	else {
		form.classList.add('hide');
		toggle.setAttribute('aria-expanded', 'false');
		editingSaveKey = null;
	}
}

function toggleAccountDialogAdd() {
	var toggle = document.getElementById('account_dialog_add_toggle');
	setAccountDialogAddOpen(!(toggle && toggle.getAttribute('aria-expanded') === 'true'));
}

function setAccountDialogSavesOpen(open) {
	var list = document.getElementById('account_dialog_save_list_container');
	var toggle = document.getElementById('account_dialog_saves_toggle');
	var dialog = document.getElementById('saved_dialog');
	var prefs = document.getElementById('account_dialog_prefs');
	if(!list || !toggle)
		return;
	if(open) {
		toggle.setAttribute('aria-expanded', 'true');
		if(dialog)
			dialog.classList.add('saves-open');
		list.setAttribute('aria-hidden', 'false');
		if(prefs)
			prefs.setAttribute('aria-hidden', 'true');
		queueSaveListEndIndicatorUpdate();
	}
	else {
		toggle.setAttribute('aria-expanded', 'false');
		if(dialog)
			dialog.classList.remove('saves-open');
		list.setAttribute('aria-hidden', 'true');
		if(prefs)
			prefs.removeAttribute('aria-hidden');
	}
}

function toggleAccountDialogSaves() {
	var toggle = document.getElementById('account_dialog_saves_toggle');
	setAccountDialogSavesOpen(!(toggle && toggle.getAttribute('aria-expanded') === 'true'));
}

// Structured saved addresses; legacy text is always one address line.
function readSavedAddressLines(value) {
	if(typeof value === 'string') value = { address: value };
	value = value || {};
	var structured = Object.prototype.hasOwnProperty.call(value, 'address_line_1') || Object.prototype.hasOwnProperty.call(value, 'address_line_2');
	return {
		address_line_1: String((structured ? value.address_line_1 : value.address) || '').trim(),
		address_line_2: String((structured ? value.address_line_2 : '') || '').trim()
	};
}

function formatSavedAddress(value, separator) {
	var lines = readSavedAddressLines(value);
	return [lines.address_line_1, lines.address_line_2].filter(Boolean).join(separator == null ? '\n' : separator);
}

var saveAddressSplit = false;
var rememberedAddressLines = null;
var mergedAddressText = '';

function renderAccountDialogAddressMode() {
	var first = document.getElementById('save_address');
	var second = document.getElementById('save_address_line_2');
	var toggle = document.getElementById('save_address_split_toggle');
	first.placeholder = saveAddressSplit ? 'Address line 1 – e.g. 12 MG Road' : 'Address (optional)';
	first.setAttribute('aria-label', saveAddressSplit ? 'Address line 1 (optional)' : 'Address (optional)');
	second.hidden = !saveAddressSplit;
	second.disabled = !saveAddressSplit;
	if(toggle) {
		toggle.setAttribute('aria-expanded', String(saveAddressSplit));
		toggle.setAttribute('aria-label', saveAddressSplit ? 'Merge address' : 'Split address');
		toggle.title = saveAddressSplit ? 'Merge address' : 'Split address';
		toggle.classList.toggle('is-split', saveAddressSplit);
	}
}

function setAccountDialogAddressFields(value) {
	var lines = readSavedAddressLines(value);
	saveAddressSplit = !!lines.address_line_2;
	rememberedAddressLines = null;
	document.getElementById('save_address').value = lines.address_line_1;
	document.getElementById('save_address_line_2').value = lines.address_line_2;
	mergedAddressText = lines.address_line_1;
	renderAccountDialogAddressMode();
}

function onMergedAddressInput() {
	if(!saveAddressSplit) rememberedAddressLines = null;
}

function toggleAccountDialogAddressSplit() {
	var first = document.getElementById('save_address');
	var second = document.getElementById('save_address_line_2');
	if(saveAddressSplit) {
		rememberedAddressLines = getAccountDialogSaveAddressLines();
		mergedAddressText = formatSavedAddress(rememberedAddressLines, ', ');
		first.value = mergedAddressText;
		second.value = '';
		saveAddressSplit = false;
	} else {
		var lines = rememberedAddressLines && first.value === mergedAddressText ? rememberedAddressLines : { address_line_1: first.value, address_line_2: '' };
		first.value = lines.address_line_1;
		second.value = lines.address_line_2;
		saveAddressSplit = true;
		rememberedAddressLines = null;
	}
	renderAccountDialogAddressMode();
	(saveAddressSplit ? second : first).focus();
}

function resetAccountDialogAddressField() {
	setAccountDialogAddressFields({});
}

function getAccountDialogSaveAddressLines() {
	return readSavedAddressLines({
		address_line_1: document.getElementById('save_address').value,
		address_line_2: saveAddressSplit ? document.getElementById('save_address_line_2').value : ''
	});
}

function normalizeSavedWcode(code) {
	var words = [];
	if(typeof code === 'string')
		words = code.trim().split(/\s+/);
	else if(Array.isArray(code))
		words = code.slice();
	else if(code && typeof code === 'object')
		words = Object.keys(code).sort(function(a, b) {
			return Number(a) - Number(b);
		}).map(function(key) {
			return code[key];
		});
	var flat = [];
	words.forEach(function(word) {
		if(typeof word === 'string' && /\s/.test(word))
			flat = flat.concat(word.trim().split(/\s+/));
		else if(word != null && word !== '')
			flat.push(word);
	});
	if(flat.length > 3)
		return flat.slice(-3);
	return flat;
}

function savedCityDisplayName(city, entry) {
	if(entry && entry.city_name)
		return entry.city_name;
	if(city && typeof getProperCityAccent == 'function')
		return getProperCityAccent(city);
	if(city && city.name)
		return city.name;
	return '';
}

function setSavedRowCodeText(row_code, cityName, words) {
	var slash = document.createElement('span');
	slash.className = 'row-code-slash';
	slash.textContent = '\\';
	var cityLine = document.createElement('div');
	cityLine.className = 'row-code-city';
	cityLine.textContent = cityName || '';
	var codeLine = document.createElement('div');
	codeLine.className = 'row-code-words';
	codeLine.textContent = (words || []).join(' ') + ' /';
	row_code.replaceChildren(slash, cityLine, codeLine);
}

function getSaveEntryRow(node) {
	if(!node)
		return null;
	if(node.nodeType === 3)
		node = node.parentElement;
	if(node && node.closest)
		return node.closest('#account_dialog_save_list > div');
	while(node && node.parentElement && node.parentElement.id !== 'account_dialog_save_list')
		node = node.parentElement;
	return node && node.parentElement && node.parentElement.id === 'account_dialog_save_list' ? node : null;
}

function onAccountDialogCancel() {
	clearAccountDialogSaveForm();
	setAccountDialogAddOpen(false);
}

function onAccountDialogSave() {
	var titleField = document.getElementById('save_title_main');
	var title = titleField ? titleField.value.trim() : '';
	if(!title) {
		showNotification("Title is required");
		return;
	}
	if(locating) {
		showNotification("Still locating..");
		return;
	}

	var segmentField = document.getElementById('save_title_segment');
	var segment = segmentField ? segmentField.value : '';
	var saveAddr = getAccountDialogSaveAddressLines();
	current_title = title;
	current_segment = segment;
	current_address_lines = saveAddr;
	current_address = formatSavedAddress(saveAddr);
	if(editingSaveKey) {
		updateSavedAddress(editingSaveKey, title, segment, saveAddr, function() {
			editingSaveKey = null;
			clearAccountDialogSaveForm();
			setAccountDialogAddOpen(false);
			setAccountDialogSavesOpen(true);
		});
		return;
	}
	saveAddress(title, segment, saveAddr, function() {
		clearAccountDialogSaveForm();
		setAccountDialogAddOpen(false);
		setAccountDialogSavesOpen(true);
	});
}

function buildSaveAddressPayload(title, segment, addressLines, city, code) {
	if(!city || city.id == null || city.id === '') {
		return null;
	}
	if(!code || !code.length) {
		return null;
	}
	var lines = readSavedAddressLines(addressLines);
	return {
		city_id: city.id,
		code: code,
		title: title,
		segment: segment,
		address_line_1: lines.address_line_1,
		address_line_2: lines.address_line_2
	};
}

function saveAddress(title, segment, savedAddress, callback) {
	var user = getBookmarkUser();
	var city = typeof getCodeCity == 'function' ? getCodeCity() : null;
	var code = normalizeSavedWcode(typeof getCodeWCode == 'function' ? getCodeWCode() : null);
	var basePayload = buildSaveAddressPayload(title, segment, savedAddress, city, code);
	if(!basePayload) {
		showNotification('Locate or decode a Wolo Code first');
		return;
	}
	var payload = {
		uid: user ? user.uid : null,
		city_id: basePayload.city_id,
		gp_id: city.gp_id || null,
		city_name: typeof getProperCityAccent == 'function' ? getProperCityAccent(city) : (city.name || ''),
		code: basePayload.code,
		title: basePayload.title,
		segment: basePayload.segment,
		address_line_1: basePayload.address_line_1,
		address_line_2: basePayload.address_line_2
	};
	if(!user) {
		var local = readLocalBookmarks();
		local['local_' + Date.now() + '_' + Math.random().toString(36).slice(2)] = payload;
		if(writeLocalBookmarks(local)) {
			loadSaveList();
			if(typeof callback === 'function') callback();
			showNotification('Bookmark saved on this device');
		}
		return;
	}
	uid = user.uid;
	if (isOfflineMode()) {
		enqueueOfflineSave(payload).then(function() {
			if(typeof callback != 'undefined')
				callback();
		});
		return;
	}
	pushOfflineSave(payload).then(function() {
		if(typeof callback != 'undefined')
			callback();
		showNotification('Address saved');
	}).catch(function(error) {
		if (shouldQueueOfflineSave(error)) {
			enqueueOfflineSave(payload).then(function() {
				if(typeof callback != 'undefined')
					callback();
			});
			return;
		}
		showNotification('Could not save address');
	});
}

function updateSavedAddress(key, title, segment, savedAddress, callback) {
	var lines = readSavedAddressLines(savedAddress);
	var user = getBookmarkUser();
	if(isLocalBookmark(key)) {
		var local = readLocalBookmarks();
		if(!local[key]) return;
		local[key].title = title;
		local[key].segment = segment;
		local[key].address_line_1 = lines.address_line_1;
		local[key].address_line_2 = lines.address_line_2;
		delete local[key].address;
		if(writeLocalBookmarks(local)) {
			loadSaveList();
			if(typeof callback === 'function') callback();
		}
		return;
	}
	if(!user) return;
	if(!key) {
		showNotification('Could not save address');
		return;
	}
	uid = user.uid;
	firebase.database().ref('/UserData/' + uid + '/' + key).update({
		title: title,
		segment: segment,
		address_line_1: lines.address_line_1,
		address_line_2: lines.address_line_2,
		address: null
	}, function(error) {
		if(error) {
			showNotification('Could not save address');
			return;
		}
		showNotification('Address saved');
		if(typeof callback != 'undefined')
			callback();
	});
}

function clearAccountDialogSaveForm() {
	document.getElementById('save_title_main').value = '';
	document.getElementById('save_title_segment').value = '';
	resetAccountDialogAddressField();
}

function updateSaveListEndIndicator() {
	var list = document.getElementById('account_dialog_save_list');
	var endIndicator = document.getElementById('account_dialog_save_list_end');
	if(!list || !endIndicator)
		return;
	endIndicator.classList.add('hide');
	if(list.children.length)
		endIndicator.classList.remove('hide');
}

function queueSaveListEndIndicatorUpdate() {
	setTimeout(updateSaveListEndIndicator, 0);
}

var LOCAL_BOOKMARKS_KEY = 'wolo.local-bookmarks.v1';
var bookmarkCloudRef = null;
var bookmarkCloudListener = null;
var cloudBookmarks = {};
var syncingLocalBookmarks = {};

function getBookmarkUser() {
 return typeof firebase !== 'undefined' && firebase && typeof firebase.auth === 'function' ? firebase.auth().currentUser : null;
}
function isLocalBookmark(key) { return typeof key === 'string' && key.indexOf('local_') === 0; }
function readLocalBookmarks() {
 try {
  var entries = JSON.parse(localStorage.getItem(LOCAL_BOOKMARKS_KEY) || '{}');
  if(!entries || typeof entries !== 'object' || Array.isArray(entries)) return {};
  var valid = {};
  Object.keys(entries).forEach(function(key) {
   if(isLocalBookmark(key) && entries[key] && typeof entries[key] === 'object' && normalizeSavedWcode(entries[key].code).length)
    valid[key] = entries[key];
  });
  return valid;
 } catch(error) { return {}; }
}
function writeLocalBookmarks(entries) {
 try { localStorage.setItem(LOCAL_BOOKMARKS_KEY, JSON.stringify(entries)); return true; }
 catch(error) { showNotification('Could not save bookmarks on this device'); return false; }
}
function renderAllBookmarks() {
 if(typeof updateQRBookmarkStatus === 'function') updateQRBookmarkStatus();
 renderSaveList(Object.assign({}, cloudBookmarks, readLocalBookmarks()));

}
function loadSaveList() {
 if(bookmarkCloudRef && bookmarkCloudListener) bookmarkCloudRef.off('value', bookmarkCloudListener);
 bookmarkCloudRef = null;
 bookmarkCloudListener = null;
 cloudBookmarks = {};
 renderAllBookmarks();
 var user = getBookmarkUser();
 if(!user) return;
 var owner = user.uid;
 bookmarkCloudRef = firebase.database().ref('/UserData/' + owner);
 bookmarkCloudListener = function(snapshot) {
  var current = getBookmarkUser();
  if(!current || current.uid !== owner) return;
  cloudBookmarks = snapshot.val() || {};
  renderAllBookmarks();
 };
 bookmarkCloudRef.on('value', bookmarkCloudListener, function() {
  showNotification('Cloud bookmarks could not be loaded');
 });
}
function addLocalBookmarkInfo(row, header, key) {
	var info = document.createElement('button');
	info.id = 'bookmark_info_toggle_' + key;
	info.type = 'button';
	info.className = 'bookmark-info-toggle control';
	info.setAttribute('aria-label', 'Bookmark storage information');
	info.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 10v7" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="7" r="1" fill="currentColor"/></svg>';
	info.addEventListener('click', function(event) {
		event.stopPropagation();
		showNotification('This bookmark is saved only in this browser. Use Sync to cloud in the three-dot menu to save it to your account. Clearing browser data removes the local copy.', NOTIFICATION_DURATION_LONG);
	});
	header.appendChild(info);
}

function updateBookmarkSyncMenu(row) {
	var button = document.getElementById('account_dialog_row_sync');
	var key = row && row.data_key;
	button.classList.toggle('hide', !isLocalBookmark(key));
	button.disabled = !!syncingLocalBookmarks[key];
	button.setAttribute('aria-disabled', !getBookmarkUser() || button.disabled ? 'true' : 'false');
	button.title = getBookmarkUser() ? '' : 'Sign in to sync this bookmark';
	document.getElementById('account_dialog_row_sync_label').textContent = button.disabled ? 'Syncing…' : 'Sync to cloud';
}

function syncSaveEntry(event) {
	if(event && event.stopPropagation) event.stopPropagation();
	var row = getSaveEntryMenuRow(event);
	closeSaveEntryMenus();
	if(row && isLocalBookmark(row.data_key)) return syncLocalBookmark(row.data_key);
}

function syncLocalBookmark(key) {
	var user = getBookmarkUser();
	if(!user) {
		showNotification('Sign in to sync this bookmark to the cloud');
		onLogin();
		return Promise.resolve(false);
	}
	if(syncingLocalBookmarks[key]) return Promise.resolve(false);
	var entry = readLocalBookmarks()[key];
	if(!entry) return Promise.resolve(false);
	if(isOfflineMode()) {
		showNotification('Connect to the internet to sync this bookmark');
		return Promise.resolve(false);
	}
	var original = JSON.stringify(entry);
	var cloudKey = 'synced_' + key;
	var payload = {
		city_id: entry.city_id,
		gp_id: entry.gp_id || null,
		city_name: entry.city_name || null,
		code: normalizeSavedWcode(entry.code),
		title: entry.title || '',
		segment: entry.segment || '',
		address_line_1: readSavedAddressLines(entry).address_line_1,
		address_line_2: readSavedAddressLines(entry).address_line_2,
		time: firebase.database.ServerValue.TIMESTAMP
	};
	syncingLocalBookmarks[key] = true;
	if(menuSaveEntry) updateBookmarkSyncMenu(menuSaveEntry);
	// A stable cloud key makes retries safe if saving local storage fails.
	return new Promise(function(resolve, reject) {
		firebase.database().ref('/UserData/' + user.uid + '/' + cloudKey).set(payload, function(error) {
			if(error) reject(error);
			else resolve();
		});
	}).then(function() {
		var current = getBookmarkUser();
		if(current && current.uid === user.uid) cloudBookmarks[cloudKey] = payload;
		var local = readLocalBookmarks();
		if(local[key] && JSON.stringify(local[key]) === original) {
			delete local[key];
			if(!writeLocalBookmarks(local)) return false;
			if(editingSaveKey === key && current && current.uid === user.uid) editingSaveKey = cloudKey;
		}
		showNotification('Bookmark saved to the cloud');
		return true;
	}).catch(function() {
		showNotification('Could not sync bookmark. It is still saved in this browser.');
		return false;
	}).then(function(result) {
		delete syncingLocalBookmarks[key];
		renderAllBookmarks();
		return result;
	});
}

function renderSaveList(entries) {
 var container = document.getElementById('account_dialog_save_list');
 if(!container) return;
	var list = document.getElementById('account_dialog_save_list');
	if(list)
		list.innerHTML = '';
	addClassIfPresent(document.getElementById('account_dialog_save_list_end'), 'hide');
	closeSaveEntryMenus();
	saveList = entries;
	lastActiveSaveEntry = null;
	if(saveList && Object.keys(saveList).length) {
		addClassIfPresent(document.getElementById('account_dialog_save_list_loader'), 'hide');
		addClassIfPresent(document.getElementById('account_dialog_save_list_placeholder'), 'hide');
		for(let key in saveList) {
			let row = document.createElement('div');
			let row_header = document.createElement('div');
			let row_title = document.createElement('div');
			let row_segment = document.createElement('div');
			let row_address = document.createElement('div');
			let row_code = document.createElement('div');
			let row_process = document.createElement('button');
			let row_process_img = document.createElement('img');
			let savedCode = normalizeSavedWcode(saveList[key].code);
			row_header.setAttribute('class', 'row-header');
			row_title.setAttribute('class', 'row-title');
			row_title.innerText = saveList[key].title;
			row_header.appendChild(row_title);
			if((saveList[key].segment || '').trim()) {
				row_segment.setAttribute('class', 'row-segment');
				row_segment.innerText = saveList[key].segment;
				row_header.appendChild(row_segment);
			}
			var moreTemplate = document.getElementById('account_dialog_more_icon_template');
			let row_menu_toggle = document.createElement('button');
			row_menu_toggle.setAttribute('class', 'row-menu-toggle control');
			row_menu_toggle.setAttribute('type', 'button');
			row_menu_toggle.setAttribute('title', 'More');
			row_menu_toggle.setAttribute('aria-label', 'More');
			row_menu_toggle.setAttribute('aria-haspopup', 'menu');
			row_menu_toggle.setAttribute('aria-expanded', 'false');
			if(moreTemplate)
				row_menu_toggle.innerHTML = moreTemplate.innerHTML;
			row_menu_toggle.addEventListener('click', onSaveEntryMenuToggle);
			row_header.appendChild(row_menu_toggle);
			row.addEventListener('click', onPressSaveEntry);
			row.data_key = key;
			row.data_code = savedCode;
			row_address.setAttribute('class', 'row-address');
			row_address.innerText = formatSavedAddress(saveList[key], '\n\n');
			row_code.setAttribute('class', 'row-code');
			setSavedRowCodeText(row_code, savedCityDisplayName(null, saveList[key]), savedCode);
			row_process.setAttribute('class', 'row-process control');
			row_process.setAttribute('type', 'button');
			row_process.setAttribute('title', 'Go');
			row_process.setAttribute('aria-label', 'Go');
			row_process_img.src = svg_front;
			row_process_img.alt = '';
			addLongpressListener(row_process, processSaveEntry_internal, processSaveEntry_external);
			row_process.appendChild(row_process_img);
			let row_details = document.createElement('div');
			let row_details_inner = document.createElement('div');
			row_details.setAttribute('class', 'row-details');
			row_details_inner.setAttribute('class', 'row-details-inner');
			row_details_inner.appendChild(row_code);
			row_details_inner.appendChild(row_address);
			row_details.appendChild(row_details_inner);
			container.appendChild(row);
			row.appendChild(row_header);
			if(isLocalBookmark(key)) addLocalBookmarkInfo(row, row_header, key);
			row.appendChild(row_details);
			row.appendChild(row_process);
			row.data_process_continue_flag = false;
			var savedCityId = saveList[key].city_id;
			if(!isUsableCityId(savedCityId) && saveList[key].gp_id)
				savedCityId = saveList[key].gp_id;
			if(isUsableCityId(savedCityId)) {
				getCityFromId(savedCityId, function(city) {
					row.data_city = city;
					setSavedRowCodeText(row_code, savedCityDisplayName(city, saveList[key]), savedCode);
					if(row.data_process_continue_flag)
						processSaveEntry_continue(row);
				}, { notify: false });
			} else {
				row.data_city = null;
			}
		}
		queueSaveListEndIndicatorUpdate();
	}
	else {
		addClassIfPresent(document.getElementById('account_dialog_save_list_loader'), 'hide');
		removeClassIfPresent(document.getElementById('account_dialog_save_list_placeholder'), 'hide');
		queueSaveListEndIndicatorUpdate();
	}
}

function processSaveEntry_internal(e) {
	activateMapType();
	processSaveEntry(e);
}

function processSaveEntry_external(e) {
	initWCode_jumpToMap = true;
	processSaveEntry(e);
}

function processSaveEntry(e) {
	if(e && e.stopPropagation)
		e.stopPropagation();
	hideNotication();
	cleanUp();
	hideAccountDialog();
	var row = getSaveEntryRow((e && (e.currentTarget || e.target)) || null);
	if(!row)
		return;
	if(typeof row.data_city == 'undefined')
		row.data_process_continue_flag = true;
	else
		processSaveEntry_continue(row);
}

function processSaveEntry_continue(row) {
	if(!row || !row.data_city) {
		showNotification('Could not open saved address');
		return;
	}
	getCityCenterFromId(row.data_city, function(city) {
		var entry = saveList[row.data_key] || {};
		var savedCode = row.data_code && row.data_code.length ? row.data_code : normalizeSavedWcode(entry.code);
		if(typeof beginProgrammaticMapFocus == 'function')
			beginProgrammaticMapFocus();
		current_title = entry.title;
		current_segment = entry.segment;
		current_address_lines = readSavedAddressLines(entry);
		current_address = formatSavedAddress(current_address_lines);
		showAddress();
		decode_continue(city, savedCode);
	}, { refresh: true });
}

function getSaveEntryMenuRow(e) {
	if(menuSaveEntry)
		return menuSaveEntry;
	return getSaveEntryRow((e && (e.currentTarget || e.target)) || null);
}

function closeSaveEntryMenus() {
	var menu = document.getElementById('account_dialog_row_menu');
	if(menu) {
		menu.classList.add('hide');
		menu.setAttribute('aria-hidden', 'true');
	}
	var toggles = document.querySelectorAll('.row-menu-toggle[aria-expanded="true"]');
	for(var i = 0; i < toggles.length; i++)
		toggles[i].setAttribute('aria-expanded', 'false');
	menuSaveEntry = null;
}

function positionSaveEntryMenu(toggle) {
	var menu = document.getElementById('account_dialog_row_menu');
	var dialog = document.getElementById('saved_dialog');
	if(!menu || !dialog || !toggle)
		return;
	menu.classList.remove('hide');
	var toggleBox = toggle.getBoundingClientRect();
	var dialogBox = dialog.getBoundingClientRect();
	var menuHeight = menu.offsetHeight || 0;
	var top = toggleBox.bottom - dialogBox.top;
	if(top + menuHeight > dialogBox.height - 8)
		top = toggleBox.top - dialogBox.top - menuHeight;
	if(top < 8)
		top = 8;
	menu.style.top = Math.round(top) + 'px';
	menu.style.right = Math.round(dialogBox.right - toggleBox.right) + 'px';
}

function onSaveEntryMenuToggle(e) {
	if(e && e.stopPropagation)
		e.stopPropagation();
	if(e && e.preventDefault)
		e.preventDefault();
	var toggle = e.currentTarget;
	var row = getSaveEntryRow(toggle);
	var wasOpen = menuSaveEntry === row;
	closeSaveEntryMenus();
	if(wasOpen || !row)
		return;
	menuSaveEntry = row;
	updateBookmarkSyncMenu(row);
	toggle.setAttribute('aria-expanded', 'true');
	var menu = document.getElementById('account_dialog_row_menu');
	if(menu)
		menu.setAttribute('aria-hidden', 'false');
	positionSaveEntryMenu(toggle);
}

function editSaveEntry(e) {
	if(e && e.stopPropagation)
		e.stopPropagation();
	var row = getSaveEntryMenuRow(e);
	closeSaveEntryMenus();
	if(!row || !row.data_key || !saveList || !saveList[row.data_key])
		return;
	var entry = saveList[row.data_key];
	editingSaveKey = row.data_key;
	setAccountDialogAddOpen(true);
	document.getElementById('save_title_main').value = entry.title || '';
	document.getElementById('save_title_segment').value = entry.segment || '';
	setAccountDialogAddressFields(entry);
	if(lastActiveSaveEntry && lastActiveSaveEntry != row)
		toggleSaveEntry(lastActiveSaveEntry);
	if(!row.classList.contains('active'))
		toggleSaveEntry(row);
}

function deleteSaveEntry(e) {
	if(e && e.stopPropagation)
		e.stopPropagation();
	var user = getBookmarkUser();
	var row = getSaveEntryMenuRow(e);
	closeSaveEntryMenus();
	if(row && isLocalBookmark(row.data_key)) {
		var local = readLocalBookmarks();
		delete local[row.data_key];
		if(writeLocalBookmarks(local)) {
			if(editingSaveKey === row.data_key) onAccountDialogCancel();
			loadSaveList();
			showNotification('Bookmark deleted');
		}
		return;
	}
	if(user != null && row && row.data_key) {
		uid = user.uid;
		if(editingSaveKey === row.data_key) {
			editingSaveKey = null;
			setAccountDialogAddOpen(false);
			clearAccountDialogSaveForm();
		}
		firebase.database().ref('/UserData/'+uid+'/'+row.data_key).remove(function() {
			showNotification('Deleted record successfully');
		});
	}
}

function onPressSaveEntry(e) {
	if(e && e.target && (e.target.closest('.bookmark-info-toggle') || e.target.closest('.row-process') || e.target.closest('.row-menu-toggle') || e.target.closest('#account_dialog_row_menu')))
		return;
	var row = e.currentTarget || getSaveEntryRow(e.target);
	if(!row)
		return;
	if(lastActiveSaveEntry && lastActiveSaveEntry != row)
		toggleSaveEntry(lastActiveSaveEntry);
	toggleSaveEntry(row);
}

function toggleSaveEntry(e) {
	if(!e || !e.classList)
		return;
	if(e.classList.contains('active')) {
		e.classList.remove('active');
		lastActiveSaveEntry = null;
	}
	else {
		e.classList.add('active');
		lastActiveSaveEntry = e;
	}
	queueSaveListEndIndicatorUpdate();
}

function clearSaveEntry() {
	if(lastActiveSaveEntry) {
		lastActiveSaveEntry.classList.remove('active');
		lastActiveSaveEntry = null;
	}
}

window.addEventListener('resize', queueSaveListEndIndicatorUpdate);

window.addEventListener('storage', function(event) {
 if(event.key === LOCAL_BOOKMARKS_KEY) renderAllBookmarks();
});
