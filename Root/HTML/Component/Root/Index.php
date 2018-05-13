<?php
	require '../../HTML/Fragment/LocateRight.php';
	require '../../HTML/Fragment/NoCity.php';
	require '../../HTML/Fragment/Copy_wcode.html';
	require '../../HTML/Fragment/Overlay.php';
	require '../../HTML/Fragment/Incompatible_browser.html';
?>
<div id='map'></div>
<div id='wait_loader'></div>
<div id='logo'>
	<a id=logo_wcode href='//wcodes.org' tabindex='1'>
		<span class='image'><?php echo file_get_contents('../../Resource/Logo_WCode.svg'); ?></span>
	</a><a id=logo_location href='//location.wcodes.org' tabindex='2'>
		<span class='image'><?php echo file_get_contents('../../Resource/Logo_location.svg'); ?></span>
	</a>
</div>
<input id='pac-input' class='controls' type='text' placeholder='Search' tabindex='3' >
<div id='suggestion_result'></div>
<input id='decode_button' class='control' type='button' value='Decode' tabindex='4' >
<div id='location_button' class='control' tabindex='5'>
	<span class='image'><?php echo file_get_contents('../../Resource/Location.svg'); ?></span>
</div>
<div id='info' class='control' tabindex='6'>
	<span class='image'><?php echo file_get_contents('../../Resource/Info.svg'); ?></span>
</div>
<div id='notification_top' class='hide'>Try: Bangalore, India</div>
<div id='notification_bottom' class='hide'></div>
<?php require '../../HTML/Fragment/Address.php'; ?>
