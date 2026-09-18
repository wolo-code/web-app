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
		</div>
		<p id='code_scan_status' class='code_scan_status'>Point your camera at the printed Wolo Code label.</p>
		<p id='code_scan_candidate' class='code_scan_candidate hide'></p>
		<input id='code_scan_photo_input' class='hide' type='file' accept='image/*' capture='environment' tabindex='-1' aria-hidden='true'>
		<button id='code_scan_use_photo' class='border code_scan_use_photo' type='button'>
			Use photo instead
		</button>
		<button id='code_scan_type_instead' class='border code_scan_type_instead' type='button'>
			Type instead
		</button>
	</div>
</div>
