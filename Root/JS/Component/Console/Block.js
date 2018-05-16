function showRestrictedBlock() {
	console_block.classList.add('hide');
	restrict_block.classList.remove('hide');
}

function showConsloeBlock() {
	restrict_block.classList.add('hide');	
	console_block.classList.remove('hide');
	if(map_processed)
		initialize();
	else
		auth_processed = true;
}
