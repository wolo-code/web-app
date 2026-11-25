<div class='city_region_reference_info'>
	<button type='button' aria-label='About code references' aria-describedby='<?= $cityRegionMenuId ?>_reference_hint'>
		<svg viewBox='0 0 24 24' width='16' height='16' aria-hidden='true' focusable='false' fill='none' stroke='currentColor' stroke-width='1.75' stroke-linecap='round'>
			<circle cx='12' cy='12' r='9'/>
			<path d='M12 11v5M12 8h.01'/>
		</svg>
	</button>
	<div id='<?= $cityRegionMenuId ?>_reference_hint' class='city_region_reference_hint' role='tooltip'>
		<span class='city_region_reference_hint_icon' aria-hidden='true'><?php includeSVG('', 'Info'); ?></span>
		<p>Different references can give the same location different Wolo Codes</p>
		<p>City and region names in Wolo Codes serve as geographic reference points only.<br> Their use implies no position on political boundaries or sovereignty</p>
	</div>
</div>
