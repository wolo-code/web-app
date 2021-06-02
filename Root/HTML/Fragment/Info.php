<div id='info_message' class='hide'>
	<div id='info_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='logo_info'>
		<a id=logo_wolo_info href='//wcodes.org' tabindex='1'>
			<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
		</a>
		<a id=logo_codes_info href='//wolo.codes' tabindex='2'>
			<span class='image'><?php includeSVG('', 'logo_codes'); ?></span>
		</a>
	</div>
	<?php echo file_get_contents('../../HTML/Fragment/Info_common.html'); ?>
	<?php
		require '../../HTML/Fragment/Info_intro.php';
		require '../../HTML/Fragment/Info_full.php';
	?>
	<div id='agency'>
		by <a class='link' href='https://wcodes.org/about_me'>Ujjwal Singh</a>
	</div>
</div>
