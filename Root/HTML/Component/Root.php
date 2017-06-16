<?php
	require '../../HTML/Fragment/Overlay.php'
?>
<div id='map'></div>
<a id=logo href='https://wcodes.org' tabindex='1'>
	<span class='image'><?php echo file_get_contents('../../Resource/Logo.svg'); ?></span>
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
<script src='https://maps.googleapis.com/maps/api/js?key=AIzaSyD3qtN-ejbFTrkes1Y5j3qRY8PmQrxYHDQ&libraries=places&callback=initMap' async defer></script>
