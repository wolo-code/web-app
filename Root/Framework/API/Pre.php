<?php
	require_once '../API/API.php';
	require_once '../API/Config.php';
	require_once '../API/IncludeSVG.php';

	if( isset($_GET['mode']) && ($_GET['mode'] === "publish") ) {
		$bPublish = TRUE;
		$variant = 'prod';
	}
	else {
		$bPublish = FALSE;
		$variant = 'dev';
	}

	$config = loadConfig();

	$id = getComponent();
	if(strlen($id) == 0)
		$id = "root";
?>
