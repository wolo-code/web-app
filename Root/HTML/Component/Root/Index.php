<div id='map'></div>
<div id='map_input_suggestion_result' class='suggestion_result' data-input='pac-input' data-resize_input='false'></div>
<input id='pac-input' data-suggest='map_input_suggestion_result' data-handler='decode_button' class='controls' type='text' placeholder='Search' tabindex='3' >
<div id='decode_button' class='control' tabindex='4'>
	<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
</div>
<div id='decode_interface_overlay'>
	<div id='decode_input_container'>
		<div id='decode_input_suggestion_result' class='suggestion_result' data-input='decode_input' data-resize_input='true'></div>
		<input id='decode_input' data-suggest='decode_input_suggestion_result' data-handler='decode_input_button' type='text' placeholder="\ Wolo code /" autocomplete='off'>
		<div id='decode_input_button' class='control' tabindex='4'>
			<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
		</div>
	</div>
	<span id='decode_input_shadow'></span>
</div>
<div id='overlay' class="overlay hide">
	<div>
	<?php
		require '../../HTML/Fragment/Redirect.php';
		require '../../HTML/Fragment/External.php';
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
		<img id='account_user_image' alt='Account user image' class='hide' src='data:,'>
		<span id='account_default_image' class="inactive hide"><?php includeSVG('', 'Account'); ?></span>
	</span>
</div>
<div id='location_button' class='control' tabindex='5'>
	<span class='image'><?php includeSVG('', 'Location'); ?></span>
</div>
<div id='map_type_button' class='control' tabindex='6'>
	<span class='image'><?php includeSVG('', 'Map'); ?></span>
</div>
<div id='info' class='control' tabindex='7'>
	<span class='image'><?php includeSVG('', 'Info'); ?></span>
</div>
<div id='notification_top' class="notification_bar hide">Try: Bengaluru, India</div>
<?php require '../../HTML/Fragment/Accuracy.php' ?>
<div id='notification_bottom' class="notification_bar hide"></div>
<div id='footer-content-container' class='center'>
	<div id='footer-content' class='blur_background'>
		<a class='link-gray' href='/license'>&copy; <?php echo date('Y'); ?> </a>
		<a class='link' href='/about_me' rel='author'>Ujjwal Singh</a>
	</div>
</div>
<?php require '../../HTML/Fragment/Address.php'; ?>
<?php require '../../HTML/Fragment/Firebase_includes.php'; ?>
<script src='https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-auth.js'></script>
<script src='https://www.gstatic.com/firebasejs/ui/<?php echo $config['firebase_ui_version'] ?>/firebase-ui-auth.js'></script>
<link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/<?php echo $config['firebase_ui_version'] ?>/firebase-ui-auth.css" />
