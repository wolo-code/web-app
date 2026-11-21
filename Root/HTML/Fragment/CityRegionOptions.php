<?php
$cityRegionCityLists = [
	'nearby' => 'choose_city_by_periphery_message_list',
	'history' => 'decode_city_history_message_list',
	'matching' => 'choose_city_by_name_message_list',
];
?>
<div id='<?= $cityRegionMenuId ?>_region_menu' class='city_region_picker'>
	<div class='city_region_tabs' role='tablist' aria-label='Location type'>
		<button id='<?= $cityRegionMenuId ?>_city_tab' type='button' role='tab' aria-selected='true' aria-controls='<?= $cityRegionMenuId ?>_city_panel'><span>City</span></button>
		<span aria-hidden='true'>|</span>
		<button id='<?= $cityRegionMenuId ?>_region_tab' type='button' role='tab' aria-selected='false' aria-controls='<?= $cityRegionMenuId ?>_region_panel' tabindex='-1'><span>Region</span></button>
	</div>
	<div id='<?= $cityRegionMenuId ?>_city_panel' role='tabpanel' aria-labelledby='<?= $cityRegionMenuId ?>_city_tab'>
		<input type='search' class='city_region_search' placeholder='Search cities' aria-label='Search cities' autocomplete='off' spellcheck='false'>
		<p class='city_region_search_status' role='status'></p>
		<div class='city_region_defaults'>
			<?php if($cityRegionMenuId === 'matching') { ?>
				<p>There are multiple cities with this name. Select the correct one:</p>
			<?php } ?>
			<div id='<?= $cityRegionCityLists[$cityRegionMenuId] ?>' class='choose_city_message_list'></div>
		</div>
		<div class='city_region_search_results'></div>
	</div>
	<div id='<?= $cityRegionMenuId ?>_region_panel' role='tabpanel' aria-labelledby='<?= $cityRegionMenuId ?>_region_tab' hidden>
		<input type='search' class='city_region_search' placeholder='Search regions or countries' aria-label='Search regions or countries' autocomplete='off' spellcheck='false'>
		<p class='city_region_search_status' role='status'></p>
		<div class='city_region_defaults'>
			<?php if($cityRegionMenuId === 'history') { ?>
				<div id='decode_region_history_message_list' class='choose_city_message_list'></div>
			<?php } ?>
			<div class='city_region_list'></div>
		</div>
		<div class='city_region_search_results city_region_list'></div>
	</div>
</div>
