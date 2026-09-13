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
				<div id='account_dialog_profile'>
					<div id='account_dialog_avatar'>
						<img id='account_dialog_user_image' alt='Account user image' class='hide' src='data:,'>
						<span id='account_dialog_default_image'><?php includeSVG('', 'Account'); ?></span>
					</div>
					<div id='account_dialog_identity'>
						<div id='account_dialog_display_name'></div>
						<div id='account_dialog_email'></div>
					</div>
					<button id='account_dialog_logout_button' class="control" type='button' title='Logout' aria-label='Logout'>
						<span class='image'><?php includeSVG('', 'Logout'); ?></span>
					</button>
				</div>
				<div id='account_dialog_prefs'>
					<div class='account_dialog_fold_inner'>
						<div id='account_dialog_theme' class='account_dialog_theme'>
							<?php require __DIR__ . '/Theme_selector.php'; ?>
							<?php require __DIR__ . '/Map_source_selector.php'; ?>
						</div>
						<div class='hr-separator'></div>
					</div>
				</div>
			</div>
			<div id='account_dialog_saved_heading'>
				<div id='account_dialog_saves_hit'>
					<h3 class='dialog-sub-label'>
						Saved
					</h3>
					<button id='account_dialog_saves_toggle' class='account_dialog_heading_action control' type='button' title='Saved addresses' aria-label='Saved addresses' aria-expanded='false'>
						<span class='image'><?php includeSVG('', 'Caret'); ?></span>
					</button>
				</div>
				<button id='account_dialog_add_toggle' class='account_dialog_heading_action control' type='button' title='Add address' aria-label='Add address' aria-expanded='false'>
					<span class='image'><?php includeSVG('', 'Plus'); ?></span>
				</button>
			</div>
			<div id='account_dialog_options' class='hide'>
				<div id='save_title_container'>
					<input id='save_title_main' type='text' placeholder="Title – e.g. Home" aria-label='Title'>
					<input id='save_title_segment' type='text' placeholder="Segment – e.g. Main gate" aria-label='Segment'>
				</div>
				<div id='save_address_container'>
					<div id='save_address' class='initial' contentEditable>Address</div>
				</div>
				<div class='message_dialog_control_container'>
					<div id='account_dialog_cancel' class="message_dialog_control">
						<button id='account_dialog_cancel_button' class="control" type='button'>cancel</button>
					</div>
					<div id='account_dialog_save' class="message_dialog_control">
						<button id='account_dialog_save_button' class="control" type='button'>save</button>
					</div>
				</div>
			</div>
			<div id='account_dialog_save_list_container' aria-hidden='true'>
				<div class='account_dialog_fold_inner'>
					<div id='account_dialog_save_list_loader' class='account_dialog_save_list_indicator'>loading...</div>
					<div id='account_dialog_save_list_placeholder' class="account_dialog_save_list_indicator hide">-empty-</div>
					<div id=account_dialog_save_list></div>
					<div id='account_dialog_save_list_end' class="account_dialog_save_list_indicator hide">— * —</div>
				</div>
			</div>
		</div>
		<div id='account_dialog_row_menu' class='row-menu-list hide' role='menu' aria-hidden='true'>
			<button type='button' id='account_dialog_row_edit' class='row-edit' role='menuitem'>Edit</button>
			<button type='button' id='account_dialog_row_delete' class='row-delete' role='menuitem'>Delete</button>
		</div>
		<div id='account_dialog_more_icon_template' class='hide' aria-hidden='true'>
			<span class='image'><?php includeSVG('', 'More'); ?></span>
		</div>
	</div>
</div>
