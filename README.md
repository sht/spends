# Spends Tracker

A personal purchase and warranty tracking application with receipt/file management.

## Overview

Track your purchases, manage warranties, and analyze spending patterns. Upload receipts, manuals, and photos with automatic deduplication storage.

## Tech Stack

| Frontend         | Backend              | Storage                          |
| ---------------- | -------------------- | -------------------------------- |
| Vue 3 + Vite | FastAPI + SQLAlchemy | SQLite (dev) / PostgreSQL (prod) |
| Vue Router      | Pydantic             | Hash-sharded files               |
| CSS         | Uvicorn              | Reference counting               |

## Documentation

- [Documentation Hub](docs/) - Complete documentation collection
  - [API Documentation](docs/API.md) - Complete REST API reference
  - [System Architecture](docs/ARCHITECTURE.md) - Architecture overview and design
  - [Development Plan](docs/DEVELOPMENT.md) - Roadmap and development phases
  - [Security Policy](docs/SECURITY.md) - Security guidelines and vulnerability reporting
  - [Architecture Diagram](docs/diagrams/spends-components.html) - Interactive component architecture
- [Backend Documentation](backend/README.md) - Backend-specific implementation details

## Security

For security vulnerabilities, please report to **oss@mailite.com** or create a private GitHub security advisory.

## Development

Install Git, Node.js 22.12+ and Python 3.12, then from the repository root:

```sh
python3.12 scripts/dev.py setup
npm run dev
```

Open http://localhost:3030. This starts both the frontend and local API. Fictional sample data, uploads, and backups live in `.dev/`, isolated from your home-server data. Setup preserves existing dev data.

## Production

The multi-stage `backend/Dockerfile` builds the Vue frontend and packages it with FastAPI. Production serves the UI and `/api` from one address, with no Vite server. No sample data is included in the image.

Use root `compose.yaml` and `.env.production.example` with your existing persistent data directory. See [Development, testing, and release workflow](docs/ENVIRONMENTS.md) for complete setup, Docker Hub publishing, backups, and upgrade instructions.

See [Frontend documentation](docs/FRONTEND.md) for UI behavior and source details.

## Features

- **Purchase Tracking**: Product details, price, retailer, brand
- **File Management**: Upload receipts, manuals, photos with deduplication
- **Warranty Tracking**: Auto-expiry detection
- **Analytics**: Spending trends, retailer/brand distribution
- **Data Import/Export**: JSON and CSV support

## Project Structure

```
spends/
├── src/                 # Frontend source (Vue 3 + Vite)
│   ├── views/           # Vue page components
│   ├── api.js           # Same-origin API client
│   └── styles.css       # Responsive light/dark styles
├── backend/             # FastAPI backend
│   ├── app/             # Routes, models, schemas
│   └── migrations/      # Alembic migrations
├── dist-modern/         # Production build (auto-generated)
└── uploads/             # File storage (hash-sharded)
```

## Key Commands

```bash
# Frontend
npm run dev              # Local frontend + backend
npm run build            # Production build

# Backend
cd backend
alembic upgrade head     # Run database migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 3031

# Testing
npm run test:backend     # From repository root; isolated test database
```

## License

MIT
