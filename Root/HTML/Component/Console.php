<script src='https://www.gstatic.com/firebasejs/4.6.0/firebase-auth.js'></script>
<div id='container'>
	<div id='restrict_block' class='hide'>
		<h3>Restricted! You are not authorized to have access here.</h3>
	</div>
	<div id='console_block' class='hide'>
		<div id='console_title' class='center'>Console</div>
		<table id='location_request_list' class='invisible'>
			<tbody>
				<tr>
					<th class='count'>Count</th>
					<th class='previous'>Previous</th>
					<th class='index'>Index</th>
					<th class='next'>Next</th>
					<th class='reject'>Reject</th>
					<th class='process'>Process</th>
					<th class='address'>Address</th>
					<th class='gp_id'>GP id</th>
					<th class='lat'>Lat</th>
					<th class='lng'>Long</th>
					<th class='time'>Time</th>
				</tr>
				<tr>
					<td id='data_count'></td>
					<td id='data_previous' class='data_control'>◁</td>
					<td id='view_data_index'></td>
					<td id='data_next' class='data_control'>▷</td>
					<td id='data_reject' class='data_control'>╳</td>
					<td id='data_process'><input id='data_process_checkbox' type='checkbox'></td>
					<td id='data_address'></td>
					<td id='data_gp_id'></td>
					<td id='data_lat'></td>
					<td id='data_lng'></td>
					<td id='data_time'></td>
				</tr>
			</tbody>
		</table>
		<div id='logo'>
			<a id='logo_wcode' href='https://wcodes.org' tabindex='1'>
				<span class='image'><?php echo file_get_contents('../../Resource/Logo_WCode.svg'); ?></span>
			</a><a id='logo_location' href='https://location.wcodes.org' tabindex='2'>
				<span class='image'><?php echo file_get_contents('../../Resource/Logo_location_console.svg'); ?></span>
			</a>
		</div>
		<!-- <div id="map_container"> -->
			<div id="map_canvas"></div>
			<div id='address_text'>
				<span id='address_text_main'>
					<div id='address_text_label'>Address</div>
					<div id='address_text_content'></div>
				</span>
			</div>
			<input id='pac-input' class='controls' type='text' placeholder='Search' tabindex='3' >
			<form id='city_submit_panel'>
				<input id='city_lat' type='number' step='any' placeholder='Lat' required tabindex='4' >
				<input id='city_lng' type='number' step='any' placeholder='Long' required tabindex='5' >
				<input id='city_name' type='text' placeholder='Name' required tabindex='6' >
				<input id='city_group' type='text' placeholder='Group' required tabindex='7' >
				<input id='city_country' type='text' placeholder='Country' required tabindex='8' >
				<botton id='submit_city_button' class='controls' type='button' value='Submit' tabindex='9'>Submit</button>
			</form>
		<!-- </div> -->
	</div>
</div>
