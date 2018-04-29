<script src='https://www.gstatic.com/firebasejs/4.6.0/firebase-auth.js'></script>
<div id='container'>
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
			<a id='logo_wcode' href='https://wcodes.org' tabindex='1'>
				<span class='image'><?php echo file_get_contents('../../Resource/Logo_WCode.svg'); ?></span>
			</a><a id='logo_location' href='https://location.wcodes.org' tabindex='2'>
				<span class='image'><?php echo file_get_contents('../../Resource/Logo_location.svg'); ?></span>
			</a>
		</div>
		<!-- <div id="map_container"> -->
				<h2 class='message_dialog_label'>
					Details
				</h2>
					<span class='image'><?php echo file_get_contents('../../Resource/Close.svg'); ?></span>
				</div>
					<div id='data_gp_id'>GP id</div>
					<div id='data_lat'>Lat</div>
					<div id='data_lng'>Long</div>
				</div>
		<div id='map_canvas'></div>
		<div id='address_details' class='message_dialog hide'>
			<div id='details_close' class="message_dialog_close control">
			</div>
			<div id='address_text'>
			<div class='message_dialog_body'>
			</div>
			<input id='pac-input' type='text' placeholder='Search' tabindex='3' >
			<form id='city_submit_panel'>
				<input id='city_lat' type='hidden' required >
				<input id='city_lng' type='hidden' required >
				<input id='city_name' type='text' placeholder='Name' required tabindex='4' >
				<input id='city_group' type='text' placeholder='Group' required tabindex='5' >
				<input id='city_country' type='text' placeholder='Country' required tabindex='6' >
				<botton id='submit_city_button' class='control' type='button' value='Submit' tabindex='7'>Submit</button>
			</form>
		<!-- </div> -->
			<div id='address_text_label'>Address</div>
			<div id='address_text_main'>
				<span id='address_text_content'></span>
			</div>
		<div id='notification_bottom' class='hide'></div>
	</div>
</div>
