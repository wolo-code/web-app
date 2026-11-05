<div id='choose_city_by_periphery_message' class="choose_city_message message_dialog hide">
	<h2 class='message_dialog_label'>
		Choose city or region
	</h2>
	<div id='choose_city_by_periphery_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='choose_city_by_periphery_message_prompt' class='message_dialog_body'>
		<details class='city_region_cities' open>
			<summary>Cities</summary>
			<div id='choose_city_by_periphery_message_list' class='choose_city_message_list'></div>
			<button type='button' class='city_region_propose'><span aria-hidden='true'>+</span> Propose a city</button>
		</details>
		<?php $cityRegionMenuId = 'nearby'; require __DIR__ . '/CityRegionOptions.php'; ?>
	</div>
</div>
