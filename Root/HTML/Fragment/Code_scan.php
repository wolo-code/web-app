<div id='code_scan_message' class="message_dialog hide code_scan_dialog">
	<button id='code_scan_rescan' class='code_scan_crop_button code_scan_crop_rescan control hide' type='button' aria-label='Rescan' title='Rescan'>
		<span class='image'><?php includeSVG('', 'Reverse'); ?></span>
	</button>
	<h2 id='code_scan_heading' class='message_dialog_label'>
		Scan Wolo Code
	</h2>
	<button id='code_scan_close' class='message_dialog_close control' type='button' aria-label='Close scanner' title='Close scanner'>
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</button>
	<div class='message_dialog_body code_scan_body'>
		<div class='code_scan_preview'>
			<div class='code_scan_viewport'>
				<video id='code_scan_video' playsinline autoplay muted aria-hidden='true'></video>
				<canvas id='code_scan_canvas' class='hide' aria-hidden='true'></canvas>
				<div id='code_scan_fixed_guide' class='code_scan_fixed_guide' aria-hidden='true'></div>
				<div class='code_scan_regions' aria-hidden='true'>
					<div id='code_scan_detected_boxes'></div>
					<div id='code_scan_card_highlight' class='code_scan_candidate_highlight code_scan_card_highlight hide' aria-hidden='true'></div>
					<div id='code_scan_container_highlight' class='code_scan_candidate_highlight code_scan_container_highlight hide' aria-hidden='true'></div>
					<div id='code_scan_city_highlight' class='code_scan_candidate_highlight code_scan_city_highlight hide' aria-hidden='true'></div>
					<div id='code_scan_candidate_highlight' class='code_scan_candidate_highlight hide' aria-hidden='true'></div>
				</div>
				<span id='code_scan_live_zoom_indicator' class='code_scan_live_zoom_indicator hide' aria-live='polite'></span>
				<div id='code_scan_debug' class='code_scan_debug hide' tabindex='0' role='region' aria-label='Scan Debug Log'>
					<strong>Debug log</strong>
					<ul id='code_scan_debug_steps' role='log' aria-label='Scan Debug Log' aria-live='off'></ul>
				</div>
			</div>
			<div class='code_scan_messages'>
				<p id='code_scan_status' class='code_scan_status' role='status'>Processed on your device<br>No images are uploaded</p>
				<p id='code_scan_review_validity' class='code_scan_review_validity' role='status'></p>
			</div>
		</div>
		<div id='code_scan_crop_controls' class='code_scan_crop_controls hide'>
			<div class='code_scan_zoom_group' role='group' aria-label='Zoom controls'>
				<button id='code_scan_zoom_out' class='code_scan_zoom_button' type='button' aria-label='Zoom out' title='Zoom out'>&minus;</button>
				<button id='code_scan_zoom_level' class='code_scan_zoom_button code_scan_zoom_level' type='button' aria-label='Zoom 100%. Reset zoom' title='Reset zoom'>
					<span id='code_scan_zoom_percentage'></span>
					<span class='image' aria-hidden='true'><?php includeSVG('', 'Search'); ?></span>
				</button>
				<button id='code_scan_zoom_in' class='code_scan_zoom_button' type='button' aria-label='Zoom in' title='Zoom in'>&plus;</button>
			</div>
		</div>
		<div id='code_scan_live_controls' class='code_scan_live_controls'>
			<input id='code_scan_photo_input' class='hide' type='file' accept='image/*' tabindex='-1' aria-hidden='true'>
			<button id='code_scan_use_photo' class='border code_scan_icon_button code_scan_use_photo' type='button' aria-label='Choose photo from gallery' title='Choose photo from gallery'>
				<span class='image'><?php includeSVG('', 'Gallery'); ?></span>
			</button>
			<button id='code_scan_type_instead' class='border code_scan_icon_button code_scan_type_instead' type='button' aria-label='Type code instead' title='Type code instead'>
				<span class='image'><?php includeSVG('', 'Keyboard'); ?></span>
			</button>
		</div>
		<div id='code_scan_review' class='code_scan_review hide'>
			<div id='code_scan_heading_details' class='code_scan_details' role='group' aria-label='Optional label heading' hidden>
				<label class='code_scan_review_field' for='code_scan_title'>Title
					<input id='code_scan_title' class='code_scan_review_input' type='text' autocomplete='off' placeholder='Optional'>
				</label>
				<label class='code_scan_review_field' for='code_scan_segment'>Segment
					<input id='code_scan_segment' class='code_scan_review_input' type='text' autocomplete='off' placeholder='Optional'>
				</label>
			</div>
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
					<input id='code_scan_review_w1' class='code_scan_review_input' type='text' autocomplete='off' autocapitalize='none' spellcheck='false' aria-describedby='code_scan_review_validity' required>
				</label>
				<label class='code_scan_review_field' for='code_scan_review_w2'>
					Word 2
					<input id='code_scan_review_w2' class='code_scan_review_input' type='text' autocomplete='off' autocapitalize='none' spellcheck='false' aria-describedby='code_scan_review_validity' required>
				</label>
				<label class='code_scan_review_field' for='code_scan_review_w3'>
					Word 3
					<input id='code_scan_review_w3' class='code_scan_review_input' type='text' autocomplete='off' autocapitalize='none' spellcheck='false' aria-describedby='code_scan_review_validity' required>
				</label>
			</div>
			<div id='code_scan_details' class='code_scan_details' role='group' aria-label='Optional label details' hidden>
				<div class='code_scan_address_parts'>
					<label class='code_scan_review_field' for='code_scan_address_line_1'>Address line 1
						<textarea id='code_scan_address_line_1' class='code_scan_review_input' rows='2' placeholder='Optional'></textarea>
					</label>
					<label class='code_scan_review_field' for='code_scan_address_line_2'>Address line 2
						<textarea id='code_scan_address_line_2' class='code_scan_review_input' rows='2' placeholder='Optional'></textarea>
					</label>
				</div>
			</div>
		</div>
	</div>
	<div id='code_scan_review_actions' class='code_scan_review_actions hide' role='group' aria-label='Review controls'>
		<div id='code_scan_review_leading' class='code_scan_review_leading'>
			<button id='code_scan_save' class='code_scan_icon_button' type='button' aria-label='Save to address book' title='Save to address book' disabled>
				<span class='image'><?php includeSVG('', 'Save'); ?></span>
			</button>
		</div>
		<button id='code_scan_details_toggle' class='code_scan_icon_button' type='button' aria-label='Show address details' title='Address details' aria-expanded='false' aria-controls='code_scan_heading_details code_scan_details'>
			<span class='image'><?php includeSVG('', 'Address'); ?></span>
		</button>
		<button id='code_scan_apply_crop' class='code_scan_crop_button code_scan_apply_crop' type='button' aria-label='Go' title='Use address' disabled>
			<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
		</button>
	</div>
	<dialog id='code_scan_city_choices' class='code_scan_city_choices hide' aria-label='Choose city'></dialog>
</div>
