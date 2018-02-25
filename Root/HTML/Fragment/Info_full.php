<div id='info_full' class='hide'>
	<ul>
		<li>This is a word based geocoding system</li>
		<li>The first part specifies the city, the last three words are from a limited dictionary of 1024 easy common nouns</li>
		<li>Incase if your city is not in the database, please submit a request</li>
	</ul>
	<h2>
		Steps
	</h2>
	<ul>
		<li>Point a location to generate the corresponding WCode; Or</li>
		<li>Enter a WCode and hit 'Decode' to go to that location</li>
	</ul>
	<h2>
		Info
	</h2>
	<ul>
		<li>Your precise location will NOT be recorded</li>
		<li>Tested with Google Chrome</li>
	</ul>
	<h2>
		Known issues
	</h2>
	<ol>
		<li>The wordlist may change and thus your previous wcode may no longer work or point to a different location</li>
		<li>The server roundtrip involves a delay. You may have to wait a few seconds for the result to show up</li>
	</ol>
	<div class="message_dialog_control"><button id='info_full_close_button' type='button'>&#x25C1; return</button></div>
	<div id='contact'>
		For any related query contact <a class='link' href='https://wcodes.org/about_me'>me</a>
	</div>
	<div id='updated'>Updated:
<?php
		echo date('Y-M-d H:i:s');
?>
	</div>
</div>
