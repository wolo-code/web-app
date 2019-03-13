function beginLoader() {
	idLoader = setTimeout(function(){ endLoader('unauthenticated'); }, 2500);
}

function endLoader(status) {
	clearTimeout(idLoader);
	idLoader = -1;
	if(status == 'authenticated')
		showConsloeBlock();
	else if('unauthenticated')
		showRestrictedBlock();
}
