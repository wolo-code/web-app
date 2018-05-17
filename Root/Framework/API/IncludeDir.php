<?php
	$INCLUDE_MODE_EMBED = 'embed';
	$INCLUDE_MODE_LINK = 'include';
	$INCLUDE_TYPE_CSS = 'css';
	$INCLUDE_TYPE_JS = 'js';
	$INCLUDE_TYPE_EXT = [$INCLUDE_TYPE_CSS => 'css', $INCLUDE_TYPE_JS => 'js'];

	function includeDir($fileRoot, $type, $mode, $exclude) {
		global $bPublish;
		global $INCLUDE_MODE_EMBED;
		global $INCLUDE_MODE_LINK;
		global $INCLUDE_TYPE_CSS;
		global $INCLUDE_TYPE_JS;
		global $INCLUDE_TYPE_EXT;

		$files = loadFiles($fileRoot);
		$i = array_search('Base', $files);
		if($i != null) {
			array_splice($files, $i, 1);
			array_unshift($files, 'Base');
		}
		$i = array_search('Script.js', $files);
		if($i != null) {
			array_splice($files, $i, 1);
			array_push($files, 'Script.js');
		}
		foreach ($files as $file) {
			if(!in_array(strtolower($file), [$exclude, 'link', 'fragment', 'component'])) {
				if(is_dir($fileRoot.$file) == 1) {
					includeDir($fileRoot.$file.'/', $type, $mode, $exclude);
				}
				else if(matchExt($file, $INCLUDE_TYPE_EXT[$type])) {
					if($mode == $INCLUDE_MODE_EMBED) {
						require $fileRoot.$file;
					}
					else if ($mode == $INCLUDE_MODE_LINK) {
						$filePathRoot = substr($fileRoot, 5);
						if ($type == $INCLUDE_TYPE_CSS) {
?>
	<link rel='stylesheet' href='<?php echo $filePathRoot.$file ?>' >
<?php
						}
						else if ($type == $INCLUDE_TYPE_JS) {
?>
	<script src='<?php echo $filePathRoot.$file ?>' <?php if($bPublish) echo 'async'; else if(in_array(strtolower($file), ['script.js', 'database.js'])) echo 'defer' ?>></script>
<?php
						}
						else {
							// log error
						}
					}
					else {
						// log error
					}
				}
			}
		}
	}

	function hasLink($type, ...$dirList) {
		global $INCLUDE_TYPE_EXT;

		foreach ($dirList as $dir) {
			$files = loadFiles($dir);
			foreach ($files as $file) {
				if(!in_array(strtolower($file), ['base', 'link', 'fragment'])) {
					if(matchExt($file, $INCLUDE_TYPE_EXT[$type])) {
						return true;
					}
				}
			}
		}
		return false;
	}

	function includeDirHeader($fileRoot, $dir) {
		if(is_dir($fileRoot) == 1) {
			$files = loadFiles($fileRoot);
			foreach ($files as $file) {
				if($file == 'Head' && (is_dir($fileRoot.$file) == 1)) {
					includeDirHeader($fileRoot.$file.'/', true);
				}
				else if($file == 'Head.html' || $dir == true) {
					echo file_get_contents($fileRoot.$file);
				}
			}
		}
	}
	
?>
