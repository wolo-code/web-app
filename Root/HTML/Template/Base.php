<!DOCTYPE html>
<html xmlns='http://www.w3.org/1999/xhtml' lang='en' itemscope='' itemtype='http://schema.org/WebApplication'>
<head>
	<meta http-equiv='X-UA-Compatible' content='IE=edge' >
	<meta http-equiv='Content-Type' content="text/html; charset=UTF-8" >
	<meta name='title' content="<?php echo $config['project_title'] ?>" >
	<meta itemprop='name' content="<?php echo $config['project_title'] ?>" >
	<meta name='robots' content='noindex' >
	<meta name='author' content="<?php echo $config['author'] ?>" >
	<meta name='viewport' content='initial-scale=1.0, viewport-fit=cover' >
	<link rel="shortcut icon" type='image/x-icon' href='/favicon.ico' >
	<link href='<?php echo $config['base_url']; ?>' rel='canonical' >
	<title><?php echo $config['project_description'].' - '.$config['project_title']; ?></title>
<?php
	$component = $id;
	require '../HTML/Fragment/Head.php';
	if($bPublish) { ?>
		<script><?php require '../../JS/Fragment/GA_header.js' ?></script>
		<script <?php require '../JS/Fragment/Sentry_version.php' ?>></script>
		<script><?php require '../JS/Fragment/Sentry_exec.php' ?></script>
<?php	} else { ?>
		<script src='/umb.js'></script>
		<script src='/svgs.js'></script>
<?php }
	$component = "";
	require '../JS/Fragment/JS.php';
	$component = $id;
	require '../JS/Fragment/JS.php';
?>
<?php
	$component = "";
	require '../CSS/Fragment/CSS.php';
	$component = $id;
	require '../CSS/Fragment/CSS.php';
?>
<body>
	<?php	require (getComponentPath($id)); ?>
	<script src='https://maps.googleapis.com/maps/api/js?key=<?php echo $config['google_api_key'] ?>&libraries=places&callback=syncInitMap' async defer></script></head>
	<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-app.js"></script>
	<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-database.js"></script>
	<script src="/geofire.min.js"></script>
</body>
</html>
