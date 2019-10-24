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
			<button id='info_full_close_button' class='button_highlight' type='button'><span class='indicator'>&#x25C4;</span> return</button>
		</div>
	</div>
	<div id='software_info'>
		<div id='version'>
			Version: <span>0.1 beta</span>
		</div>
		<div id='updated'>Updated:
			<span>
	<?php
			echo date('Y M d - H:i:s');
	?>
			</span> (UTC)
		</div>
	</div>
	<div>
		<p>
			website: <a class='link' href='//wcodes.org/location'>wcodes.org/location</a>
		</p>
		<p id='contact'>
			contact: <a class='link' href="mailto:ujjwal@wcodes.org?subject=WCode location">ujjwal@wcodes.org</a>
		</p>
	</div>
</div>
