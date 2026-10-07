<div id='account_dialog_container' class="center hide">
	<div id='account_dialog' class='message_dialog saved-compatible-dialog'>
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
		</div>
	</div>
</div>
<div id='saved_dialog_container' class='center hide'>
	<div id='saved_dialog' class='message_dialog saved-compatible-dialog saves-open'>
		<h2 class='message_dialog_label'>Saved</h2>
		<button id='saved_dialog_close' type='button' class='message_dialog_close control' aria-label='Close saved'>
			<span class='image'><?php includeSVG('', 'Close'); ?></span>
		</button>
		<div class='message_dialog_body'>
			<div id='account_dialog_saved_heading'>
				<div id='account_dialog_saves_hit'>
					<h3 class='dialog-sub-label'>
						Saved
					</h3>
					<button id='account_dialog_saves_toggle' class='account_dialog_heading_action control' type='button' title='Saved addresses' aria-label='Saved addresses' aria-expanded='true'>
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
					<input id='save_address' type='text' placeholder='Address line 1 (optional)' aria-label='Address line 1 (optional)' autocomplete='address-line1'>
					<input id='save_address_line_2' type='text' placeholder='Address line 2 (optional)' aria-label='Address line 2 (optional)' autocomplete='address-line2'>
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
			<div id='account_dialog_save_list_container' aria-hidden='false'>
				<div class='account_dialog_fold_inner'>
					<div id='account_dialog_save_list_loader' class='account_dialog_save_list_indicator'>loading...</div>
					<div id='account_dialog_save_list_placeholder' class="account_dialog_save_list_indicator hide"></div>
					<div id=account_dialog_save_list></div>
					<div id='account_dialog_save_list_end' class="account_dialog_save_list_indicator hide">— * —</div>
				</div>
			</div>
		</div>
		<div id='account_dialog_row_menu' class='row-menu-list hide' role='menu' aria-hidden='true'>
			<button type='button' id='account_dialog_row_edit' class='row-edit' role='menuitem'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='m15 4 5 5M4 20l4-1L20 7a2 2 0 0 0-3-3L5 16z'/></svg><span>Edit</span></button>
			<button type='button' id='account_dialog_row_sync' class='bookmark-sync hide' role='menuitem'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 13-1 4.5 4.5 0 0 1 0 9h-1M12 21V11m-4 4 4-4 4 4'/></svg><span id='account_dialog_row_sync_label'>Sync to cloud</span></button>
			<button type='button' id='account_dialog_row_delete' class='row-delete' role='menuitem'><svg viewBox='0 0 24 24' aria-hidden='true'><path d='M3 6h18M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7'/></svg><span>Delete</span></button>
		</div>
		<div id='account_dialog_more_icon_template' class='hide' aria-hidden='true'>
			<span class='image'><svg viewBox='0 0 18 18' aria-hidden='true'><circle cx='9' cy='2' r='2'/><circle cx='9' cy='9' r='2'/><circle cx='9' cy='16' r='2'/></svg></span>
		</div>
	</div>
</div>
