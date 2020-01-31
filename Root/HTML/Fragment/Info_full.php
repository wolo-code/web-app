<div id='info_full' class='hide'>
	<?php echo file_get_contents('../../HTML/Fragment/Info_common.html'); ?>
	<h2>
		Info
	</h2>
	<ul>
		<li>Tested to work with Google Chrome</li>
	</ul>
	<div class='message_dialog_control_container'>
		<div class='message_dialog_control'>
			<button id='info_full_close_button' class='button_highlight' type='button'><span class='indicator'>&#x25C4;</span> return</button>
		</div>
	</div>
	<table>
		<tr>
			<td>Terms of use:</td>
			<td><a class='link' href='/terms'>wolo.codes/terms</a></td>
		</tr>
		<tr>
			<td>Privacy policy:</td>
			<td><a class='link' href='/policy'>wolo.codes/policy</a></td>
		</tr>
		<tr>
			<td>website:</td>
			<td><a class='link' href='//wcodes.org/wolo'>wcodes.org/wolo</a></td>
		</tr>
		<tr>
			<td>contact:</td>
			<td><a class='link' href="mailto:ujjwal@wolo.codes?subject=Wolo">ujjwal@wolo.codes</a></td>
		</tr>
	</table>
	<div id='social-links' class='center'>
		<span class='social grow'>
			<a href='https://twitter.com/wolocodes' id='site-twitter' onclick="trackOutboundLink('wcodes-twitter', 'https://twitter.com/wolocodes'); return false;"><span class='image'><?php includeSVG('', 'Twitter'); ?></span></a>
		</span>
		<span class='social grow'>
			<a href='https://facebook.com/wolocodes' id='site-facebook' onclick="trackOutboundLink('wcodes-facebook', 'https://facebook.com/wolocodes'); return false;"><span class='image'><?php includeSVG('', 'Facebook'); ?></span></a>
		</span>
		<span class='social grow'>
			<a href='https://www.youtube.com/channel/UCnKSws8Lro8U9Ewtf1Xi5jg' id='site-youtube' onclick="trackOutboundLink('wcodes-youtube', 'https://www.youtube.com/channel/UCnKSws8Lro8U9Ewtf1Xi5jg'); return false;"><span class='image'><?php includeSVG('', 'YouTube'); ?></span></a>
		</span>
	</div>
	<div id='software_info'>
		<div id='version'>
			Version: <span>0.1 beta</span>
		</div>
		<div id='updated'>Updated:
			<span>
	<?php
			echo date('Y M d - H:i:s');
	?>
			</span> (UTC)
		</div>
	</div>
</div>
