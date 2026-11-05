<?php $cityRegionMenuId = htmlspecialchars($cityRegionMenuId, ENT_QUOTES, 'UTF-8'); ?>
<div id='<?php echo $cityRegionMenuId; ?>_region_menu' class='city_region_menu'>
	<details class='city_region_choices'>
		<summary><?php echo $cityRegionMenuId === 'nearby' ? 'Regions' : 'Use a regional code'; ?></summary>
		<div class='city_region_list'></div>
		<?php if($cityRegionMenuId === 'nearby') { ?>
			<button type='button' class='city_region_manual_open' aria-haspopup='dialog'><span aria-hidden='true'>+</span> Enter a region and index</button>
			<dialog class='city_region_manual' aria-labelledby='nearby_region_manual_title'>
				<form>
					<h2 id='nearby_region_manual_title'>Enter a region and index</h2>
		<?php } else { ?>
			<details class='city_region_manual'>
				<summary>Enter a region and index</summary>
		<?php } ?>
			<p class='city_region_manual_hint'>Choose a region and enter its anchor index.</p>
			<label for='<?php echo $cityRegionMenuId; ?>_region_name'>Region or country</label>
			<select id='<?php echo $cityRegionMenuId; ?>_region_name' class='city_region_name'></select>
			<label for='<?php echo $cityRegionMenuId; ?>_region_index'>Anchor index</label>
			<input id='<?php echo $cityRegionMenuId; ?>_region_index' class='city_region_index' type='number' min='1' step='1' inputmode='numeric' required>
		<?php if($cityRegionMenuId === 'nearby') { ?>
					<div class='city_region_manual_actions'>
						<button type='button' class='city_region_manual_cancel'>Cancel</button>
						<button type='submit' class='city_region_use'>Use regional code <span aria-hidden='true'>&rarr;</span></button>
					</div>
				</form>
			</dialog>
		<?php } else { ?>
				<button type='button' class='city_region_use'>Use regional code <span aria-hidden='true'>&rarr;</span></button>
			</details>
		<?php } ?>
	</details>
	<?php if($cityRegionMenuId !== 'nearby') { ?>
		<button type='button' class='city_region_propose'><span aria-hidden='true'>+</span> Propose a city</button>
	<?php } ?>
</div>
