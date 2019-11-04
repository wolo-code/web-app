<div id='qr' class="overlay hide">
	<div id='qr_body'>
		<div id='qr_close' class="message_dialog_close control">
			<span class='image'><?php includeSVG('', 'Close'); ?></span>
		</div>
		<div id='qr_label' class='center'>
			<div id=qr_logo_wcode tabindex='1'>
				<span class='image'><?php includeSVG('', 'QR_Logo_WCode'); ?></span>
			</div>
			<div id=qr_logo_location tabindex='2'>
				<span class='image'><?php includeSVG('', 'QR_Logo_location'); ?></span>
			</div>
		</div>
		<div id='qr_title_container' class='center'>
			<input id='qr_title_main' type='text' placeholder="&nbsp;&nbsp;Title (optional)">
			<input id='qr_title_segment' type='text' placeholder="&nbsp;&nbsp;Segment (optional)">
		</div>
		<div id='qr_wcode'>
			<div id='qr_wcode_container' class='center'>
				<div id='qr_wcode_left'>
					<span class='slash'>\</span>
					<span class='infowindow_code' id='qr_wcode_city'></span>
				</div>
				<div id='qr_wcode_right'>
					<span class='infowindow_code' id='qr_wcode_code'></span>
					<span class='slash'>/</span>
				</div>
			</div>
		</div>
		<div id='qr_code' class='center'></div>
		<div id='qr_address_container' class='center'>
			<div id='qr_address' class='initial' contentEditable>&nbsp;&nbsp;Address (optional)</div>
		</div>
		<div id='qr_webapp_url' class='center'>
			<div>location.wcodes.org</div>
		</div>
		<div class="center message_dialog_control section-to-not-print">
			<button id='qr_preview' class='border' type='button'>Preview</button>
			<button id='qr_download' class='border' type='button'>Download</button>
			<button id='qr_print' class='border' type='button'>Print</button>
		</div>
	</div>
</div>
