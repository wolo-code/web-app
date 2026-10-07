
<div id='qr_container' class='hide'>
	<h2 class='message_dialog_label section-to-not-print'>
		Label
	</h2>
	<div id='qr_save' class="message_dialog_close message_dialog_leading_action control section-to-not-print" title='Save to address book' aria-label='Save to address book'>
		<span class='image'><svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' aria-hidden='true'><path class='qr_bookmark_outline' fill='#69b7cf' d='M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1zm1 2v12.55l5-2.86 5 2.86V5z'/><path class='qr_bookmark_filled' fill='#69b7cf' d='M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z'/></svg></span><span id='qr_bookmark_changed' class='hide' aria-hidden='true'>*</span>
	</div>
	<div id='qr_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='qr_body'>
		<div id='qr_label' class='center'>
			<div id='logo_qr'>
				<a id=logo_wolo_qr href='//wolo.codes'>
					<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
				</a>
				<a id=logo_codes_qr href='//wolo.codes'>
					<span class='image'><?php includeSVG('', 'logo_code'); ?></span>
				</a>
			</div>
		</div>
		<div id='qr_title_container' class='center'>
			<input id='qr_title_main' type='text' placeholder="&nbsp;&nbsp;Title – e.g. Home">
			<input id='qr_title_segment' type='text' placeholder="&nbsp;&nbsp;Segment – e.g. Main gate">
		</div>
		<div id='qr_wcode'>
			<div id='qr_wcode_container'>
				<div id='qr_wcode_text'>
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
		</div>
		<div id='qr_address_container' class='center'>
			<div id='qr_address' class='initial' contentEditable>&nbsp;&nbsp;Address</div>
		</div>
		<div id='qr_webapp_url' class='center'>
			<div>www.wolo.codes</div>
		</div>
	</div>
	<div id='qr_controls' class="message_dialog_control section-to-not-print">
		<button id='qr_preview' class='border' type='button'><span class='image'><?php includeSVG('', 'Preview'); ?></span></button>
		<button id='qr_download' class='border' type='button'><span class='image'><?php includeSVG('', 'Download'); ?></span></button>
		<button id='qr_print' class='border' type='button'><span class='image'><?php includeSVG('', 'Print'); ?></span></button>
	</div>
</div>
