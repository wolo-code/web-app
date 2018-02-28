<?php
	require_once '../API/IncludeDir.php';
	if($component == "")
		$component_dir = "";
	else
		$component_dir = "component/$component/";
	includeDirHeader('../../HTML/'.$component_dir, false);
?>
