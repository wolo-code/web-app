<div id='copy_wcode_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Copy WCode
	</h2>
	<div id='copy_wcode_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body'>
		<p class='secondary'>
			<span>Copy text with the city name?</span>
			<span id='copy_wcode_message_city_name'></span>
		</p>
		<div class="center message_dialog_control">
			<button id='copy_wcode_submit_no' class='dialog_message_primary' type='button'>No</button>
			<button id='copy_wcode_submit_yes' class='dialog_message_secondary' type='button'>Yes</button>
		</div>
		<div class="center message_dialog_separator"></div>
		<img id='copy_link_button' class="center control" src="<?php getSVG('', 'link'); ?>" >
	</div>
</div>