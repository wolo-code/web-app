<?php
	require_once '../API/API.php';

	if( isset($_GET['mode']) && ($_GET['mode'] === "publish") )
		$bPublish = TRUE;
	else
		$bPublish = FALSE;

	require '../../HTML/Template/Base.php';
?>
