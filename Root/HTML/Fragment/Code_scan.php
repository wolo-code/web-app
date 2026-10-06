<div id='code_scan_message' class="message_dialog hide code_scan_dialog">
	<h2 class='message_dialog_label'>
		Scan Wolo Code
	</h2>
	<div id='code_scan_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body code_scan_body'>
		<div class='code_scan_viewport'>
			<video id='code_scan_video' playsinline autoplay muted aria-hidden='true'></video>
			<canvas id='code_scan_canvas' class='hide' aria-hidden='true'></canvas>
			<div id='code_scan_fixed_guide' class='code_scan_fixed_guide' aria-hidden='true'>
				<div id='code_scan_candidate_highlight' class='code_scan_candidate_highlight hide' aria-hidden='true'></div>
			</div>
			<span id='code_scan_live_zoom_indicator' class='code_scan_live_zoom_indicator hide' aria-live='polite'></span>
		</div>
		<p id='code_scan_status' class='code_scan_status'>Processed on your device – No images are uploaded</p>
		<div id='code_scan_crop_controls' class='code_scan_crop_controls hide' role='toolbar' aria-label='Crop and zoom controls'>
			<button id='code_scan_rescan' class='code_scan_crop_button code_scan_crop_rescan' type='button' aria-label='Rescan' title='Rescan'>
				<span class='image'><?php includeSVG('', 'Reverse'); ?></span>
			</button>
			<div class='code_scan_zoom_group' role='group' aria-label='Zoom controls'>
				<button id='code_scan_zoom_out' class='code_scan_zoom_button' type='button' aria-label='Zoom out' title='Zoom out'>&minus;</button>
				<button id='code_scan_zoom_reset' class='code_scan_zoom_button code_scan_zoom_reset' type='button' aria-label='Reset zoom' title='Reset zoom'>
					<svg viewBox='0 0 24 24' aria-hidden='true'><path d='M5 8a8 8 0 1 1-1 8M5 3v5h5' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>
					<span id='code_scan_zoom_level' class='code_scan_zoom_level' aria-live='polite'>100%</span>
				</button>
				<button id='code_scan_zoom_in' class='code_scan_zoom_button' type='button' aria-label='Zoom in' title='Zoom in'>&plus;</button>
			</div>
			<button id='code_scan_apply_crop' class='code_scan_crop_button code_scan_apply_crop' type='button' aria-label='Crop and scan' title='Crop and scan'>
				<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
			</button>
		</div>
		<div id='code_scan_live_controls' class='code_scan_live_controls'>
			<input id='code_scan_photo_input' class='hide' type='file' accept='image/*' capture='environment' tabindex='-1' aria-hidden='true'>
			<button id='code_scan_use_photo' class='border code_scan_icon_button code_scan_use_photo' type='button' aria-label='Choose photo from gallery' title='Choose photo from gallery'>
				<span class='image'><?php includeSVG('', 'Gallery'); ?></span>
			</button>
			<button id='code_scan_capture' class='code_scan_capture' type='button' aria-label='Capture label' title='Capture label'>
				<span class='code_scan_capture_inner'></span>
			</button>
			<button id='code_scan_type_instead' class='border code_scan_icon_button code_scan_type_instead' type='button' aria-label='Type code instead' title='Type code instead'>
				<span class='image'><?php includeSVG('', 'Keyboard'); ?></span>
			</button>
		</div>
		<div id='code_scan_review' class='code_scan_review hide'>
			<div class='code_scan_review_city_row'>
			<label class='code_scan_review_field' for='code_scan_review_city'>
				<span class='code_scan_city_label'>City</span>
				<input id='code_scan_review_city' class='code_scan_review_input' type='text' autocomplete='off' autocapitalize='words' spellcheck='false' placeholder='Optional'>
			</label>
				<button id='code_scan_city_select' class='code_scan_icon_button' type='button' aria-label='Choose city' title='Choose city' aria-expanded='false' aria-controls='code_scan_city_choices'><span class='image'><?php includeSVG('', 'List'); ?></span></button>
			</div>
			<div class='code_scan_review_words' role='group' aria-label='Wolo words'>
				<label class='code_scan_review_field' for='code_scan_review_w1'>
					Word 1
					<input id='code_scan_review_w1' class='code_scan_review_input' type='text' autocomplete='off' autocapitalize='none' spellcheck='false' required>
				</label>
				<label class='code_scan_review_field' for='code_scan_review_w2'>
					Word 2
					<input id='code_scan_review_w2' class='code_scan_review_input' type='text' autocomplete='off' autocapitalize='none' spellcheck='false' required>
				</label>
				<label class='code_scan_review_field' for='code_scan_review_w3'>
					Word 3
					<input id='code_scan_review_w3' class='code_scan_review_input' type='text' autocomplete='off' autocapitalize='none' spellcheck='false' required>
				</label>
			</div>
			<div class='code_scan_review_actions'>
				<button id='code_scan_use_code' class='code_scan_use_code' type='button' disabled>
					Use Code
				</button>
				<button id='code_scan_cancel' class='border code_scan_cancel' type='button'>
					Cancel
				</button>
			</div>
		</div>
	</div>
	<dialog id='code_scan_city_choices' class='code_scan_city_choices hide' aria-label='Choose city'></dialog>
</div>
