<?php
	require '../../HTML/Fragment/NoCity.php';
	require '../../HTML/Fragment/Copy_wcode.php';
	require '../../HTML/Fragment/ChooseCity.php';
	require '../../HTML/Fragment/LocateRight.php';
	require '../../HTML/Fragment/Overlay.php';
	require '../../HTML/Fragment/Incompatible_browser.html';
?>
<div id='map'></div>
<div id='wait_loader'></div>
<div id='logo' class='blur_background'>
	<a id=logo_wcode href='//wcodes.org' tabindex='1'>
		<span class='image'><?php includeSVG('', 'Logo_WCode'); ?></span>
	</a><a id=logo_location href='//location.wcodes.org' tabindex='2'>
		<span class='image'><?php includeSVG('', 'Logo_location'); ?></span>
	</a>
</div>
<input id='pac-input' class='controls' type='text' placeholder='Search' tabindex='3' >
<div id='suggestion_result'></div>
<input id='decode_button' class='control' type='button' value='Decode' tabindex='4' >
<div id='location_button' class='control' tabindex='5'>
	<span class='image'><?php includeSVG('', 'Location'); ?></span>
</div>
<input id='map_type_button' class='control' type='button' value='Map' tabindex='6' >
<div id='info' class='control' tabindex='7'>
	<span class='image'><?php includeSVG('', 'Info'); ?></span>
</div>
<div id='notification_top' class="notification_bar hide">Try: Bengaluru, India</div>
<div id='notification_bottom' class="notification_bar hide"></div>
<div id='footer-content-container' class='center'>
	<div id='footer-content' class='blur_background'>
		<a class="link-gray" href='wcodes.org/license'>Copyright &copy; 2019</a>
		<a class="link" href='wcodes.org/about_me'>Ujjwal Singh</a><a class='content-link' target='_blank' href='/about_me' rel='author'></a>
	</div>
</div>
<?php require '../../HTML/Fragment/Address.php'; ?>
