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

# Execute the original command
exec "$@"