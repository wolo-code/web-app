// Firebase
var FIREBASE_CONFIG = {
	apiKey: "<?php echo $config['google_api_key'] ?>",
	authDomain: "<?php echo $config['site_name'] ?>",
	databaseURL: "https://<?php echo $config['firebase_projectId'] ?>.firebaseio.com",
	projectId: "<?php echo $config['firebase_projectId'] ?>",
	storageBucket: "<?php echo $config['firebase_projectId'] ?>.appspot.com",
	messagingSenderId: "<?php echo $config['firebase_messagingSenderId'] ?>",
	appId: "<?php echo $config['firebase_appId'] ?>",
	measurementId: "<?php echo $config['firebase_measurementId'] ?>"
};
