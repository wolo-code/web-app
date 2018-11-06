<div id='locate_right_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Location access
	</h2>
	<div id='locate_right_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body'>
		<p>
			Do you wish to allow this app to access your location?
		</p>
		<div class="center message_dialog_control">
			<button id='locate_right_message_yes' class="dialog_message_primary button_highlight" type='button'>Yes</button>
			<button id='locate_right_message_no' class='dialog_message_secondary' type='button'>No</button>
		</div>
		<div id='locate_right_message_dnd' class='hide'>
			<input id='locate_right_message_dnd_input' type='checkbox' >
			<label for='locate_right_message_dnd_input'>Do not ask again</label>
		</div>
	</div>
</div>
