<?php
	require_once '../API/IncludeDir.php';
	if($component == "") {
		$component_dir = "";
		$component_script = "script";
	}
	else {
		$component_dir = "component/$component/";
		$component_script = "$component";
	}
	
	if($bPublish) {
?>
	<script>
<?php
		includeDir('../JS/Base/', $INCLUDE_TYPE_JS, $INCLUDE_MODE_EMBED, '');
		includeDir('../../JS/'.$component_dir.'Base/', $INCLUDE_TYPE_JS, $INCLUDE_MODE_EMBED, '');
?>
	</script>
	<script src="/<?php echo $component_script ?>.js" defer></script>
<?php
	}
	else {
		includeDir('../../Framework/JS/', $INCLUDE_TYPE_JS, $INCLUDE_MODE_LINK, '');
		includeDir('../../JS/'.$component_dir, $INCLUDE_TYPE_JS, $INCLUDE_MODE_LINK, '');
	}
?>
