<?php
	require_once '../API/API.php';
	require_once '../API/IncludeDir.php';

	header('Content-Type: text/javascript');

	$component_id = getOrigCallComponent();
	includeDir('../../CSS/Component/'.$component_id.'/', $INCLUDE_TYPE_JS, $INCLUDE_MODE_EMBED, 'base');
?>
