<div id='external_message' class="message_dialog hide">
	<button id='external_close' class="message_dialog_close message_dialog_toolbar_button control" type='button' aria-label='Close'>
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</button>
	<div class='message_dialog_body'>
		<div id='external_wcode'>
			<div id='external_wcode_container' class='center'>
				<div id='external_wcode_left'>
					<span class='slash'>\</span>
					<span class='infowindow_code' id='external_wcode_city'></span>
				</div>
				<div id='external_wcode_right'>
					<span class='infowindow_code' id='external_wcode_code'></span>
					<span class='slash'>/</span>
				</div>
			</div>
		</div>
		<div id='external_down_arrow' class='center'>
			<span class="image front_arrow_white"><?php includeSVG('', 'Down_Arrow'); ?></span>
		</div>
		<div id='external_address_container' class='center'>
			<div id='external_address_loader' class='loader address_lookup_loader hide' role='status' aria-label='Loading address'></div>
			<div id='external_address' class='initial' contentEditable>Address</div>
		</div>
		<div id='external_controls_container' class="center message_dialog_control">
			<button id='external_proceed' class="border button_active control" type='button'><span class="image front_arrow_white"> <?php includeSVG('', 'Front'); ?></span></button>
		</div>
	</div>
</div>
