<div id='copy_wcode_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Share
	</h2>
	<div id='share_wcode_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body'>
		<p>
			<span>Text</span>
			<input id='share_include_city' type='checkbox'>
			include 
			<span id='copy_wcode_message_city_name'></span>
			<span class='message_dialog_control_right'>
				<img id='share_copy_button' class="center control" src="<?php getSVG('', 'code'); ?>" >
			</span>
		</p>
		<hr>
		<p>
			<span>Link</span>
			<input id='share_jumto_map' type='checkbox'>
			jump directly to map
			<span class='message_dialog_control_right'>
				<img id='share_link_button' class="center control" src="<?php getSVG('', 'link'); ?>" >
			</span>
		</p>
		<hr>
		<p>
			<span>QR</span>
			<input id='qr_pre_title_main' type='text' placeholder="Title e.g. Taj Mahal (optional)">
			<input id='qr_pre_title_segment' type='text' placeholder="Section e.g. West gate (optional)">
			<span class="message_dialog_control_right">
				<img id='share_qr_button' class="center control" src="<?php getSVG('', 'qr'); ?>" >
			</span>
		</p>
	</div>
</div>
