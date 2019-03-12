<div id='no_city_message' class="message_dialog hide">
	<h2 class='message_dialog_label'>
		Add city
	</h2>
	<div id='no_city_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='no_city_message_prompt' class='message_dialog_body'>
		<p>
			This location appears to not be in the database.<br>
			Do you want it to be added?
		</p>
		<div class="center message_dialog_control">
			<button id='no_city_submit_yes' class='border' type='button'>Yes</button>
			<button id='no_city_submit_no' class='border' type='button'>No</button>
		</div>
	</div>
	<div id='no_city_message_wait' class="message_dialog_body hide">
		<div class="loader center"></div>
		<p>
			Waiting for your city add request to be processed by backend team.<br>
			This involves manual intervention and may take hours.<br>
			Do you wish to stop or continue waiting?
		</p>
		<div class="center message_dialog_control">
			<button id='no_city_submit_wait_continue' class='border' type='button'>Continue</button>
			<button id='no_city_submit_wait_stop' class='border' type='button'>Stop</button>
		</div>
	</div>
</div>
