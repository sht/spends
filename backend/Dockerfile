FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    curl \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the backend application
COPY backend/ .

# Copy cron script
COPY backend/cron /app/cron

# Copy the built frontend
COPY dist-modern ./dist-modern

# Copy entrypoint script
COPY backend/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create a non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app

# Setup cron at build time (runs as root)
RUN mkdir -p /etc/cron.d /var/run /var/log \
    && echo "00 02 * * * root /app/cron/spends-backup >> /var/log/spends-backup.log 2>&1" > /etc/cron.d/spends-backup \
    && chmod 644 /etc/cron.d/spends-backup \
    && chmod +x /app/cron/spends-backup \
    && touch /var/run/crond.pid \
    && chmod 777 /var/run/crond.pid \
    && touch /var/log/backup-scheduler.log \
    && chmod 666 /var/log/backup-scheduler.log

USER app

ENTRYPOINT ["docker-entrypoint.sh"]

# Expose port
EXPOSE 8000

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
