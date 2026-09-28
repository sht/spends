# Development and production

The laptop runs a local Vue/Vite frontend and a local FastAPI backend with fictional data. Production runs one image containing the compiled frontend and API; its database, uploads, and backups live outside the image in a persistent host directory.

## Clone and run development

Prerequisites: Git, Node.js 22.12+ (Node 22 recommended), npm, and Python 3.12 with venv/pip. Docker is only needed to build/test releases. On Windows, use WSL2 for these commands.

From a fresh clone, run:

```sh
python3.12 scripts/dev.py setup
npm run dev
```

Setup creates `.venv/`, installs the locked frontend and hash-locked backend dependencies, migrates a new SQLite database, and seeds it if it is empty. The frontend is at http://localhost:3030 and API docs at http://localhost:3031/docs. Stop both with Ctrl+C.

Local state is always under `.dev/`:

- `spends_tracker.db`: development database
- `uploads/`: development receipts and other files
- `backups/`: development backups

The launcher overrides inherited database, upload, backup and proxy settings with local paths/addresses. It never connects to your home server. Existing `backend/spends_tracker.db` and `backend/uploads/` are not used. `.dev/` and `.venv/` are ignored by Git and excluded from Docker builds.

Fictional fixtures live in `dev/purchases.json` and `dev/seed.py`; commit these with the code. They cover expiring/expired/lifetime warranties, a return deadline, several currencies, all item lifecycle states, a component, and downloadable text receipts. Dates are relative to the day you seed. Running setup or `npm run dev:seed` again leaves a nonempty database untouched. Startup never seeds automatically.

For a fresh set of samples, stop dev, move `.dev/` to a backup folder outside the checkout, and rerun setup. For testing empty states, use Settings → reset-all against the local dev app; restore your saved `.dev/` or create a fresh one with setup when finished. The seeder refuses any nonempty database, including one with leftover related rows.

Optional separate terminals:

```sh
npm run dev:backend
npm run dev:frontend
```

The standalone frontend reads `.env`/`.env.local`; use `.env.example` for the local target. Prefer `npm run dev` for guaranteed local-only API routing.

## Test and release

```sh
npm run test:backend
npm run build
```

Exercise add/edit/delete purchases, warranties, component editing, file upload/download, search/filtering, and import/export in development. These tests use local data. The production Docker build rebuilds the frontend from source; it never copies your existing `dist-modern/` or development state.

Python runtime dependencies are listed in `backend/requirements.in`; test dependencies are in `backend/requirements-dev.in`. To deliberately update the locks using Python 3.12, install `pip-tools==7.6.1` in `.venv`, run `pip-compile --generate-hashes --allow-unsafe --output-file backend/requirements.txt backend/requirements.in`, then compile `backend/requirements-dev.in` to `backend/requirements-dev.txt` with the same options. Commit both output files. Node 22 is selected by `.nvmrc`; Python 3.12 is selected by `.python-version` and the Docker build uses those same major versions. Base image digests are pinned in `backend/Dockerfile`; update them deliberately when upgrading the runtimes.

GitHub Actions runs local setup, backend tests, frontend build, and the production container persistence test on pull requests and commits to `master`. A pushed `v*` tag publishes a tested multi-platform image to Docker Hub. Set repository variable `DOCKERHUB_USERNAME` and secret `DOCKERHUB_TOKEN` (a Docker Hub access token) before the first release. After review, push a new immutable tag such as `v2026.09.28-1`. The publish job pushes `YOUR_USER/spends-tracker:v2026.09.28-1`; it does not deploy to the home server.

For a manual release, replace `YOUR_USER` and `YOUR_TAG` below:

```sh
git push
docker build -f backend/Dockerfile -t YOUR_USER/spends-tracker:YOUR_TAG .
docker login
docker push YOUR_USER/spends-tracker:YOUR_TAG
```

For a Mac ARM laptop and an AMD64 home server, publish a multi-platform image instead of the single-platform build/push above:

```sh
docker buildx build --platform linux/amd64,linux/arm64 \
  -f backend/Dockerfile -t YOUR_USER/spends-tracker:YOUR_TAG --push .
```

Use a builder supporting those platforms (`docker buildx inspect --bootstrap`). Do not reuse release tags; a versioned tag lets you identify which code is deployed.

## Home-server production

For the existing installation, keep the exact host directory currently mounted at `/app/data`. It contains `spends_tracker.db`, `uploads/`, and `backups/`. Do not substitute a new empty directory: that would look like an empty installation even though the old data still exists elsewhere.

Use root `compose.yaml` for production deployments. Copy `.env.production.example` to `.env.production`, set your versioned `SPENDS_IMAGE`, and set `SPENDS_DATA_DIR` to the absolute existing data path. The directory must already exist. For a brand-new installation, create an empty persistent directory intentionally.

Before updating, stop the existing app and take a filesystem backup/snapshot of the entire data directory, including the SQLite database and uploads. This preserves all tables (including components) and gives a rollback point before schema migrations. Keep the backup outside the mounted directory. When moving from a differently named Compose project/container, stop that old container before starting this one so they do not share the port or write concurrently.

```sh
docker compose --env-file .env.production pull
docker compose --env-file .env.production up -d
docker compose --env-file .env.production ps
docker compose --env-file .env.production logs --tail=100 app
```

For later upgrades, change only `SPENDS_IMAGE` to the new version, take the backup, pull, and recreate. Keep the volume path unchanged. The new frontend calls `/api` on the same server automatically.

At startup the container may set ownership on the mounted data directory and its `uploads/` and `backups/` directories so the app can write there; it does not recursively change ownership of existing files. Existing database and upload files must be readable and writable by the container app user (UID 1000).

The image contains no sample fixtures, seed script, SQLite database, local environment file, or uploaded files. Startup applies Alembic schema migrations and then starts the app. A fresh database is empty; an existing database is migrated in place. Migration failure stops startup, rather than serving a potentially incompatible schema. Container replacement does not import, reset, or seed anything.

An old database with tables but no matching Alembic revision may fail startup. Inspect and reconcile its migration history against a backup; do not blindly stamp a revision. For rollback after a schema change, restore the pre-update data snapshot with the previous image—an older image alone may not understand the new schema.

The backend has no authentication. Keep production on your trusted home network or behind your existing authenticated access layer.
