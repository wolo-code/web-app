<?php
	require_once '../API/IncludeDir.php';
	if($component == "") {
		$component_dir = "";
		$component_style = "style";
	}
	else {
		$component_dir = "component/$component/";
		$component_style = "$component";
	}
	if($bPublish) {
?>
	<style>
<?php
		includeDir('../CSS/Base/', $INCLUDE_TYPE_CSS, $INCLUDE_MODE_EMBED, '');
		includeDir('../../CSS/'.$component_dir.'Base/', $INCLUDE_TYPE_CSS, $INCLUDE_MODE_EMBED, '');
?>
	</style>
<?php
		if(hasLink($INCLUDE_TYPE_CSS, '../CSS/', '../../CSS/')) {
?>
	<link rel='stylesheet' href='/<?php echo $component_script ?>.css' >
<?php
		}
	}
	else {
		includeDir('../../Framework/CSS/', $INCLUDE_TYPE_CSS, $INCLUDE_MODE_LINK, '');
		includeDir('../../CSS/'.$component_dir, $INCLUDE_TYPE_CSS, $INCLUDE_MODE_LINK, '');
	}
?>
