# Build the frontend from the same checkout as the API.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402 AS frontend
WORKDIR /frontend
COPY package.json package-lock.json ./
RUN npm ci
COPY vite.config.js index.html ./
COPY src ./src
COPY public-assets ./public-assets
RUN npm run build

FROM python:3.12-slim@sha256:f77ac9e44ae96ef2c90b8053ea08c31f8be030f824196b0ae4db6d462c84e51f AS production
WORKDIR /app
ENV DATABASE_URL=sqlite+aiosqlite:////app/data/spends_tracker.db \
    UPLOADS_DIR=/app/data/uploads \
    BACKUPS_DIR=/app/data/backups \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends curl cron \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --require-hashes -r requirements.txt
# Explicit copies: no local database, uploads, fixtures, seeders, or .env files.
COPY backend/app ./app
COPY backend/alembic ./alembic
COPY backend/alembic.ini ./
COPY backend/cron ./cron
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --from=frontend /frontend/dist-modern ./dist-modern
RUN useradd --create-home --shell /bin/bash app \
    && mkdir -p /app/data /etc/cron.d \
    && chown -R app:app /app \
    && chmod +x /usr/local/bin/docker-entrypoint.sh /app/cron/spends-backup \
    && echo '00 02 * * * root /app/cron/spends-backup >> /var/log/spends-backup.log 2>&1' > /etc/cron.d/spends-backup \
    && chmod 644 /etc/cron.d/spends-backup
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api || exit 1
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
