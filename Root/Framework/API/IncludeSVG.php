<?php
	function includeSVG($path, $file) {
		echo file_get_contents('..\..\Resource\\'.$path.'\\'.$file.'.svg');
	}
	
	function getSVG($path, $file) {
		echo "data:image/svg+xml;base64,".base64_encode(preg_replace('!\s+!', ' ', file_get_contents('..\..\Resource\\'.$path.'\\'.$file.'.svg')));
	}
?>
