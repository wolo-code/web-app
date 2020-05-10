Sentry.init({ dsn: 'https://<?php echo $config['sentry_key'] ?>@<?php echo $config['sentry_ingest_sub_id'] ?>.ingest.sentry.io/<?php echo $config['sentry_id'] ?>' });
