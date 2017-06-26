<!DOCTYPE html>
<html>
<head>
	<meta http-equiv="X-UA-Compatible" content="chrome=1" />
	<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
	<meta name="title" content="<?php echo $config['project_title'] ?>" />
	<meta itemprop="name" content="<?php echo $config['project_title'] ?>" />
	<meta charset='utf-8' >
	<meta name='robots' content='noindex' >
	<meta name="author" content="<?php echo $config['author'] ?>" />
	<meta name='viewport' content='initial-scale=1.0' >
	<link rel='shortcut icon' type='image/x-icon' href='/favicon.ico' >
	<link rel='manifest' href='/manifest.json' >
	<link href="<?php echo $config['base_url']; if($id != 'root') echo '/'.$id ?>" rel='canonical' >
	<?php
		if($bPublish) {
	?>
			<script>
				<?php require '../../JS/Fragment/GA_header.js' ?>
			</script>
	<?php
		}
		require '../CSS/Fragment/CSS.php';
	?>
</head>
<body>
<?php
	require '../JS/Fragment/JS.php';
	require '../../HTML/Component/Root.php';
?>
</body>
</html>
