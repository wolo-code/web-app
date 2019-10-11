Sentry.init({ dsn: 'https://<?php echo $config['sentry_key'] ?>@sentry.io/<?php echo $config['sentry_id'] ?>' });
