#!/bin/bash
set -euo pipefail

# All persistent state belongs to the mounted data directory.
mkdir -p /app/data/uploads /app/data/backups
chown app:app /app/data /app/data/uploads /app/data/backups
if ! runuser -u app -- test -w /app/data; then
    echo "Persistent data directory is not writable by app (UID 1000)." >&2
    exit 1
fi

# Fail closed: never serve against an unknown or partially migrated schema.
# Production startup migrates schema only; it never imports or seeds data.
cd /app
echo "Running database migrations..."
runuser -u app -- python -m alembic upgrade head

if [ -n "${TZ:-}" ] && [ -f /etc/cron.d/spends-backup ]; then
    sed -i '/^TZ=/d' /etc/cron.d/spends-backup
    sed -i "1i TZ=$TZ" /etc/cron.d/spends-backup
fi
if [ -f /etc/cron.d/spends-backup ]; then
    cron
fi
exec runuser -u app -- "$@"
