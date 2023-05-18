
<div id='qr_container' class='hide'>
	<h2 class='message_dialog_label section-to-not-print'>
		Label
	</h2>
	<div id='qr_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='qr_body'>
		<div id='qr_label' class='center'>
			<div id='logo_qr' tabindex='1'>
				<a id=logo_wolo_qr href='//wolo.codes'>
					<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
				</a>
				<a id=logo_codes_qr href='//wolo.codes'>
					<span class='image'><?php includeSVG('', 'logo_code'); ?></span>
				</a>
			</div>
		</div>
		<div id='qr_title_container' class='center'>
			<input id='qr_title_main' type='text' placeholder="&nbsp;&nbsp;Title">
			<input id='qr_title_segment' type='text' placeholder="&nbsp;&nbsp;Segment">
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
		<div id='qr_address_container' class='center'>
			<div id='qr_address' class='initial' contentEditable>&nbsp;&nbsp;Address</div>
		</div>
		<div id='qr_webapp_url' class='center'>
			<div>www.wolo.codes</div>
		</div>
	</div>
	<div id='qr_controls' class="center message_dialog_control section-to-not-print">
		<button id='qr_preview' class='border' type='button'><span class='image'><?php includeSVG('', 'Preview'); ?></span></button>
		<button id='qr_download' class='border' type='button'><span class='image'><?php includeSVG('', 'Download'); ?></span></button>
		<button id='qr_print' class='border' type='button'><span class='image'><?php includeSVG('', 'Print'); ?></span></button>
	</div>
</div>
