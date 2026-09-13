function onAccount() {
	if(firebase.auth().currentUser)
		showAccountDialog();
	else
		onLogin();
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
	if(current_address) {
		document.getElementById('save_address').innerText = current_address;
		document.getElementById('save_address').classList.remove('initial');
		account_dialog_address_active_first = false;
	}
	else {
		resetAccountDialogAddressField();
	}
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
	var dialog = document.getElementById('account_dialog');
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

function isSaveAddressPlaceholder(text) {
	var value = (text || '').replace(/\u00a0/g, ' ').trim().toLowerCase();
	return !value || value === 'address' || value === 'address (optional)';
}

function resetAccountDialogAddressField() {
	var field = document.getElementById('save_address');
	if(!field)
		return;
	field.textContent = 'Address';
	field.classList.add('initial');
	account_dialog_address_active_first = true;
}

function getAccountDialogSaveAddressText() {
	var field = document.getElementById('save_address');
	if(!field || account_dialog_address_active_first || field.classList.contains('initial') || isSaveAddressPlaceholder(field.innerText))
		return address || '';
	return field.innerText;
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
	var code = (words || []).join(' ');
	var city = cityName || '';
	row_code.innerText = '\\ ' + city + (city ? '\n' : '') + code + ' /';
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

	var user = firebase.auth().currentUser;
	if(user == null) {
		showNotification('Please login first to save address');
		return;
	}
	uid = user.uid;
	var segmentField = document.getElementById('save_title_segment');
	var segment = segmentField ? segmentField.value : '';
	var saveAddr = getAccountDialogSaveAddressText();
	current_title = title;
	current_segment = segment;
	current_address = saveAddr;
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

function saveAddress(title, segment, savedAddress, callback) {
	var user = firebase.auth().currentUser;
	if(!user) {
		showNotification('Please login first to save address');
		return;
	}
	uid = user.uid;
	var city = typeof getCodeCity == 'function' ? getCodeCity() : null;
	var code = normalizeSavedWcode(typeof getCodeWCode == 'function' ? getCodeWCode() : null);
	if(!city || typeof city.id == 'undefined' || city.id == null || !code.length) {
		showNotification('Locate or decode a Wolo Code first');
		return;
	}
	var payload = {
		uid: uid,
		city_id: city.id,
		gp_id: city.gp_id || null,
		city_name: typeof getProperCityAccent == 'function' ? getProperCityAccent(city) : (city.name || ''),
		code: code,
		title: title,
		segment: segment,
		address: savedAddress
	};
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
	var user = firebase.auth().currentUser;
	if(!user) {
		showNotification('Please login first to save address');
		return;
	}
	if(!key) {
		showNotification('Could not save address');
		return;
	}
	uid = user.uid;
	firebase.database().ref('/UserData/' + uid + '/' + key).update({
		title: title,
		segment: segment,
		address: savedAddress
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

function onAccountDialogAddressActive() {
	if (account_dialog_address_active_first) {
		account_dialog_address_active_first = false;
		var field = document.getElementById('save_address');
		field.classList.remove('initial');
		field.innerText = address || '';
	}
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

function loadSaveList() {
	saveList = [];
	lastActiveSaveEntry = null;
	var user = firebase.auth().currentUser;
	if(user != null) {
		uid = user.uid;
		var container = document.getElementById('account_dialog_save_list');
		firebase.database().ref('/UserData/'+uid).on('value', function(snapshot) {
			document.getElementById('account_dialog_save_list').innerHTML = '';
			document.getElementById('account_dialog_save_list_end').classList.add('hide');
			closeSaveEntryMenus();
			saveList = snapshot.val();
			if(saveList && Object.keys(saveList).length) {
				document.getElementById('account_dialog_save_list_loader').classList.add('hide');
				document.getElementById('account_dialog_save_list_placeholder').classList.add('hide');
				for(let key in saveList) {
					let row = document.createElement('div');
					let row_header = document.createElement('div');
					let row_title = document.createElement('div');
					let row_segment = document.createElement('div');
					let row_controls_container = document.createElement('div');
					let row_controls = document.createElement('div');
					let row_address = document.createElement('div');
					let row_code = document.createElement('div');
					let row_process = document.createElement('span');
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
					row_address.innerText = saveList[key].address;
					row_code.setAttribute('class', 'row-code');
					setSavedRowCodeText(row_code, savedCityDisplayName(null, saveList[key]), savedCode);
					row_controls.setAttribute('class', 'row-controls');
					row_process.setAttribute('class', 'row-process');
					row_process.setAttribute('title', 'Go');
					row_process.setAttribute('aria-label', 'Go');
					row_process_img.src = svg_front;
					row_process_img.alt = '';
					addLongpressListener(row_process, processSaveEntry_internal, processSaveEntry_external);
					row_process.appendChild(row_process_img);
					row_controls.appendChild(row_process);
					row_controls_container.setAttribute('class', 'row-controls-container');
					row_controls_container.appendChild(row_controls);
					let row_details = document.createElement('div');
					let row_details_inner = document.createElement('div');
					row_details.setAttribute('class', 'row-details');
					row_details_inner.setAttribute('class', 'row-details-inner');
					row_details_inner.appendChild(row_code);
					row_details_inner.appendChild(row_address);
					row_details_inner.appendChild(row_controls_container);
					row_details.appendChild(row_details_inner);
					container.appendChild(row);
					row.appendChild(row_header);
					row.appendChild(row_details);
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
				document.getElementById('account_dialog_save_list_loader').classList.add('hide');
				document.getElementById('account_dialog_save_list_placeholder').classList.remove('hide');
				queueSaveListEndIndicatorUpdate();
			}
		})
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
		if(typeof setAddressPanelHeading == 'function')
			setAddressPanelHeading(entry.title, entry.segment);
		else {
			document.getElementById('address_text_title').innerText = entry.title || '';
			document.getElementById('address_text_segment').innerText = entry.segment || '';
		}
		document.getElementById('address_text_content').innerText = entry.address || '';
		address_text.classList.remove('hide');
		current_title = entry.title;
		current_segment = entry.segment;
		current_address = entry.address;
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
	var dialog = document.getElementById('account_dialog');
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
	var field = document.getElementById('save_address');
	if(entry.address) {
		field.innerText = entry.address;
		field.classList.remove('initial');
		account_dialog_address_active_first = false;
	}
	else {
		resetAccountDialogAddressField();
	}
	if(lastActiveSaveEntry && lastActiveSaveEntry != row)
		toggleSaveEntry(lastActiveSaveEntry);
	if(!row.classList.contains('active'))
		toggleSaveEntry(row);
}

function deleteSaveEntry(e) {
	if(e && e.stopPropagation)
		e.stopPropagation();
	var user = firebase.auth().currentUser;
	var row = getSaveEntryMenuRow(e);
	closeSaveEntryMenus();
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
	if(e && e.target && (e.target.closest('.row-process') || e.target.closest('.row-menu-toggle') || e.target.closest('#account_dialog_row_menu')))
		return;
	var row = e.currentTarget || getSaveEntryRow(e.target);
	if(!row)
		return;
	if(lastActiveSaveEntry && lastActiveSaveEntry != row)
		toggleSaveEntry(lastActiveSaveEntry);
	toggleSaveEntry(row);
}

function toggleSaveEntry(e) {
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
