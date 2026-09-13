<?php
if(!function_exists('renderMailLink')) {
	function renderMailLink($user, $domain, $options = array()) {
		$id = isset($options['id']) ? $options['id'] : '';
		$class = 'mail-link';
		if(!empty($options['class']))
			$class = trim($options['class'].' '.$class);
		$subject = isset($options['subject']) ? $options['subject'] : '';
		$html = '<a';
		if($id !== '')
			$html .= " id='".htmlspecialchars($id, ENT_QUOTES)."'";
		$html .= " class='".htmlspecialchars($class, ENT_QUOTES)."' href='#' data-u='".htmlspecialchars($user, ENT_QUOTES)."' data-d='".htmlspecialchars($domain, ENT_QUOTES)."'";
		if($subject !== '')
			$html .= " data-s='".htmlspecialchars($subject, ENT_QUOTES)."'";
		$html .= "><span class='mail-obf'>".htmlspecialchars(strrev($user.'@'.$domain))."</span></a>";
		return $html;
	}
}
