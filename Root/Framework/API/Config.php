<?php

function loadConfig() {
	global $variant; 
	
	$fHandle = fopen(__DIR__.'/../../Config/Vars.tsv', 'r');
	while(($tsvLine = fgetcsv($fHandle, 0, "\t")) !== FALSE) {
		$config[$tsvLine[0]] = $tsvLine[1];
	}
	fclose($fHandle);
	
	$fHandle = fopen(__DIR__.'/../../Config/Vars_'.$variant.'.tsv', 'r');
	while(($tsvLine = fgetcsv($fHandle, 0, "\t")) !== FALSE) {
		$config[$tsvLine[0]] = $tsvLine[1];
	}
	fclose($fHandle);

	return $config;
}

?>
