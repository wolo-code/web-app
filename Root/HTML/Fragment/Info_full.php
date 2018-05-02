<div id='info_full' class='hide'>
	<?php echo file_get_contents('../../HTML/Fragment/Info_common.html'); ?>
	<h2>
		Info
	</h2>
	<ul>
		<li>Your precise location will NOT be recorded</li>
		<li>Tested with Google Chrome</li>
	</ul>
	<div class='message_dialog_control_container'>
		<div class='message_dialog_control'>
			<button id='info_full_close_button' type='button'>&#x25C1; return</button>
		</div>
	</div>
	<div id='software_info'>
		<div id='version'>
			Version: 0.1 beta
		</div>
		<div id='updated'>Updated:
	<?php
			echo date('Y-M-d H:i:s');
	?>
		</div>
	</div>
	<div id='contact'>
		for any related query contact me
	</div>
</div>
