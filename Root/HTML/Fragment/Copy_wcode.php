<div id='copy_wcode_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Share
	</h2>
	<div id='share_wcode_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body'>
		<p>
			<div class='message_dialog_subtitle'>
				<span class='message_dialog_subtitle_icon'>
					<img id='share_copy_button' alt='Copy Wolo Code text button' class='center' src="<?php getSVG('', 'code'); ?>" >
				</span>
				<span class='message_dialog_subtitle_label'>Text</span>
			</div>
			<div class='message_dialog_subtitle_text'>
				<span>include</span> <span id='copy_wcode_message_city_name'></span> ?
			</div>
			<div class='message_dialog_control_container'>
				<div class="center message_dialog_control">
					<button id='share_copy_button_text_city' class="border dialog_message_primary button_highlight" type='button'>Yes</button>
					<button id='share_copy_button_text_nocity' class="border dialog_message_secondary" type='button'>No</button>
				</div>
			</div>
		</p>
		<hr>
		<p>
			<div class='message_dialog_subtitle'>
				<span class='message_dialog_subtitle_icon'>
					<img id='share_link_button' alt='Copy Wolo code link button' class='center' src="<?php getSVG('', 'link'); ?>" >
				</span>
				<span class='message_dialog_subtitle_label'>Link</span>
			</div>
			<div id='share_jumto_map' class='message_dialog_subtitle_text'>
				jump directly to map ?
			</div>
			<div class='message_dialog_control_container'>
				<div class="center message_dialog_control">
					<button id='share_copy_button_link_jump' class="border dialog_message_primary button_highlight" type='button'>Yes</button>
					<button id='share_copy_button_link_nojump' class="border dialog_message_secondary" type='button'>No</button>
				</div>
			</div>
		</p>
		<hr>
		<p>
			<div class='message_dialog_subtitle'>
				<span class='message_dialog_subtitle_icon'>
					<img id='share_qr_button' alt='Generate Wolo Code label' class='center' src="<?php getSVG('', 'label'); ?>" >
				</span>
				<span class='message_dialog_subtitle_label'>Label</span>
			</div>
			<div class='message_dialog_control_container'>
				<div class="center message_dialog_control">
					<button id='share_copy_button_qr' class="border dialog_message_primary button_highlight" type='button'>Go</button>
				</div>
			</div>
		</p>
	</div>
</div>
