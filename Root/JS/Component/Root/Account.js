function onAccount() {
	if(firebase.auth().currentUser)
		showAccountDialog();
	else
		onLogin();
}

function showAccountDialog() {
	showOverlay(document.getElementById('account_dialog_container'));
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
		document.getElementById('save_address').innerHTML = "&nbsp;Address";
		document.getElementById('save_address').classList.add('initial');
		account_dialog_address_active_first = true;
	}
}

function hideAccountDialog() {
	hideOverlay(document.getElementById('account_dialog_container'));
	clearAccountDialogSaveForm();
	clearSaveEntry();
}

function onAccountDialogSave() {
	if(!document.getElementById('save_title_main').value.length) {
		showNotification("Title is required");
		return;
	}
	if(locating) {
		showNotification("Still locating..");
		return;
	}
	
	var user = firebase.auth().currentUser;
	if(user != null) {
		uid = user.uid;
		if(document.getElementById('save_address').innerText == '\xa0\xa0Address (optional)' || document.getElementById('save_address').innerText == '')
			document.getElementById('save_address').innerText = address;
		saveAddress( document.getElementById('save_title_main').value,
			 document.getElementById('save_title_segment').value,
			 document.getElementById('save_address').innerText, 
			 clearAccountDialogSaveForm );
	}
}

function saveAddress(title, segment, address, callback) {
	if(firebase.auth().currentUser) {
		firebase.database().ref('/UserData/'+uid).push({
			city_id: getCodeCity().id,
			code: getCodeWCode(),
			title: title,
			segment: segment,
			address: address,
			time: firebase.database.ServerValue.TIMESTAMP
		}, function() {
			if(typeof callback != 'undefined')
				callback();
			showNotification('Address saved');
		});
	}
	else
		showNotification('Please login first to save address');
}

function clearAccountDialogSaveForm() {
	document.getElementById('save_title_main').value = '';
	document.getElementById('save_title_segment').value = '';
	document.getElementById('save_address').innerText = "\xa0\xa0Address";
	account_dialog_address_active_first = true;
}

function onAccountDialogAddressActive() {
	if (account_dialog_address_active_first) {
		account_dialog_address_active_first = false;
		document.getElementById('save_address').innerHTML = address;
	}
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
					let row_delete = document.createElement('span');
					let row_process = document.createElement('span');
					let row_process_img = document.createElement('img');
					row_header.setAttribute('class', 'row-header');
					row_title.setAttribute('class', 'row-title');
					row_title.innerText = saveList[key].title;
					row_segment.setAttribute('class', 'row-segment');
					row_segment.innerText = saveList[key].segment;
					row_header.appendChild(row_title);
					row_header.appendChild(row_segment);
					row.addEventListener('click', onPressSaveEntry);
					row.data_key = key;
					row_address.setAttribute('class', 'row-address');
					row_address.innerText = saveList[key].address;
					row_code.setAttribute('class', 'row-code');
					row_code.innerText = '\\' + ' ' + saveList[key].code.join(' ') + ' ' + '/';
					row_controls.setAttribute('class', 'row-controls');
					row_delete.setAttribute('class', 'row-delete');
					row_delete.innerText = 'Delete';
					row_delete.addEventListener('click', deleteSaveEntry);
					row_process.setAttribute('class', 'row-process');
					row_process_img.src = svg_front;
					addLongpressListener(row_process, processSaveEntry_external, processSaveEntry_internal);
					row_controls.appendChild(row_delete);
					row_process.appendChild(row_process_img);
					row_controls.appendChild(row_process);
					container.appendChild(row);
					row.appendChild(row_header);
					row.appendChild(row_code);
					row.appendChild(row_address);
					row_controls_container.setAttribute('class', 'row-controls-container');
					row_controls_container.appendChild(row_controls);
					row.appendChild(row_controls_container);
					row.data_process_continue_flag = false;
					getCityFromId(saveList[key].city_id, function(city) {
						row.data_city = city;
						if(row.data_process_continue_flag)
							processSaveEntry_continue(row);
					});
				}
			}
			else {
				document.getElementById('account_dialog_save_list_loader').classList.add('hide');
				document.getElementById('account_dialog_save_list_placeholder').classList.remove('hide');
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
	hideNotication();
	cleanUp();
	hideAccountDialog();
	var row = e.target.parentElement.parentElement.parentElement;
	if(typeof row.data_city == 'undefined')
		row.data_process_continue_flag = true;
	else
		processSaveEntry_continue(row);
}

function processSaveEntry_continue(row) {
	getCityCenterFromId(row.data_city, function(city) {
		document.getElementById('address_text_title').innerText = saveList[row.data_key].title;
		document.getElementById('address_text_segment').innerText = saveList[row.data_key].segment;
		document.getElementById('address_text_content').innerText = saveList[row.data_key].address;
		address_text.classList.remove('hide');
		current_title = saveList[row.data_key].title;
		current_segment = saveList[row.data_key].segment;
		current_address = saveList[row.data_key].address;
		decode_continue(city, saveList[row.data_key].code);
	});
}

function deleteSaveEntry(e) {
	var user = firebase.auth().currentUser;
	if(user != null) {
		uid = user.uid;
		firebase.database().ref('/UserData/'+uid+'/'+e.target.parentElement.parentElement.parentElement.data_key).remove(function() {
			showNotification('Deleted record successfully');
		});
	}
}

function onPressSaveEntry(e) {
	if(lastActiveSaveEntry && lastActiveSaveEntry != e.target)
		toggleSaveEntry(lastActiveSaveEntry);
	toggleSaveEntry(e.target);
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
}

function clearSaveEntry() {
	if(lastActiveSaveEntry) {
		lastActiveSaveEntry.classList.remove('active');
		lastActiveSaveEntry = null;
	}
}
