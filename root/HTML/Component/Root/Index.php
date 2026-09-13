<div id='wait_loader'></div>
<div id='map_stage'>
	<div id='apple_map' class='hide' aria-hidden='true'></div>
	<div id='map'></div>
</div>
<div id='osm_attribution' class='map_attribution hide blur_background' data-map-layer='osm'>Map data &copy; <a class='link' href='https://www.openstreetmap.org/copyright' target='_blank' rel='noopener noreferrer'>OpenStreetMap</a> contributors</div>
<div id='apple_attribution' class='map_attribution hide' data-map-layer='apple' hidden></div>
<div id='esri_attribution' class='map_attribution hide blur_background' data-map-layer='esri'>Tiles &copy; <a class='link' href='https://www.esri.com/' target='_blank' rel='noopener noreferrer'>Esri</a> &mdash; Esri, OpenStreetMap contributors, and the GIS user community</div>
<div id='microsoft_attribution' class='map_attribution hide blur_background' data-map-layer='microsoft'>&copy; <a class='link' href='https://www.microsoft.com/maps' target='_blank' rel='noopener noreferrer'>Microsoft</a></div>
<div id='map_input_suggestion_result' class='suggestion_result' data-input='pac-input' data-resize_input='false'></div>
<span id='search_icon' class='image'><?php includeSVG('', 'Search'); ?></span>
<input id='pac-input' data-suggest='map_input_suggestion_result' data-handler='decode_button' class='controls' type='text' placeholder='' tabindex='3' pattern='[23456789CFJKLMPTcfjklmpt]([\s\-]*[23456789CFJKLMPTcfjklmpt]){9}|[23456789CFGHJMPQRVWXcfghjmpqrvwx]{8}\+[23456789CFGHJMPQRVWXcfghjmpqrvwx]{2,3}|[23456789CFGHJMPQRVWXcfghjmpqrvwx]{4,6}\+[23456789CFGHJMPQRVWXcfghjmpqrvwx]{2,3}( .+)?' >
<div id='decode_button' class='control' tabindex='4' title='Go' aria-label='Go'>
	<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
</div>
<div id='decode_interface_overlay'>
	<div id='decode_input_container'>
		<div id='decode_city_context'>
			<div id='decode_city_source_controls'>
				<button id='decode_city_ip' class='decode_city_source_button' type='button' aria-label='Use IP city' title='Use IP city'>
					<span class='image'><?php includeSVG('', 'Globe'); ?></span>
					<span class='decode_icon_caption' aria-hidden='true'>IP city</span>
				</button>
				<button id='decode_city_geolocation' class='decode_city_source_button' type='button' aria-label='Use geolocation city' title='Use geolocation city'>
					<span class='image'><?php includeSVG('', 'Location-source'); ?></span>
					<span class='decode_icon_caption' aria-hidden='true'>GPS city</span>
				</button>
				<button id='decode_city_history_toggle' class='decode_city_source_button' type='button' aria-label='Choose previous city' title='Choose previous city' aria-expanded='false'>
					<span class='image'><?php includeSVG('', 'List'); ?></span>
					<span class='decode_icon_caption' aria-hidden='true'>Previous</span>
				</button>
			</div>
			<div id='decode_input_city'>&nbsp;</div>
		</div>
		<div id='decode_input_suggestion_result' class='suggestion_result' data-input='decode_input' data-resize_input='true'></div>
		<textarea id='decode_input' data-suggest='decode_input_suggestion_result' data-handler='decode_input_button' rows='1' placeholder="\ Wolo Code /" autocomplete='off'></textarea>
		<div id='decode_input_button' class='control' tabindex='4' title='Go' aria-label='Go'>
			<span class='image'><?php includeSVG('', 'Proceed'); ?></span>
			<span class='decode_icon_caption' aria-hidden='true'>Go</span>
		</div>
		<input id='decode_input_case' type='text' tabindex='-1' aria-hidden='true' autocomplete='off' required pattern='[23456789CFJKLMPTcfjklmpt]([\s\-]*[23456789CFJKLMPTcfjklmpt]){9}|[23456789CFGHJMPQRVWXcfghjmpqrvwx]{8}\+[23456789CFGHJMPQRVWXcfghjmpqrvwx]{2,3}|[23456789CFGHJMPQRVWXcfghjmpqrvwx]{4,6}\+[23456789CFGHJMPQRVWXcfghjmpqrvwx]{2,3}( .+)?'>
	</div>
	<span id='decode_input_shadow'></span>
</div>
<button id='decode_map_view_button' class='control' type='button' aria-label='Terrain map view' title='Terrain map view' tabindex='6'>
	<span class='image'><?php includeSVG('', 'Map-terrain'); ?></span>
	<span class='decode_icon_caption decode_chrome_caption' aria-hidden='true'>Map</span>
</button>
<div id='overlay' class="overlay hide">
	<div>
	<?php
		require '../../HTML/Fragment/Redirect.php';
		require '../../HTML/Fragment/External.php';
		require '../../HTML/Fragment/NoCity.php';
		require '../../HTML/Fragment/DecodeCityHistory.php';
		require '../../HTML/Fragment/ChooseCity_by_name.php';
		require '../../HTML/Fragment/ChooseCity_by_periphery.php';
		require '../../HTML/Fragment/LocateRight.php';
		require '../../HTML/Fragment/Invalid_code.php';
		require '../../HTML/Fragment/Info.php';
		require '../../HTML/Fragment/Exception.html';
		require '../../HTML/Fragment/Incompatible_browser.html';
		require '../../HTML/Fragment/QR.php';
		require '../../HTML/Fragment/Authentication.php';
		require '../../HTML/Fragment/Account_Dialog.php';
	?>
	</div>
