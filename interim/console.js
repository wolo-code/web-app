<!DOCTYPE html>
<html>
<head>
	<meta http-equiv='X-UA-Compatible' content="chrome=1" />
	<meta http-equiv='Content-Type' content="text/html; charset=UTF-8" />
	<meta name='title' content="WCode location" />
	<meta itemprop='name' content="WCode location" />
	<meta charset='utf-8' >
	<meta name='robots' content='noindex' >
	<meta name='author' content="Ujjwal Singh" />
	<meta name='viewport' content='initial-scale=1.0' >
	<link rel='shortcut icon' type='image/x-icon' href='/favicon.ico' >
	<link rel='manifest' href='/manifest.json' >
	<link href='https://location.wcodes.org' rel='canonical' >
	<title>
WCode based addressing system - WCode location	</title>
	<script>
		(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
	(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
	m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','https://www.google-analytics.com/analytics.js','ga');

ga('create', 'UA-96994409-1', 'auto');
ga('send', 'pageview');
	</script>
	<style type='text/css'>
html,
body {
	height: 100%;
	margin: 0;
	padding: 0;
}

input {
	-webkit-appearance: none;
}

@font-face {
	font-family: 'Abel';
	font-style: normal;
	font-weight: 400;
	src: local('Abel'), local('Abel-Regular'), url(//fonts.gstatic.com/s/abel/v6/brdGGFwqYJxjg2CD1E9o7g.woff2) format('woff2');
	unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2212, U+2215, U+E0FF, U+EFFD, U+F000;
}

/* Always set the map height explicitly to define the size of the div
 * element that contains the map. */
#map {
	height: 100%;
}
/* Optional: Makes the sample page fill the window. */

#description {
	font-family: Roboto;
	font-size: 15px;
	font-weight: 300;
}

.pac-card {
	margin: 10px 10px 0 0;
	border-radius: 2px 0 0 2px;
	box-sizing: border-box;
	-moz-box-sizing: border-box;
	outline: none;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	background-color: #fff;
	font-family: Roboto;
}

#pac-container {
	padding-bottom: 12px;
	margin-right: 12px;
}

.pac-controls {
	display: inline-block;
	padding: 5px 11px;
}

.pac-controls label {
	font-family: Roboto;
	font-size: 13px;
	font-weight: 300;
}

#logo_wcode {
	z-index: 1;
	position: absolute;
	right: 10px;
	top: 10px;
	background: rgba(241, 241, 241, 0.75);
	border-radius: 6px;
	border-width: thin;
	border-color: #e8e8e8;
	border-style: solid;
	padding: 2px;
}

#logo_wcode > .image > svg {
	height: 50px;
}

#logo_location {
	z-index: 1;
	position: absolute;
	right: 10px;
	top: 68px;
	background: rgba(241, 241, 241, 0.75);
	border-radius: 6px;
	border-width: thin;
	border-color: #e8e8e8;
	border-style: solid;
	padding: 2px;
}

#logo_location > .image > svg {
	padding-top: 4px;
	height: 14px;
	width: 152px;
}

#location_button {
	z-index: 1;
	position: absolute;
	right: 46px;
	bottom: 24px;
	height: 24px;
	box-shadow: rgba(0, 0, 0, 0.298039) 0px 1px 4px -1px;
  background-color: rgb(255, 255, 255);
	padding: 6px;
	border: none;
	border-radius: 2px;
}

#pac-input {
	left: 0px !important;
	top: 36px !important;
	height: 26px;
	background-color: #fff;
	font-family: Roboto;
	font-size: 15px;
	font-weight: 300;
	margin-left: 12px;
	padding: 8px;
	border: none;
	text-overflow: ellipsis;
	width: 400px;
	box-shadow: rgba(0, 0, 0, 0.298039) 0px 1px 4px -1px;
}

#decode_button {
	z-index: 1;
	position: absolute;
	left: 428px;
	top: 36px;
	height: 42px;
	box-shadow: rgba(0, 0, 0, 0.298039) 0px 1px 4px -1px;
	color: #69B7CF;
  font-family: Roboto, Arial, sans-serif;
	font-size: 15px;
  background-color: rgb(255, 255, 255);
	padding: 8px 10px;
	border: none;
	border-radius: 2px;
}

#pac-input:focus {
	border-color: #4d90fe;
}

#title {
	color: #fff;
	background-color: #4d90fe;
	font-size: 25px;
	font-weight: 500;
	padding: 6px 12px;
}

#target {
	width: 345px;
}

@media (max-width: 512px) {

	#pac-input {
		top: 96px !important;
		left: -4px !important;
		width: 310px !important;
	}

	#decode_button {
		top: 96px !important;
		left: auto !important;
		right: 10px !important;
	}

	#logo > .image > svg {
		height: 40px !important;
	}

	#result {
		top: 60px !important;
	}
	/*#logo {
		left: 0;
		right: 0;
		margin-left: auto;
		margin-right: auto;
		width: 126px;
	}*/

}

.link {
	color: #69B7CF;
	text-decoration: none;
}

.hide {
	display: none;
}

#info {
	z-index: 1;
	position: absolute;
	bottom: 30px;
	left: 10px;
}

.control {
	cursor: pointer;
}

.slash {
	color: #DDDDDD;
	font-size: large;
}

#result {
	position: absolute;
	top: 8px;
	left: 12px;
}

#result > div {
	display: inline-block;
	background-color: #FFFFFF;
	border-radius: 20px;
	color: #69B7CF;
	padding: 2px 8px;
	margin: 0 4px;
	cursor: pointer;
}

