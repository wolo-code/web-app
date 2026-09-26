Sentry.init({
	dsn: 'https://<?php echo $config['sentry_key'] ?>@<?php echo $config['sentry_ingest_sub_id'] ?>.ingest.sentry.io/<?php echo $config['sentry_id'] ?>',
	ignoreErrors: [
		'Network Error',
		'NetworkError',
		'Failed to fetch',
		'Load failed',
		'auth/network-request-failed',
		'Unexpected token \'<\'',
		'Unexpected token <',
		'Unexpected token =',
		/Unexpected token ['<]/,
		/this\.i\.at is not a function/,
		/t\.entries\.at is not a function/,
		/Failed to (?:update|register) a ServiceWorker/,
		/Service Worker system has shutdown/
	],
	denyUrls: [
		/beacon\.min\.js/,
		/cdn-cgi\/rum/,
		/extensions\//i,
		/^chrome:\/\//i
	]
});
