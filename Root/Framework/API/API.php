<?php

	function getOrigCall() {
		if(strlen($_SERVER['QUERY_STRING']) == 0)
			return (substr($_SERVER['REQUEST_URI'], 1));
		else {
			$pos = strpos($_SERVER['REQUEST_URI'], $_SERVER['QUERY_STRING']);
			return (substr($_SERVER['REQUEST_URI'], 1, $pos - 2));
		}
	}

	function getOrigCallComponent() {
		if(strlen($_SERVER['QUERY_STRING']) == 0)
			$component_id = (substr($_SERVER['REQUEST_URI'], 1));
		else {
			$pos = strpos($_SERVER['REQUEST_URI'], $_SERVER['QUERY_STRING']);
			$component_id = (substr($_SERVER['REQUEST_URI'], 1, $pos - 2));
		}
		if(strpos($component_id, '.') !== false)
			return substr($component_id, 0, strpos($component_id, '.'));
		else
			return $component_id;
	}

	function getComponent() {
		$component = getOrigCallComponent();
		while(true) {
			if( $component == '' || is_dir('..\\..\\HTML\\component\\'.$component) == 1 || is_file('..\\..\\HTML\\component\\'.$component.'.php') == 1 || is_file('..\\..\\HTML\\component\\'.$component.'.html') == 1 )
				return $component;
			else
				$component = substr($component, 0, strpos('\\', $component));
		}
	}
	
	function addAttribute(DOMElement $e, $name, $value) {
		$a = $e->getAttribute($name);
		$e->setAttribute($name, $a." ".$value);
	}

	function getFileDate($file) {
		date_default_timezone_set("UTC");
		return date("Y M d", filemtime($file));
	}

	function endsWith($haystack, $needle) {
		return preg_match('/' . preg_quote($haystack, '/') . '$/', $needle);
	}

	function matchExt($haystack, $needle) {
		if(strlen($haystack) < strlen($needle))
			return false;
		else
			return (substr($haystack, -strlen($needle)) == $needle);
	}

	function loadFiles($dir) {
		$files = scandir($dir);
		array_shift($files);
		array_shift($files);

		return $files;
	}

	function exit_404($message) {
		header("HTTP/1.0 404 Not Found");
		error_log($message);
		require '404.php';
		exit;
	}

?>
