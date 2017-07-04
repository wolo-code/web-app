<?php
	require_once '../API/API.php';
	require_once '../API/Config.php';

	$config = loadConfig();
	
	if( isset($_GET['mode']) && ($_GET['mode'] === "publish") )
		$bPublish = TRUE;
	else
		$bPublish = FALSE;

	require '../../HTML/Template/Base.php';
?>
