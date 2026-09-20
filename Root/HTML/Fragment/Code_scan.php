<div id='code_scan_message' class="message_dialog hide code_scan_dialog">
	<h2 class='message_dialog_label'>
		Scan Wolo Code
	</h2>
	<div id='code_scan_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div class='message_dialog_body code_scan_body'>
		<p class='code_scan_privacy'>
			Processed on your device. No images are uploaded.
		</p>
		<div class='code_scan_viewport'>
			<video id='code_scan_video' playsinline autoplay muted aria-hidden='true'></video>
			<canvas id='code_scan_canvas' class='hide' aria-hidden='true'></canvas>
			<div id='code_scan_fixed_guide' class='code_scan_fixed_guide' aria-hidden='true'></div>
			<div id='code_scan_candidate_highlight' class='code_scan_candidate_highlight hide' aria-hidden='true'></div>
		</div>
		<div id='code_scan_live_controls' class='code_scan_live_controls'>
			<div class='code_scan_mode_switch' role='group' aria-label='Detection mode'>
				<button id='code_scan_mode_fixed' class='code_scan_mode_button code_scan_mode_active' type='button'>
					Fixed 3:1
				</button>
				<button id='code_scan_mode_general' class='code_scan_mode_button' type='button'>
					General
				</button>
			</div>
			<button id='code_scan_capture' class='code_scan_capture' type='button' aria-label='Capture label'>
				<span class='code_scan_capture_inner'></span>
			</button>
		</div>
		<p id='code_scan_status' class='code_scan_status'>Point your camera at the printed Wolo Code label.</p>
		<div id='code_scan_review' class='code_scan_review hide'>
			<p class='code_scan_review_label'>Review and edit before decoding</p>
			<label class='code_scan_review_field' for='code_scan_review_city'>
				City
				<input id='code_scan_review_city' class='code_scan_review_input' type='text' list='code_scan_city_choices' autocomplete='off' autocapitalize='words' spellcheck='false' placeholder='Optional'>
			</label>
			<datalist id='code_scan_city_choices'></datalist>
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
			<p id='code_scan_review_validity' class='code_scan_review_validity'>Enter three valid Wolo words.</p>
			<div class='code_scan_review_actions'>
				<button id='code_scan_use_code' class='code_scan_use_code' type='button' disabled>
					Use Code
				</button>
				<button id='code_scan_rescan' class='border code_scan_rescan' type='button'>
					Rescan
				</button>
				<button id='code_scan_cancel' class='border code_scan_cancel' type='button'>
					Cancel
				</button>
			</div>
		</div>
		<input id='code_scan_photo_input' class='hide' type='file' accept='image/*' capture='environment' tabindex='-1' aria-hidden='true'>
		<button id='code_scan_use_photo' class='border code_scan_use_photo' type='button'>
			Use photo instead
		</button>
		<button id='code_scan_type_instead' class='border code_scan_type_instead' type='button'>
			Type instead
		</button>
	</div>
</div>
