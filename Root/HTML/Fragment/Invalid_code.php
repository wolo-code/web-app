<div id='invalid_code_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Unrecognized code
	</h2>
	<div id='invalid_code_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body'>
		<p>
			Invalid Wolo Code, DIGIPIN, or Plus Code
		</p>
		<p id='invalid_code_query_wrap' class='hide'>
			<span id='invalid_code_query'></span>
		</p>
		<div class="invalid_code_actions">
			<button id='invalid_code_correct' class="border invalid_code_action" type='button'>
				<span class='image'><?php includeSVG('', 'Reverse'); ?></span>
				Edit code
			</button>
			<button id='invalid_code_search' class="border invalid_code_action" type='button'>
				Search map
				<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
			</button>
		</div>
	</div>
</div>
