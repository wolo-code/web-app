<?php
	if( isset($_GET['mode']) && ($_GET['mode'] === 'publish') )
		$bPublish = TRUE;
	else
		$bPublish = FALSE;
?>
<!DOCTYPE html>
<html>
	<head>
		<title>WCode location</title>
		<meta name='robots' content='noindex' >
		<meta name='author' content='ujjwalsingh@outlook.com' >
		<meta name='viewport' content='initial-scale=1.0' >
		<link rel='shortcut icon' type='image/x-icon' href='/favicon.ico' >
		<meta charset='utf-8' >
		<style>
			/* latin */
			@font-face {
				font-family: 'Abel';
				font-style: normal;
				font-weight: 400;
				src: local('Abel'), local('Abel-Regular'), url(//fonts.gstatic.com/s/abel/v6/brdGGFwqYJxjg2CD1E9o7g.woff2) format('woff2');
				unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215, U+E0FF, U+EFFD, U+F000;
			}
		</style>
		<?php
			if($bPublish) {
		?>
				<style type='text/css'>
		<?php
					require 'css\base.css';
		?>
				</style>
				<script>
					<?php require 'js/fragment/ga_header.js' ?>
				</script>
		<?php
			}
			else {
		?>
				<link rel='stylesheet' type='text/css' href='css\base.css' >
		<?php
			}
		?>
		<script>
			<?php require 'js/fragment/base.js' ?>
		</script>
	</head>
	<body>
		<?php
			require 'Overlay.php'
		?>
		<div id='map'></div>
		<a id=logo href='https://wcodes.org' tabindex='1'>
			<span class='image'><?php echo file_get_contents('resource\logo.svg'); ?></span>
		</a>
		<input id='pac-input' class='controls' type='text' placeholder='Search' tabindex='2' >
		<div id='result'></div>
		<input id='decode_button' class='control' type='button' value='Decode' tabindex='3' >
		<div id='location_button' class='control' tabindex='4'>
			<span class='image'><?php echo file_get_contents('resource\location.svg'); ?></span>
		</div>
		<div id='info' class='control' tabindex='5'>
			<span class='image'><?php echo file_get_contents('resource\info.svg'); ?></span>
		</div>
		<div id='notification' class='hide'></div>
		<?php
			if($bPublish) {
		?>
				<script src='script.js'></script>
		<?php
			}
			else {
		?>
				<script src='js/wordlist.js'></script>
				<script src='js/city.js'></script>
				<script src='js/core.js'></script>
				<script src='js/code.js'></script>
				<script src='js/map.js'></script>
				<script src='js/log.js'></script>
				<script src='js/script.js'></script>
		<?php
			}
		?>
		<script src='https://maps.googleapis.com/maps/api/js?key=AIzaSyD3qtN-ejbFTrkes1Y5j3qRY8PmQrxYHDQ&libraries=places&callback=initMap' async defer></script>
	</body>
</html>
