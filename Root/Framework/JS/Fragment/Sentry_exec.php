Sentry.init({ dsn: 'https://<?php echo $config['sentry_hash'] ?>@sentry.io/<?php echo $config['sentry_id'] ?>' });
