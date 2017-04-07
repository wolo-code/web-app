<?php
	if( isset($_GET['mode']) && ($_GET['mode'] === "publish") )
		$bPublish = TRUE;
	else
		$bPublish = FALSE;
?>
<!DOCTYPE html>
<html>
	<head>
		<title>WCode location</title>
		<meta name="robots" content="noindex" >
		<meta name="author" content="ujjwalsingh@outlook.com" >
		<meta name="viewport" content="initial-scale=1.0" >
		<meta charset="utf-8" >
		<?php
			if($bPublish) {
		?>
				<style type='text/css'>
		<?php
					require 'base.css';
		?>
				</style>
				<script>
					(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
						(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
						m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
					})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

					ga('create', 'UA-96994409-1', 'auto');
					ga('send', 'pageview');
				</script>
		<?php
			}
			else {
		?>
				<link rel='stylesheet' type='text/css' href='base.css' >
		<?php
			}
		?>
	</head>
	<body>
		<a id=logo href="https://wcodes.org">
			<span class='image'><?php echo file_get_contents('resource\logo.svg'); ?></span>
		</a>
		<div id="location_button">
			<span class='image'><?php echo file_get_contents('resource\location.svg'); ?></span>
		</div>
		<input id="pac-input" class="controls" type="text" placeholder="Search" >
		<input id="decode_button" type="button" value="Decode" >
		<div id="map"></div>
		<?php
			if($bPublish) {
		?>
				<script src='script.js'></script>
		<?php
			}
			else {
		?>
				<script src='wordlist.js'></script>
				<script src='city.js'></script>
				<script src='core.js'></script>
				<script src='code.js'></script>
				<script src='map.js'></script>
				<script src='log.js'></script>
		<?php
			}
		?>
		<script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyD3qtN-ejbFTrkes1Y5j3qRY8PmQrxYHDQ&libraries=places&callback=initMap" async defer></script>
	</body>
</html>
