#!/bin/bash
set -e

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

# Run Alembic migrations
echo "Running database migrations..."
cd /app
if ! python -m alembic upgrade head; then
    echo "WARNING: Database migration failed, but continuing startup" >&2
fi

# Drop to app user and exec the main command
exec runuser -u app -- "$@"
