<?php
	require '../../HTML/Fragment/Overlay.php';
	require '../../HTML/Fragment/LocateRight.php';
	require '../../HTML/Fragment/NoCity.php';
?>
<div id='map'></div>
<div id='logo'>
	<a id=logo_wcode href='https://wcodes.org' tabindex='1'>
		<span class='image'><?php echo file_get_contents('../../Resource/Logo_WCode.svg'); ?></span>
	</a><a id=logo_location href='https://location.wcodes.org' tabindex='2'>
		<span class='image'><?php echo file_get_contents('../../Resource/Logo_location.svg'); ?></span>
	</a>
</div>
<input id='pac-input' class='controls' type='text' placeholder='Search' tabindex='3' >
<div id='result'></div>
<input id='decode_button' class='control' type='button' value='Decode' tabindex='4' >
<div id='location_button' class='control' tabindex='5'>
	<span class='image'><?php echo file_get_contents('../../Resource/Location.svg'); ?></span>
</div>
<div id='info' class='control' tabindex='6'>
	<span class='image'><?php echo file_get_contents('../../Resource/Info.svg'); ?></span>
</div>
<div id='notification_top' class='hide'>Try: Bangalore, India</div>
<div id='notification_bottom' class='hide'></div>
<div id='address_text' class='hide'>
	<span id='address_text_main'>
		<div id='address_text_label'>Address</div>
		<div id='address_text_content'></div>
	</span>
	<span id='address_text_buttons'>
		<span id='address_text_close' class="control" onclick='hideAddress();'>
			<span class='image'><?php echo file_get_contents('../../Resource/Close.svg'); ?></span>
		</span>
		<img id='address_text_copy' class='control' onclick='copyAddress();' src='/resource/copy.svg' >
	</span>
</div>
