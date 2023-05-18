<?php
	require_once '../API/Pre.php';
	$webMasterId = 'webmaster'.'@'.$config['site_domain'];
?>
<!DOCTYPE html>
<html xmlns='http://www.w3.org/1999/xhtml' lang='en'>
<head>
	<meta http-equiv='X-UA-Compatible' content='IE=edge' >
	<meta http-equiv='Content-Type' content="text/html; charset=UTF-8" >
	<title>Page Not Found<?php echo ' - '.$config['project_title'] ?></title>
	<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-app.js"></script>
	<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-analytics.js"></script>
	<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-performance.js"></script>
	<script><?php require '../JS/Fragment/Firebase_inits.php' ?></script>
	<script>
		var app = firebase.initializeApp(FIREBASE_CONFIG);
		var analytics = firebase.analytics();
	</script>
	<?php
		if($bPublish) {
	?>
			<script <?php require '../JS/Fragment/Sentry_version.php' ?>></script>
			<script><?php require '../JS/Fragment/Sentry_exec.php' ?></script>
	<?php
		}
	?>
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
		margin: 1em 0;
		padding: 0 0 0.25em 0;
		border-bottom: 1px dotted #ccc;
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
	#logo_wolo svg {
		height: 140px;
	}
	#logo_codes svg {
		height: 72px;
		width: 580px;
	}
	#url {
		text-align: center;
		color: #69B7CF;
		font-size: x-large;
		display: block;
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
	<h1>Page Not Found</h1>
	<p>
		This specified file was not found on this website:
		<div id='url'></div>
	</p>
	<p>
		Please check the URL for mistakes and try again.
	</p>
	<p>
		Or,
	</p>
	<p>
		continue to the homepage:
	</p>
	<div id='logo'>
		<a id='logo_wolo' href='/'>
			<?php require '../../Resource/Logo_wolo.svg' ?>
		</a>
		<a id='logo_codes' href='/'>
			<?php require '../../Resource/Logo_code.svg' ?>
		</a>
	</div>
	<a id='mail-link' href='mailto:<?php echo $webMasterId ?>?subject=<?php echo $config['project_title'] ?>-404'><?php echo $webMasterId ?></a>
	<script>
		if(window.location.pathname == '/404') {
			if(window.location.search.length) {
				var url_param = window.location.search.substr(1).replace("url=", '');
				document.getElementById('url').innerHTML = url_param;
				analytics.logEvent('404', {
					url: url_param
				});
			}
			else	
				document.getElementById('url').setAttribute('style',"display: none");
		}
		else
			document.getElementById('url').innerHTML = window.location.href;
	</script>
</body>
</html>
