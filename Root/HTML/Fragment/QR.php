<div id='qr_body' class='hide'>
	<div id='qr_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='qr_label' class='center'>
		<div id='logo_qr' tabindex='1'>
			<a id=logo_wolo_qr href='//wolo.codes'>
				<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
			</a>
			<a id=logo_codes_qr href='//wolo.codes'>
				<span class='image'><?php includeSVG('', 'logo_codes'); ?></span>
			</a>
		</div>
	</div>
	<div id='qr_title_container' class='center'>
		<input id='qr_title_main' type='text' placeholder="&nbsp;&nbsp;Title&nbsp; &nbsp;e.g. Taj Mahal">
		<input id='qr_title_segment' type='text' placeholder="&nbsp;&nbsp;Segment&nbsp; &nbsp;e.g. West gate">
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
		<div id='qr_address' class='initial' contentEditable>&nbsp;&nbsp;Address&nbsp; &nbsp;(optional)</div>
	</div>
	<div id='qr_webapp_url' class='center'>
		<div>www.wolo.codes</div>
	</div>
	<div id='qr_controls' class="center message_dialog_control section-to-not-print">
		<button id='qr_preview' class='border' type='button'>Preview</button>
		<button id='qr_download' class='border' type='button'>Download</button>
		<button id='qr_print' class='border' type='button'>Print</button>
	</div>
</div>
