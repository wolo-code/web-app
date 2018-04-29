<!DOCTYPE html>
<html xmlns='http://www.w3.org/1999/xhtml' lang='en' itemscope='' itemtype='http://schema.org/WebApplication'>
<head>
	<meta http-equiv='X-UA-Compatible' content='IE=edge' >
	<meta http-equiv='Content-Type' content="text/html; charset=UTF-8" >
	<meta name='title' content="<?php echo $config['project_title'] ?>" >
	<meta itemprop='name' content="<?php echo $config['project_title'] ?>" >
	<meta name='robots' content='noindex' >
	<meta name='author' content="<?php echo $config['author'] ?>" >
	<meta name='viewport' content='initial-scale=1.0' >
	<link rel='shortcut icon' type='image/x-icon' href='/favicon.ico' >
	<link href='<?php echo $config['base_url']; ?>' rel='canonical' >
	<title>
<?php
	echo $config['project_description'].' - '.$config['project_title'];
?>
	</title>
<?php
	if($bPublish) {
?>
	<script>
		<?php require '../../JS/Fragment/GA_header.js' ?>
	</script>
<?php
	}
	$component = "";
	require '../CSS/Fragment/CSS.php';
	$component = $id;
	require '../CSS/Fragment/CSS.php';
	
	require '../HTML/Fragment/Head.php';
?>
</head>
<body>
	<script src='https://www.gstatic.com/firebasejs/4.6.0/firebase-app.js'></script>
	<script src='https://www.gstatic.com/firebasejs/4.6.0/firebase-database.js'></script>
<?php
	require (getComponentPath($id));
	if($bPublish) {
?>
		<script src='https://cdn.ravenjs.com/3.22.2/raven.min.js' crossorigin='anonymous'></script>
		<script><?php require '../JS/Fragment/Sentry.php' ?></script>
<?php
	}
	$component = "";
	require '../JS/Fragment/JS.php';
	$component = $id;
	require '../JS/Fragment/JS.php';
?>
	<script src='https://maps.googleapis.com/maps/api/js?key=<?php echo $config['google_api_key'] ?>&libraries=places&callback=initMap' async defer></script>
	<script><?php require '../../JS/Fragment/UpdateMyBrowser.js' ?></script>
	<script><?php require '../JS/Fragment/UpdateMyBrowser.js' ?></script>
</body>
</html>
