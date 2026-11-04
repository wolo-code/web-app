<div id='no_city_message' class="message_dialog hide" role='dialog' aria-modal='true' aria-labelledby='no_city_title'>
	<h2 id='no_city_title' class='message_dialog_label'>
		Propose a city
	</h2>
	<button id='no_city_message_close' type='button' class="message_dialog_close control" aria-label='Close city proposal'>
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</button>
	<div id='no_city_message_prompt' class='message_dialog_body'>
		<p>
			Suggest a city for Wolo. After submission, an email draft opens so you can add detailed information.
		</p>
		<label for='no_city_name'>City name</label>
		<input id='no_city_name' type='text' required maxlength='160' autocomplete='address-level2' placeholder='e.g. Pokhara'>
		<label for='no_city_country'>Country or region (optional)</label>
		<input id='no_city_country' type='text' maxlength='160' autocomplete='country-name' placeholder='e.g. Nepal'>
		<label class='city_proposal_location'><input id='no_city_include_location' type='checkbox'> Include selected map location</label>
		<p id='no_city_location'>No map location selected</p>
		<div class="center message_dialog_control">
			<button id='no_city_submit_yes' class='border' type='button'>Submit request</button>
			<button id='no_city_submit_no' class='border' type='button'>Cancel</button>
		</div>
	</div>
	<div id='no_city_message_wait' class="message_dialog_body hide" aria-live='polite'>
		<div id='no_city_request_loader' class="loader center"></div>
		<p id='no_city_request_status'>Submitting your city proposal…</p>
		<div id='no_city_request_details' class='hide'>
			<p>Request ID: <span id='no_city_request_id'></span></p>
			<p><a id='no_city_email_details' class='link' data-u='support' data-d='wolo.codes'>Add details by email</a></p>
			<p>If a draft did not open, use the link above. You can edit the email before sending.</p>
		</div>
		<div class="center message_dialog_control">
			<button id='no_city_submit_wait_continue' class='border' type='button'>Close</button>
			<button id='no_city_new_request' class='border' type='button'>Propose another city</button>
		</div>
	</div>
</div>
