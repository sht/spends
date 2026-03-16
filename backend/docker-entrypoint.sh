#!/bin/bash

# Create necessary directories
mkdir -p /app/data/uploads
mkdir -p /app/data/backups

# Set correct permissions
chown -R app:app /app/data

# Initialize database if it doesn't exist
if [ ! -f "/app/data/spends_tracker.db" ]; then
    echo "Initializing database..."
    cd /app
    alembic upgrade head
fi

# Setup cron for daily backups
if [ -f /app/cron/spends-backup ]; then
    chmod +x /app/cron/spends-backup
    # Create cron file (runs daily at 2 AM)
    echo "0 2 * * * root /app/cron/spends-backup >> /var/log/spends-backup.log 2>&1" > /etc/cron.d/spends-backup
    chmod 644 /etc/cron.d/spends-backup
    # Start cron daemon
    crond
    echo "Cron configured for daily backups at 2 AM"
fi

# Execute the original command
exec "$@"