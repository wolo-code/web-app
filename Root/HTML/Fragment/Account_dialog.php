<div id='account_dialog_container' class="center hide">
	<div id='account_dialog' class='message_dialog'>
		<h2 id='account_dialog_label' class='message_dialog_label'>
			Account
		</h2>
		<div id='account_dialog_close' class="message_dialog_close control">
			<span class='image'><?php includeSVG('', 'Close'); ?></span>
		</div>
		<div class='message_dialog_body'>
			<div id='account_dialog_main'>
				<div class='span-left'>
					<div id='account_dialog_display_name'></div>
					<div id='account_dialog_email'></div>
				</div>
				<div class='message_dialog_control_container'>
					<div id='account_dialog_logout' class='message_dialog_control'>
						<button id='account_dialog_logout_button' class="border control" type='button'>Logout</button>
					</div>
				</div>
			</div>
			<div class='hr-separator'></div>
			<h3 class='dialog-sub-label'>
				Current
			</h3>
			<div id='account_dialog_options'>
				<div id='save_title_container' class='center'>
					<input id='save_title_main' type='text' placeholder="&nbsp;&nbsp;Title">
					<input id='save_title_segment' type='text' placeholder="&nbsp;&nbsp;Segment">
				</div>
				<div id='save_address_container'>
					<div id='save_address' class='initial' contentEditable>&nbsp;&nbsp;Address</div>
				</div>
				<div class='message_dialog_control_container'>
					<div id='account_dialog_save' class="message_dialog_control center">
						<button id='account_dialog_save_button' class="border control" type='button'>Save</button>
					</div>
				</div>
				<div id='waddress_list_container'></div>
			</div>
			<div class='hr-separator'></div>
			<h3 class='dialog-sub-label'>
				Saved
			</h3>
			<div id='account_dialog_save_list_container'>
				<div id='account_dialog_save_list_loader' class='center'>-loading-</div>
				<div id='account_dialog_save_list_placeholder' class="center hide">-empty-</div>
				<div id=account_dialog_save_list></div>
			</div>
		</div>
	</div>
</div>
