<div id='choose_city_by_name_message' class="choose_city_message message_dialog hide">
	<h2 class='message_dialog_label'>
		Choose the city
	</h2>
	<div id='choose_city_by_name_message_close' class="message_dialog_close control">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='choose_city_by_name_message_prompt' class='message_dialog_body'>
		<?php $cityRegionMenuId = 'matching'; require __DIR__ . '/CityRegionOptions.php'; ?>
	</div>
	<?php require __DIR__ . '/CityRegionReferenceHint.php'; ?>
</div>
