<div id='choose_city_by_periphery_message' class="choose_city_message message_dialog hide">
	<div id='choose_city_by_periphery_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='choose_city_by_periphery_message_prompt' class='message_dialog_body'>
		<?php $cityRegionMenuId = 'nearby'; require __DIR__ . '/CityRegionOptions.php'; ?>
	</div>
</div>
