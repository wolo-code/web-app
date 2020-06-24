<div id='info_full' class='hide'>
	
	<div class='message_dialog_control_container'>
		<div class='message_dialog_control'>
			<button id='info_full_close_button' class='button_highlight' type='button'><span class='indicator'><span class='image'><?php includeSVG('', 'Back'); ?></span></span> return</button>
		</div>
	</div>
	
	<div id='download-unified-url' class='center'>
		<span>app:</span> <a class='link' href="https://wolo.codes/get">wolo.codes/get</a>
	</div>
	<div id='download-android-bottom' class="download coming-soon center">
		<a href='https://play.google.com/store/apps/details?id=codes.wolo.droid' id='site-google-play' onclick="trackOutboundLink('wolo-appandroid', 'https://play.google.com/store/apps/details?id=codes.wolo.droid')"><span class='image'><?php includeSVG('', 'Google-Play-badge'); ?></span></a>
	</div>

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
	
	<ul id='info_list'>
		<li>Tested to work with Google Chrome</li>
	</ul>
	
	<div id='software_info'>
		<div id='version'>
			Version: <span>0.1 beta</span>
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
