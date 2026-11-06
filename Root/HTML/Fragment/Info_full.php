<div id='info_full' class='hide'>

	<div id='info_format_tabs' class='center' role='tablist' aria-label='Wolo Code format'>
		<button id='info_city_tab' type='button' role='tab' aria-selected='true' aria-controls='info_city_format'>City</button>
		<span aria-hidden='true'>|</span>
		<button id='info_region_tab' type='button' role='tab' aria-selected='false' aria-controls='info_region_format' tabindex='-1'>Region</button>
	</div>
	<div class='info_format_panels'>
		<div id='info_city_format' role='tabpanel' aria-labelledby='info_city_tab' tabindex='0'>
			<div class='center blue'>\ City Word 1 Word 2 Word 3 /</div>
			<div class='info_format_example center blue'><span>e.g.</span> \ Bengaluru cat apple tomato /</div>
			<p><strong>City</strong> names the city. You can omit it when using the current city.</p>
		</div>
		<div id='info_region_format' role='tabpanel' aria-labelledby='info_region_tab' tabindex='0' hidden>
			<div class='center blue'>\ Region Index Word 1 Word 2 Word 3 /</div>
			<div class='info_format_example center blue'>
				<span>e.g.</span>&nbsp;\&nbsp;Nepal 35 tower silk cobra /
				<div class='info_format_example_caption'>Mt. Everest</div>
			</div>
			<p><strong>Region</strong> names a region or country. The numeric <strong>index</strong> identifies the reference point within it.</p>
		</div>
	</div>
	<p>The last <strong>three words</strong> pinpoint the location. They come from a <a class='link' href='https://wcodes.org/wordlist'>list</a> of 1,024 common words.</p>

	<h2>
		Steps
	</h2>
	<ul>
		<li>
			Enter a Wolo Code address to go to that location. Or,
		</li>
		<li>
			Switch modes using the map icon and point a location on the map to generate the corresponding Wolo Code address.
		</li>
		<li>
			You may also search for a particular place. Or,<br>
			let the app pick up your current location automatically.
		</li>
	</ul>

	<div class='message_dialog_control_container'>
		<div class='message_dialog_control'>
			<button id='info_full_close_button' class='button_highlight' type='button'><span class='indicator'><span class='image'><?php includeSVG('', 'Back'); ?></span></span></button>
		</div>
	</div>
	
	<div id='wolo_about'>
		<a class='link' href='https://wolo.codes/about'>wolo.codes/about</a>
	</div>
	
</div>
