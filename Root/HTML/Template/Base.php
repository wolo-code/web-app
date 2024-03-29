<!DOCTYPE html>
<html xmlns='http://www.w3.org/1999/xhtml' lang='en' itemscope='' itemtype='http://schema.org/WebApplication'>
<head>
	<meta http-equiv='X-UA-Compatible' content='IE=edge' >
	<meta http-equiv='Content-Type' content="text/html; charset=UTF-8" >
	<meta name='title' content="<?php echo $config['project_title'] ?>" >
	<meta itemprop='name' content="<?php echo $config['project_title'] ?>" >
	<meta name='author' content="<?php echo $config['author'] ?>" >
	<meta name='viewport' content="initial-scale=1.0, viewport-fit=cover" >
	<meta name='theme-color' content='#ffffff' >
	<?php require '../HTML/Fragment/OG_Meta.php' ?>
	<?php require '../HTML/Fragment/FB_Meta.php' ?>
	<?php require '../HTML/Fragment/Twitter_Meta.php' ?>
	<link rel='icon' type='image/svg+xml' href='/favicon.svg' >
	<link rel="alternate icon" type='image/x-icon' href='/favicon.ico' >
	<link rel='apple-touch-icon' type='image/png' href='/apple-touch-icon.png' >
	<link href='<?php echo $config['base_url']; ?>' rel='canonical' >
	<title><?php echo $config['project_title'] ?></title>
<?php
	$component = $id;
	require '../HTML/Fragment/Head.php';
?>
	<script><?php require '../JS/Fragment/Firebase_inits.php' ?></script>
<?php
	if($bPublish) { ?>
		<script <?php require '../JS/Fragment/Sentry_version.php' ?>></script>
		<script><?php require '../JS/Fragment/Sentry_exec.php' ?></script>
<?php	} else { ?>
		<script src='/umb.js'></script>
		<script src='/svgs.js'></script>
<?php }
	$component = '';
	require '../JS/Fragment/JS.php';
	$component = $id;
	require '../JS/Fragment/JS.php';
?>
<?php
	$component = '';
	require '../CSS/Fragment/CSS.php';
	$component = $id;
	require '../CSS/Fragment/CSS.php';
?>
</head>
<body <?php if($id == 'root') { ?>class='decode'<?php } ?>>
	<?php	require (getComponentPath($id)); ?>
	<script src='https://maps.googleapis.com/maps/api/js?key=<?php echo $config['google_maps_api_key'] ?>&libraries=places&callback=syncInitMap' async defer></script>
	<script src='/geofire.min.js' async defer></script>
	<script src='/html2canvas.min.js' async defer></script>
</body>
</html>
