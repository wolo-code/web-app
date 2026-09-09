<div id='invalid_code_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Unrecognized code
	</h2>
	<div id='invalid_code_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body'>
		<p>
			This does not look like a Wolo Code, DIGIPIN, or plus code.
		</p>
		<p id='invalid_code_query_wrap' class='hide'>
			<span id='invalid_code_query'></span>
		</p>
		<p>
			Correct the code, or search the map for this text.
		</p>
		<div class="center message_dialog_control">
			<button id='invalid_code_correct' class="border dialog_message_secondary invalid_code_action" type='button' aria-label='Correct'>
				<span class='image'><?php includeSVG('', 'Reverse'); ?></span>
			</button>
			<button id='invalid_code_search' class="border dialog_message_primary button_highlight invalid_code_action" type='button' aria-label='Search map'>
				<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
			</button>
		</div>
	</div>
</div>
