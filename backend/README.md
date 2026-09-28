# Spends Tracker backend

FastAPI + SQLAlchemy + SQLite. The API is available under `/api`; the compiled Vue frontend is served at `/` in production.

For local development, start from the repository root:

```sh
python3.12 scripts/dev.py setup
npm run dev
```

This starts the backend on `127.0.0.1:3031` using `.dev/spends_tracker.db`, `.dev/uploads/`, and `.dev/backups/`. The frontend runs on `127.0.0.1:3030` and proxies `/api` locally. Test with `npm run test:backend`.

Production uses the repository-root `compose.yaml` and the multi-stage `backend/Dockerfile`, which builds both frontend and backend. Configure a persistent data directory with `.env.production`; its `spends_tracker.db`, `uploads/`, and `backups/` survive image replacement. The image has no sample data and does not seed on startup. See [environment and release instructions](../docs/ENVIRONMENTS.md).
