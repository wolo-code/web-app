<div id='address_text' class='hide'>
	<div id='address_text_label'>
		<div id='address_text_caption'>
			Address
			<button type='button' id='address_text_address_qr' class='address_qr_button control hide' data-code-qr='address' title='Show address QR' aria-label='Show address QR'>
				<span class='image'><?php includeSVG('', 'QR'); ?></span>
			</button>
		</div>
		<div id='address_text_header' class='hide'>
			<div id='address_text_title'></div>
			<div id='address_text_segment'></div>
		</div>
	</div>
	<div id='address_text_close' class='control'>
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='address_text_main'>
		<span id='address_text_content'></span>
		<div id='address_text_codes' class='hide'>
			<div id='address_text_digipin_row' class='address_text_code_row hide'>
				<div class='address_text_code_label'>
					DIGIPIN
					<button type='button' id='address_text_digipin_qr' class='address_qr_button control' data-code-qr='digipin' title='Show DIGIPIN QR' aria-label='Show DIGIPIN QR'>
						<span class='image'><?php includeSVG('', 'QR'); ?></span>
					</button>
				</div>
				<div id='address_text_digipin' class='address_text_code_value control'></div>
			</div>
			<div id='address_text_plus_row' class='address_text_code_row hide'>
				<div class='address_text_code_label'>
					Plus code
					<button type='button' id='address_text_plus_qr' class='address_qr_button control' data-code-qr='plus' title='Show plus code QR' aria-label='Show plus code QR'>
						<span class='image'><?php includeSVG('', 'QR'); ?></span>
					</button>
				</div>
				<div id='address_text_plus' class='address_text_code_value control'></div>
			</div>
		</div>
	</div>
</div>
