<?php
	require_once '../API/API.php';
	require_once '../API/Config.php';
	require_once '../API/IncludeSVG.php';

	$config = loadConfig();

	if( isset($_GET['mode']) && ($_GET['mode'] === "publish") )
		$bPublish = TRUE;
	else
		$bPublish = FALSE;

	$id = getComponent();
	if(strlen($id) == 0)
		$id = "root";
?>