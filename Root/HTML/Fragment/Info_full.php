<div id='info_full' class='hide'>

	<div id='wcode_format' class="center blue"><span>\</span> <span>City</span> <span>Word 1</span> <span>Word 2</span> <span>Word 3</span> <span>/</span></div>
	<div id='wcode_example' class="center blue"><span>e.g.</span> <span>\</span> <span>Bengaluru</span> <span>cat</span> <span>apple</span> <span>tomato</span> <span>/</span></div>
	<p>
		An address in this system consists of two parts:
	</p>
	<ol>
		<li>
			<strong>City</strong> specifies the distinct city.<br>
			Within the same city - it can be omitted.
		</li>
		<li>
			The last <strong>three words</strong> specify exactly 'where' in that city.<br>
			They are from a limited <a class='link' href='https://wcodes.org/wordlist'>list</a> of 1,024 easy common words.
		</li>
	</ol>

	<h2>
		Steps
	</h2>
	<ul>
		<li>
			Enter a Wolo code address and hit the proceed button to go to that location. Or,
		</li>
		<li>
			Point a location on the map to generate the corresponding Wolo code address.
		</li>
		<li>
			You may also search for a particular place. Or,<br>
			let the system pick your current location automatically.
		</li>
	</ul>
	
	<div class='message_dialog_control_container'>
		<div class='message_dialog_control'>
			<button id='info_full_close_button' class='button_highlight' type='button'><span class='indicator'><span class='image'><?php includeSVG('', 'Back'); ?></span></span></button>
		</div>
	</div>
	
	<table>
		<tr>
			<td>About:</td>
			<td><a class='link' href='/about'>wolo.codes/about</a></td>
		</tr>
		<tr>
			<td>Terms of use:</td>
			<td><a class='link' href='/terms'>wolo.codes/terms</a></td>
		</tr>
		<tr>
			<td>Privacy policy:</td>
			<td><a class='link' href='/policy'>wolo.codes/policy</a></td>
		</tr>
		<tr>
			<td>contact:</td>
			<td><a class='link' href="mailto:ujjwal@wolo.codes?subject=Wolo">ujjwal@wolo.codes</a></td>
		</tr>
	</table>

	<div id='social-links' class='center'>
		<span class='social grow'>
			<a href='https://twitter.com/wolocodes' id='site-twitter' onclick="trackOutboundLink('wolo-twitter', 'https://twitter.com/wolocodes')"><span class='image'><?php includeSVG('', 'Twitter'); ?></span></a>
		</span>
		<span class='social grow'>
			<a href='https://facebook.com/wolocodes' id='site-facebook' onclick="trackOutboundLink('wolo-facebook', 'https://facebook.com/wolocodes')"><span class='image'><?php includeSVG('', 'Facebook'); ?></span></a>
		</span>
		<span class='social grow'>
			<a href='https://www.youtube.com/channel/UCnKSws8Lro8U9Ewtf1Xi5jg' id='site-youtube' onclick="trackOutboundLink('wolo-youtube', 'https://www.youtube.com/channel/UCnKSws8Lro8U9Ewtf1Xi5jg')"><span class='image'><?php includeSVG('', 'YouTube'); ?></span></a>
		</span>
	</div>
	
	<div id='download-unified-url' class='center'>
		<span>app:</span> <a class='link' href="https://wolo.codes/get">wolo.codes/get</a>
	</div>
	<div id='download-android-bottom' class="download center">
		<a href='https://play.google.com/store/apps/details?id=codes.wolo.droid' id='site-google-play' onclick="trackOutboundLink('wolo-appandroid', 'https://play.google.com/store/apps/details?id=codes.wolo.droid')"><span class='image'><?php includeSVG('', 'Google-Play-badge'); ?></span></a>
	</div>
	
	<div id='credits'>Wolo codes makes use of these opensource projects: <a class='link' href="https://wolo.codes/credits">wolo.codes/credits</a></div>
	<div id='software_info'>
		<div id='version'>
			Version: <span><?php echo $config['version'] ?></span>
		</div>
		<div id='updated'>Updated:
			<span id='updated-timestamp'>
			<?php
				echo date('Y M d H:i:s').' '.'UTC';
			?>
			</span>
			 ~ 
			<span id='updated-timediff'></span> ago
		</div>
	</div>
	
</div>