</div>
<div id='notification_bottom' class="notification_bar hide"></div>
<div id='logo' tabindex='1' title='Press and hold to clear cache and reload'>
	<div id='logo_surface' class='blur_background'>
		<a id=logo_wolo href='//wolo.codes'>
			<span class='image'><?php includeSVG('', 'logo_wolo'); ?></span>
		</a>
		<a id=logo_codes href='//wolo.codes'>
			<span class='image'><?php includeSVG('', 'logo_code'); ?></span>
		</a>
	</div>
</div>
<div id='account' class="control" title='Account' aria-label='Account'>
	<span class='image'>
		<img id='account_user_image' alt='Account user image' class='hide' src='data:,'>
		<span id='account_default_image' class="inactive hide"><?php includeSVG('', 'Account'); ?></span>
	</span>
	<span class='decode_icon_caption decode_chrome_caption' aria-hidden='true'>Account</span>
</div>
<div id='location_button' class='control' tabindex='5' title='Locate' aria-label='Locate'>
	<span class='image'><?php includeSVG('', 'Location'); ?></span>
	<span class='decode_icon_caption decode_chrome_caption' aria-hidden='true'>Locate</span>
</div>
<div id='map_type_button' class='control' tabindex='-1' title='Switch map' aria-label='Switch map'>
	<span class='image map_type_icon'>
		<span class='map_type_icon_terrain'><?php includeSVG('', 'Map-terrain'); ?></span>
		<span class='map_type_icon_satellite'><?php includeSVG('', 'Map-satellite'); ?></span>
		<span class='map_type_icon_osm'><?php includeSVG('', 'Map-osm'); ?></span>
		<span class='map_type_icon_apple'><?php includeSVG('', 'Map-apple'); ?></span>
		<span class='map_type_icon_esri'><?php includeSVG('', 'Map-esri'); ?></span>
		<span class='map_type_icon_microsoft'><?php includeSVG('', 'Map-microsoft'); ?></span>
	</span>
</div>
<div id='decode_icon_guide_scrim'></div>
<div id='action_menu' class='control' tabindex='7'>
	<div id='action_menu_items'>
		<button id='action_menu_info' class='action_menu_item' type='button' tabindex='-1' aria-label='Info' title='Info'>
			<span class='image'><?php includeSVG('', 'Info'); ?></span>
			<span class='decode_icon_caption decode_chrome_caption' aria-hidden='true'>Info</span>
		</button>
		<button id='action_menu_decode' class='action_menu_item' type='button' tabindex='-1' aria-label='Wolo Code input' title='Wolo Code input'>
			<span class='image view_toggle_icon'>
				<span class='view_toggle_icon_map'><?php includeSVG('', 'Map-terrain'); ?></span>
				<span class='view_toggle_icon_code'><?php includeSVG('', 'Wolo-code'); ?></span>
			</span>
		</button>
		<button id='action_menu_map' class='action_menu_item' type='button' tabindex='-1' aria-label='Map view' title='Map view'>
			<span class='image map_type_icon'>
				<span class='map_type_icon_terrain'><?php includeSVG('', 'Map-terrain'); ?></span>
				<span class='map_type_icon_satellite'><?php includeSVG('', 'Map-satellite'); ?></span>
				<span class='map_type_icon_osm'><?php includeSVG('', 'Map-osm'); ?></span>
				<span class='map_type_icon_apple'><?php includeSVG('', 'Map-apple'); ?></span>
				<span class='map_type_icon_esri'><?php includeSVG('', 'Map-esri'); ?></span>
				<span class='map_type_icon_microsoft'><?php includeSVG('', 'Map-microsoft'); ?></span>
			</span>
		</button>
	</div>
</div>
<div id='notification_top' class="notification_bar hide">Try: Bengaluru, India</div>
<div id='offline_queue_badge' class='offline_queue_badge hide' aria-live='polite'></div>
<div id='map_bottom_stack'>
	<?php require '../../HTML/Fragment/Accuracy.php' ?>
	<?php require '../../HTML/Fragment/Address.php'; ?>
</div>
<div id='footer-content-container' class='center'>
	<div id='footer-content' class='blur_background'>
		<a class='link-gray' href='/license'>&copy; <?php echo date('Y'); ?> </a>
		<span id='footer_author' class='link'>Wolo</span>
	</div>
</div>
<?php require '../../HTML/Fragment/Firebase_includes.php'; ?>
<script src='https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-auth.js'></script>
<script src='https://www.gstatic.com/firebasejs/ui/<?php echo $config['firebase_ui_version'] ?>/firebase-ui-auth.js'></script>
<link type="text/css" rel="stylesheet" href="https://www.gstatic.com/firebasejs/ui/<?php echo $config['firebase_ui_version'] ?>/firebase-ui-auth.css" />
<script type="module" src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/<?php echo $config['jspdf_version'] ?>/jspdf.umd.min.js"></script>
