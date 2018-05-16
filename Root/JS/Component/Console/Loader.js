function beginLoader() {
	idLoader = setTimeout(function(){endLoader('unauthenticated')}, 2500);
}

function endLoader(status) {
	clearTimeout(idLoader);
	idLoader = null;
	if(status == 'authenticated')
		showConsloeBlock();
	else if('unauthenticated')
		showRestrictedBlock();
}
