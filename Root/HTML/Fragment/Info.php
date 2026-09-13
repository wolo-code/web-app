<div id='info_message' class='hide'>
	<div id='info_message_close' class="message_dialog_close control hide">
		<span class='image'><?php includeSVG('', 'Close'); ?></span>
	</div>
	<div id='logo_info'>
		<a id=logo_wolo_info href='//wcodes.org' tabindex='1'>
			<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
		</a>
		<a id=logo_codes_info href='//wolo.codes' tabindex='2'>
			<span class='image'><?php includeSVG('', 'logo_code'); ?></span>
		</a>
	</div>
<?php
	$appVersionShort = formatAppVersionShort($config);
	$appVersionFull = formatAppVersion($config);
	$appVersionShortLabel = 'v' . $appVersionShort;
	$appVersionFullLabel = 'v' . $appVersionFull;
	$appUpdatedUtc = date('Y M d H:i:s') . ' UTC';
?>
	<button type='button' id='info_version_indicator' class='info_version_toggle' data-version-short='<?php echo htmlspecialchars($appVersionShortLabel, ENT_QUOTES, 'UTF-8') ?>' data-version-full='<?php echo htmlspecialchars($appVersionFullLabel, ENT_QUOTES, 'UTF-8') ?>' data-updated='<?php echo htmlspecialchars($appUpdatedUtc, ENT_QUOTES, 'UTF-8') ?>' aria-expanded='false' aria-label='Version'><span class='info_version_stamp'><span class='info_version_stamp_utc'><?php echo htmlspecialchars($appUpdatedUtc, ENT_QUOTES, 'UTF-8') ?></span><span class='info_version_stamp_local'><?php echo htmlspecialchars($appUpdatedUtc, ENT_QUOTES, 'UTF-8') ?></span></span><span class='info_version_text'><span class='info_version_width' aria-hidden='true'><?php echo htmlspecialchars($appVersionFullLabel, ENT_QUOTES, 'UTF-8') ?></span><span class='info_version_label'><?php echo htmlspecialchars($appVersionShortLabel, ENT_QUOTES, 'UTF-8') ?></span></span></button>
	<?php echo file_get_contents('../../HTML/Fragment/Info_common.html'); ?>
	<?php
		require '../../HTML/Fragment/Info_intro.php';
		require '../../HTML/Fragment/Info_full.php';
		require '../../HTML/Fragment/Info_links.php';
	?>
	<div id='info_agency'>
		by <a class='link' href='https://wcodes.org/about_me'>Ujjwal Singh</a>
	</div>
	<button id='info_show_icon_labels' type='button' title='show guide'>show guide</button>
</div>
