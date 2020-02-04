<?php
	chdir("..\\..\\Framework\\API\\");
	require 'Pre.php';
?>
<!DOCTYPE html>
<html xmlns='http://www.w3.org/1999/xhtml' lang='en'>
<head>
	<meta http-equiv='X-UA-Compatible' content='IE=edge' >
	<meta http-equiv='Content-Type' content="text/html; charset=UTF-8" >
	<title>Privacy policy - Wolo</title>
	<style>
	@font-face {
		font-family: 'Abel';
		font-style: normal;
		font-weight: 400;
		src: local('Abel'), local('Abel-Regular'), url(//fonts.gstatic.com/s/abel/v6/brdGGFwqYJxjg2CD1E9o7g.woff2) format('woff2');
		unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215, U+E0FF, U+EFFD, U+F000;
	}
	body {
		margin: 0 auto;
		padding: 1em;
		font-family: Abel;
		font-size: 1.1em;
		color: #474747;
	}
	@media screen and (min-width: 40em) {
		body {
		  width: 40em;
		}
	}
	h1 {
		margin: 0.6em 0;
		padding: 0.25em 0 0.25em 0;
		border-top: 1px dotted #ccc;
		text-align: center;
		font-size: 3em;
		line-height: 1.1em;
		color: #7F7F7F;
	}
	p {
		margin-left: auto;
		margin-right: auto;
		line-height: 1.8em;
	}
	#logo {
		display: block;
		margin: 3em 0;
		text-align: center;
	}
	#return {
		color: #69B7CF;
		text-decoration: none;
	}
	#mail-link {
		text-decoration: none;
		color: #69b7cf !important;
		text-align: right;
		margin-left: auto;
		margin-right: auto;
		display: block;
	}
	</style>
</head>
<body>
	<a id='logo' href='/'>
		<div id='logo_info'>
			<a id=logo_wolo_info class='blur_background_static' href='//wcodes.org' tabindex='1'>
				<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
			</a>
			<a id=logo_codes_info class='blur_background_static' href='//wolo.codes' tabindex='2'>
				<span class='image'><?php includeSVG('', 'logo_codes'); ?></span>
			</a>
		</div>
	</a>
	<h1>Privacy policy</h1>
	<p>
		Your personally identifiable data will NOT be misused for any reason whatsoever.
	</p>
	<p>
		Your personally identifiable data will NOT be shared with any 3rd party for any reason whatsoever.
	</p>
	<p>
		&gt; return to the <a id='return' href='/'>app</a>
	</p>
	<a id='mail-link' href='mailto:webmaster@wolo.codes?subject=WCodes-Privacy'>webmaster@wolo.codes</a>
	<script src="https://www.gstatic.com/firebasejs/7.4.0/firebase-app.js"></script>
	<script src="https://www.gstatic.com/firebasejs/7.4.0/firebase-analytics.js"></script>
</body>
</html>