#notification {
	text-align: center;
	position: absolute;
	bottom: 80px;
	background-color: #FFFFFF;
	padding: 4px 8px;
	border-radius: 18px;
	color: #69B7CF;
	left: 0;
	right: 0;
	margin-left: auto;
	margin-right: auto;
	width: 350px;
	z-index: 1;
}

.center {
	margin-left: auto;
	margin-right: auto;
	text-align: center;
}

#address_text {
	position: absolute;
	text-align: center;
	bottom: 134px;
	background-color: #FFFFFF;
	padding: 4px 8px;
	border-radius: 18px;
	left: 0;
	right: 0;
	margin-left: auto;
	margin-right: auto;
	width: 350px;
}

#address_text_main {
	display: inline-block;
	float: left;
}

#address_text_label {
	font-family: 'Abel';
  font-size: large;
	padding-top: 4px;
	color: #69B7CF;
}

#address_text_content {
	font-family: 'Roboto';
	min-height: 48px;
	width: 306px;
	text-align: left;
	padding: 6px 0 6px 6px;
}

#address_text_buttons {
	width: 100px;
}

#address_text_close {
	margin-left: auto;
	margin-right: auto;
}

#address_text_close svg {
	width: 30px;
}

#address_text_copy {
	padding-top: 6px;
	margin-left: auto;
	margin-right: auto;
}
#infowindow-content .title {
	font-weight: bold;
}

#infowindow-content {
	display: none;
}

#map #infowindow-content {
	display: inline;
}

.infowindow-content {
	color: #666666;
}

#infowindow-code {
	padding: 10px 0px;
}

#infowindow_code_left {
	padding-top: 4px;
}

#infowindow_code_right {
	padding-top: 10px;
	padding-bottom: 10px;
}

#infowindow_code_right_code {
	font-size: x-large;
	padding-left: 10px;
}

.gm-style-iw + div {display: none;}

.gm-style-iw {
	left: 0;
	margin-left: auto;
	margin-right: auto;
}

#show_address_button {
	width: 26px;
	padding-left: 20px;
	padding-right: 20px;
	vertical-align: bottom;
}

#copy_code_button {
	padding-left: 20px;
	width: 24px;
	vertical-align: bottom;
}

#copy_link_button {
	padding-left: 42px;
	padding-right: 20px;
  width: 38px;
	vertical-align: bottom;
}

#external_map_button {
	padding-left: 20px;
	width: 28px;
	vertical-align: bottom;
}
.message_dialog {
	top: 200px;
	margin-left: auto;
	margin-right: auto;
	left: 0;
	right: 0;
	max-width: 200px;
	position: absolute;
	font-family: 'Abel';
	width: 200px;
	background-color: #FFFFFF;
	z-index: 1;
	padding: 20px;
}

.message_dialog_close {
	position: absolute;
	top: 2px;
	right: 10px;
}

.message_dialog_label {
	color: #69B7CF;
	text-align: center;
}

.message_dialog_control {
	margin-left: auto;
	margin-right: auto;
	text-align: center;
}

.message_dialog_control button {
	min-width: 80px;
	font-size: larger;
	padding: 8px 14px;
	margin-bottom: 10px;
	margin-left: 14px;
	color: #69B7CF;
}
h2.message_dialog_label {
	margin: 0.5em;
}

#no_city_message {
	top: 200px;
	margin-left: auto;
	margin-right: auto;
	left: 0;
	right: 0;
	max-width: 360px;
	position: absolute;
	font-family: 'Abel';
	width: 360px;
	background-color: #FFFFFF;
	z-index: 1;
	padding: 20px;
}

#no_city_message p {
	font-size: larger;
}
#overlay {
	left: 0px;
	right: 0px;
	top: 0px;
	bottom: 0px;
	z-index: 2;
	color: rgba(100, 100, 100);
	background-color: rgba(100, 100, 100, 0.75);
	position: absolute;
	margin: auto;
	text-align: center;
}

#overlay_message {
	position: relative;
	font-family: Abel;
	margin: 0 auto;
	border: transparent solid 20px;
	padding: 2px 20px 8px;
	text-align: left;
	background-color: #FFFFFF;
	color: #999999;
	max-width: 400px;
}

#overlay_message h1 {
	text-align: center;
	color: #69B7CF;
}

#updated {
	font-size: smaller;
	text-align: right;
	padding-top: 20px;
}

#overlay_message_info {
	position: absolute;
	top: 2px;
	left: 10px;
}
	</style>
	<link rel='preload' as='image' href='resource/address.svg'>
	<link rel='preload' as='image' href='resource/copy.svg'>
	<link rel='preload' as='image' href='resource/link.svg'>
	<link rel='preload' as='image' href='resource/map.svg'>
</head>
<body>
	<script src='https://www.gstatic.com/firebasejs/4.6.0/firebase-app.js'></script>
	<script src='https://www.gstatic.com/firebasejs/4.6.0/firebase-database.js'></script>
<br />
<b>Warning</b>:  require(../../HTML/Component/console.js.php): failed to open stream: No such file or directory in <b>C:\Users\Ujjwal\Projects\WCode\Location\Project\Root\HTML\Template\Base.php</b> on line <b>39</b><br />
<br />
<b>Fatal error</b>:  require(): Failed opening required '../../HTML/Component/console.js.php' (include_path='.;C:\php\pear') in <b>C:\Users\Ujjwal\Projects\WCode\Location\Project\Root\HTML\Template\Base.php</b> on line <b>39</b><br />