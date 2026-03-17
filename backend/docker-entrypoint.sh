#!/bin/bash

# Inject runtime TZ into crontab so cron respects the container timezone
if [ -n "$TZ" ] && [ -f /etc/cron.d/spends-backup ]; then
    sed -i '/^TZ=/d' /etc/cron.d/spends-backup
    sed -i "1i TZ=$TZ" /etc/cron.d/spends-backup
fi

# Start the real cron daemon in background
if [ -f /etc/cron.d/spends-backup ]; then
    cron
    echo "Cron daemon started"
fi

# Drop to app user and exec the main command
exec runuser -u app -- "$@"
