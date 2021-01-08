<div id='overlay' class="overlay hide">
	<div>
	<?php
		require '../../HTML/Fragment/Redirect.php';
		require '../../HTML/Fragment/NoCity.php';
		require '../../HTML/Fragment/Copy_wcode.php';
		require '../../HTML/Fragment/ChooseCity_by_name.php';
		require '../../HTML/Fragment/ChooseCity_by_periphery.php';
		require '../../HTML/Fragment/LocateRight.php';
		require '../../HTML/Fragment/Info.php';
		require '../../HTML/Fragment/Incompatible_browser.html';
		require '../../HTML/Fragment/QR.php';
		require '../../HTML/Fragment/Authentication.php';
		require '../../HTML/Fragment/Account_Dialog.php';
	?>
	</div>
</div>

<div id='map'></div>
<div id='wait_loader'></div>
<div id='logo' tabindex='1'>
	<a id=logo_wolo class='blur_background' href='//wolo.codes'>
		<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
	</a>
	<a id=logo_codes class='blur_background' href='//wolo.codes'>
		<span class='image'><?php includeSVG('', 'logo_codes'); ?></span>
	</a>
</div>
<div id='account' class="control">
	<span class='image'>
		<img id='account_user_image' class='hide'>
		<span id='account_default_image' class="inactive hide"><?php includeSVG('', 'Account'); ?></span>
	</span>
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
<?php require '../../HTML/Fragment/Accuracy.php' ?>
<div id='notification_bottom' class="notification_bar hide"></div>
<div id='footer-content-container' class='center'>
	<div id='footer-content' class='blur_background'>
		<a class='link-gray' href='/license'>Copyright &copy; <?php echo date('Y'); ?></a>
		<a class='link' href='/about_me' rel='author'>Ujjwal Singh</a>
	</div>
</div>
<?php require '../../HTML/Fragment/Address.php'; ?>
<?php require '../../HTML/Fragment/Firebase_includes.php'; ?>
<script src='https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-auth.js'></script>
<script src='https://www.gstatic.com/firebasejs/ui/<?php echo $config['firebase_ui_version'] ?>/firebase-ui-auth.js'></script>
<link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/<?php echo $config['firebase_ui_version'] ?>/firebase-ui-auth.css" />
