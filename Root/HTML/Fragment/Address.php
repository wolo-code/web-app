<div id='address_text' class='hide'>
	<div id='address_text_label'>Address</div>
	<span id='address_text_close' class="control" onclick='hideAddress();'>
		<span class='image'><?php echo file_get_contents('../../Resource/Close.svg'); ?></span>
	</span>
	<span id='address_text_main'>
		<div id='address_text_content'></div>
	</span>
	<span id='address_text_buttons'>
		<span class='address_text_button_spacer'></span>
		<img id='address_text_copy' class='control' onclick='copyAddress();' src='/resource/copy.svg' >
		<span class='address_text_button_spacer'></span>
	</span>
</div>
