<div id='container'>
	<div id='wait_loader'></div>
	<div id='restrict_block' class='hide'>
		<h3>Restricted! You are not authorized to have access here.</h3>
	</div>
	<div id='console_block' class='hide'>

		<div id='console-title-container' class='center-container-abs'>
			<span id='console_title'>Console</span>
		</div>
		<div id='request-controls-container' class='center-container-abs'>
			<span id='location_request_list' class='invisible'>
				<span id='data_count'></span>
				<span id='data_process'><input id='data_process_checkbox' type='checkbox'></span>
				<span id='data_reject' class='data_control'>╳</span>
				<span id='data_time'></span>
				<span id='data_previous' class='data_control'>◁</span>
				<span id='view_data_index' class='data_control'></span>
				<span id='data_next' class='data_control'>▷</span>
			</span>
		</div>
		<div id='logo'>
			<a id='logo_wolo' href='https://wcodes.org' tabindex='1'>
				<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
			</a><a id='logo_codes' href='https://wolo.codes' tabindex='2'>
				<span class='image'><?php includeSVG('', 'logo_codes'); ?></span>
			</a>
		</div>
		<div id='map'></div>
		<div id='address_details' class='message_dialog hide'>
			<h2 class='message_dialog_label'>
				Details
			</h2>
			<div id='details_close' class="message_dialog_close control">
				<span class='image'><?php includeSVG('', 'Close'); ?></span>
			</div>
			<div class='message_dialog_body'>
				<div id='data_gp_id'>GP id</div>
				<div id='data_lat'>Lat</div>
				<div id='data_lng'>Long</div>
			</div>
		</div>
		<div id='address_text'>
			<div id='address_text_label'>Address</div>
			<div id='address_text_main'>
				<span id='address_text_content'></span>
			</div>
		</div>
		<input id='pac-input' type='text' placeholder='Search' tabindex='3' >
		<form id='city_submit_panel'>
			<input id='city_gpid' type='hidden' >
			<input id='city_lat' type='hidden' >
			<input id='city_lng' type='hidden' >
			<input id='city_name' class='city_form_field' type='text' placeholder='Name' required tabindex='4' autocomplete='new-password' >
			<input id='city_accent' class='city_form_field' type='text' placeholder='Accent' tabindex='4' autocomplete='new-password' >
			<input id='city_administrative_level_3' class='city_form_field' type='text' placeholder='Admin level 3' tabindex='5' autocomplete='new-password' >
			<input id='city_administrative_level_2' class='city_form_field' type='text' placeholder='Admin level 2' tabindex='6' autocomplete='new-password' >
			<input id='city_administrative_level_1' class='city_form_field' type='text' placeholder='Admin level 1' tabindex='7' autocomplete='new-password' >
			<input id='city_country' class='city_form_field' type='text' placeholder='Country' required tabindex='8' autocomplete='new-password' >
			<input id='submit_city_button' class='control' type='submit' value='Submit' tabindex='9'>
		</form>
		<div id='notification_bottom' class="notification_bar hide"></div>
		<div id='file_container'>
			<input id='file_input' type='file'>
			<button id='file_upload' type='button' class='border' onclick="upload_data();">Upload</button>
		</div>
	</div>
</div>
<?php require '../../HTML/Fragment/Firebase_includes.php'; ?>
<script src='https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-auth.js'></script>
