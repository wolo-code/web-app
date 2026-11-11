<?php

function canonicalizeWoloPathPart($part) {
	$text = strtolower(trim(str_replace(array('_', '+'), ' ', $part)));
	$text = preg_replace('/\s+/', '-', $text);
	return $text;
}

function canonicalizeRootPath($path) {
	$suffix = '';
	if($path !== '') {
		$last = substr($path, -1);
		if($last === '/' || $last === '_') {
			$suffix = $last;
			$path = substr($path, 0, -1);
		}
	}
	$decoded = rawurldecode($path);
	$parts = explode('.', $decoded);
	if(count($parts) < 4)
		return strtolower($path).$suffix;
	$canonical = array_map('canonicalizeWoloPathPart', $parts);
	return implode('.', $canonical).$suffix;
}

function getComponentURLtrimmed($id) {
	$path = getOrigCall();
	if($path === '')
		return '';
	if($id === 'root')
		return '/'.canonicalizeRootPath($path);
	return '/'.$path;
}

function getComponentTitle($id) {
	return '';
}

function getComponentMetaImage($id) {
	return 'social.png';
}

function getComponentDesc($id) {
	global $config;
	return $config['project_description'];
}

?>
