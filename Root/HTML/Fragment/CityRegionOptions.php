<?php $cityRegionMenuId = htmlspecialchars($cityRegionMenuId, ENT_QUOTES, 'UTF-8'); ?>
<div id='<?php echo $cityRegionMenuId; ?>_region_menu' class='city_region_menu'>
	<details class='city_region_choices'>
		<summary><?php echo $cityRegionMenuId === 'nearby' ? 'Regions' : 'Use a regional code'; ?></summary>
		<div class='city_region_list'></div>
		<details class='city_region_manual'>
			<summary><?php if($cityRegionMenuId === 'nearby') { ?><span aria-hidden='true'>+</span> <?php } ?>Enter a region and index</summary>
			<p class='city_region_manual_hint'>Choose a region and enter its anchor index.</p>
			<label for='<?php echo $cityRegionMenuId; ?>_region_name'>Region or country</label>
			<select id='<?php echo $cityRegionMenuId; ?>_region_name' class='city_region_name'></select>
			<label for='<?php echo $cityRegionMenuId; ?>_region_index'>Anchor index</label>
			<input id='<?php echo $cityRegionMenuId; ?>_region_index' class='city_region_index' type='number' min='1' step='1' inputmode='numeric' required>
			<button type='button' class='city_region_use'>Use regional code <span aria-hidden='true'>&rarr;</span></button>
		</details>
	</details>
	<?php if($cityRegionMenuId !== 'nearby') { ?>
		<button type='button' class='city_region_propose'><span aria-hidden='true'>+</span> Propose a city</button>
	<?php } ?>
</div>
