<?php

function loadConfig() {
	global $variant; 
	
	$fHandle = fopen(__DIR__.'/../../Config/Vars.tsv', 'r');
	while(($tsvLine = fgetcsv($fHandle, 0, "\t", "\"", "\\")) !== FALSE) {
		if (isset($tsvLine[0], $tsvLine[1])) {
			$config[$tsvLine[0]] = trim($tsvLine[1]);
		}
	}
	fclose($fHandle);
	
	$variantPath = __DIR__.'/../../Config/Vars_'.$variant.'.tsv';
	if (file_exists($variantPath)) {
		$fHandle = fopen($variantPath, 'r');
		while(($tsvLine = fgetcsv($fHandle, 0, "\t", "\"", "\\")) !== FALSE) {
			if (isset($tsvLine[0], $tsvLine[1])) {
				$config[$tsvLine[0]] = trim($tsvLine[1]);
			}
		}
		fclose($fHandle);
	}

	return $config;
}

?>
