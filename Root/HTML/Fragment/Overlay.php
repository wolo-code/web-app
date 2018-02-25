<div id='overlay' class='hide'>
	<div id='overlay_message'>
		<div id='overlay_message_close' class="message_dialog_close control">
			<span class='image'><?php echo file_get_contents('../../Resource/Close.svg'); ?></span>
		</div>
		<h1>
			WCode location
		</h1>
<?php
	echo file_get_contents('../../HTML/Fragment/Info_intro.html');
	require '../../HTML/Fragment/Info_full.php';
?>
		<div id='agency'>
			by <a class='link' href='https://wcodes.org/about_me'>Ujjwal Singh</a>
		</div>
	</div>
</div>
