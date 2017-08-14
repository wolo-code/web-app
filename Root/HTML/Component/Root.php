<?php
	require '../../HTML/Fragment/Overlay.php'
?>
<div id='map'></div>
<a id=logo_wcode href='https://wcodes.org' tabindex='1'>
	<span class='image'><?php echo file_get_contents('../../Resource/Logo_WCode.svg'); ?></span>
</a>
<a id=logo_location href='https://location.wcodes.org' tabindex='1'>
	<span class='image'><?php echo file_get_contents('../../Resource/Logo_location.svg'); ?></span>
</a>
<input id='pac-input' class='controls' type='text' placeholder='Search' tabindex='2' >
<div id='result'></div>
<input id='decode_button' class='control' type='button' value='Decode' tabindex='3' >
<div id='location_button' class='control' tabindex='4'>
	<span class='image'><?php echo file_get_contents('../../Resource/Location.svg'); ?></span>
</div>
<div id='info' class='control' tabindex='5'>
	<span class='image'><?php echo file_get_contents('../../Resource/Info.svg'); ?></span>
</div>
<div id='notification' class='hide'></div>
