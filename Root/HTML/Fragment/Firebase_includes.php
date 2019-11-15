<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-database.js"></script>
<?php
	if($bPublish) { ?>
<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-analytics.js"></script>
<script src="https://www.gstatic.com/firebasejs/<?php echo $config['firebase_version'] ?>/firebase-performance.js"></script>
<?php
	} ?>
