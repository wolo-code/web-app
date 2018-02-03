<div id='overlay' class='hide'>
	<div id='overlay_message'>
		<div id='overlay_message_close' class="message_dialog_close control">
			<span class='image'><?php echo file_get_contents('../../Resource/Close.svg'); ?></span>
		</div>
		<h1>
			WCode location
		</h1>
		<h2>
			About
		</h2>
		<ol>
			<li>This is a beta version of word based geocoding system</li>
			<li>The first part specifies the city, the last three words are from a limited dictionary of 1024 easy common nouns</li>
			<li>Incase if your city is not in the database, please send a request</li>
			<li>Your precise location will NOT be recorded</li>
			<li>Tested with Google Chrome</li>
		</ol>
		<br>
		<div class="message_dialog_control"><button id='overlay_enter' type='button'>Start &#x25B7;</button></div>
		<h2>
			Steps
		</h2>
		<ol>
			<li>Point a location to generate the corresponding WCode</li>
			<li>Enter a WCode and hit 'Decode' to go to that location</li>
		</ol>
		<h2>
			Known issues
		</h2>
		<ol>
			<li>The wordlist may change and thus your previous wcode may no longer work or point to a different location</li>
			<li>The server roundtrip involves a delay. You may have to wait a few seconds for the result to show up</li>
		</ol>
		<div id='contact'>
			For any related query contact <a class='link' href='https://wcodes.org/about_me'>me</a>.
		</div>
		<div id='updated'>Updated:
<?php
			echo date('Y-M-d H:i:s');
?>
		</div>
	</div>
</div>
