#!/bin/bash

# Wrapper script to run both scheduler and app

# Function to run backup
run_backup() {
    echo "Running backup at $(date)"
    /app/cron/spends-backup
    echo "Backup done at $(date)"
}

# Start backup scheduler in background if cron file exists
if [ -f /etc/cron.d/spends-backup ]; then
    BACKUP_MIN=$(awk '{print $1}' /etc/cron.d/spends-backup)
    BACKUP_HOUR=$(awk '{print $2}' /etc/cron.d/spends-backup)
    echo "Starting backup scheduler for ${BACKUP_HOUR}:${BACKUP_MIN}"
    
    nohup bash -c '
        LAST_RUN=""
        while true; do
            MIN=$(date +\%M)
            HOUR=$(date +\%H)
            
            if [ "$HOUR" = "'"$BACKUP_HOUR"'" ] && [ "$MIN" = "'"$BACKUP_MIN"'" ]; then
                if [ "$LAST_RUN" != "$MIN" ]; then
                    echo "Running scheduled backup at $HOUR:$MIN"
                    /app/cron/spends-backup
                    LAST_RUN="$MIN"
                fi
            fi
            sleep 15
        done
    ' > /var/log/backup-scheduler.log 2>&1 &
    echo "Backup scheduler started with PID: $!"
fi

exec "$@"
