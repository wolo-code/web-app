<div id='locate_right_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Location access
	</h2>
	<div id='locate_right_message_close' class="message_dialog_close control">
		<span class='image'><?php echo file_get_contents('../../Resource/Close.svg'); ?></span>
	</div>
	<div id='locate_right_message_body'>
		<p>
			Do you wish to allow this app to access your location?
		</p>
		<div class="center message_dialog_control">
			<button id='locate_right_message_yes' type='button' onclick="locateRight_grant();">Yes</button>
			<button id='locate_right_message_no' type='button' onclick="locateRight_deny();">No</button>
		</div>
	</div>
</div>
