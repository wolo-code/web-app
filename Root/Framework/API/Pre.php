<?php
	require_once '../API/API.php';
	require_once '../API/ComponentDetails.php';
	require_once '../API/Config.php';
	require_once '../API/IncludeSVG.php';

	if( isset($_GET['mode']) && ($_GET['mode'] === "prod") ) {
		$bPublish = TRUE;
		$variant = 'prod';
	}
	else if( isset($_GET['mode']) && ($_GET['mode'] === "dev") ) {
		$bPublish = TRUE;
		$variant = 'dev';
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
