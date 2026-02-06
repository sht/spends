# Spends Tracker

A personal purchase and warranty tracking application with receipt/file management.

## Overview

Track your purchases, manage warranties, and analyze spending patterns. Upload receipts, manuals, and photos with automatic deduplication storage.

## Tech Stack

| Frontend | Backend | Storage |
|----------|---------|---------|
| Vite + Alpine.js | FastAPI + SQLAlchemy | SQLite (dev) / PostgreSQL (prod) |
| Bootstrap 5 | Pydantic | Hash-sharded files |
| Chart.js | Uvicorn | Reference counting |

## Documentation

- [Backend Documentation](backend/README.md) - Detailed information about the backend API
- [Development Plan](DEVELOPMENT.md) - Roadmap and development phases for the backend

## Quick Start

### Prerequisites
- Node.js 16+
- Python 3.10+

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..
```

### Configure Ports (Optional)

Default ports are **3030** (frontend) and **3031** (backend). To customize, edit the `.env` files:

**`.env`** (frontend):
```env
VITE_PORT=3030
VITE_API_URL=http://localhost:3031
```

**`backend/.env`** (backend):
```env
PORT=3031
FRONTEND_URL=http://localhost:3030
```

### Run Development Environment

**Terminal 1 - Frontend:**
```bash
npm run dev -- --host 0.0.0.0
```

**Terminal 2 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 3031
```

| Service | Default URL |
|---------|-------------|
| Frontend | http://localhost:3030 |
| Backend API | http://localhost:3031/api |
| API Docs | http://localhost:3031/docs |

## Features

- **Purchase Tracking**: Product details, price, retailer, brand
- **File Management**: Upload receipts, manuals, photos with deduplication
- **Warranty Tracking**: Auto-expiry detection
- **Analytics**: Spending trends, retailer/brand distribution
- **Data Import/Export**: JSON and CSV support

## Project Structure

```
spends/
├── src-modern/          # Frontend source (Vite + Alpine.js)
│   ├── scripts/         # Alpine.js components
│   └── styles/scss/     # SCSS styles
├── backend/             # FastAPI backend
│   ├── app/             # Routes, models, schemas
│   └── migrations/      # Alembic migrations
├── dist-modern/         # Production build (auto-generated)
└── uploads/             # File storage (hash-sharded)
```

## Key Commands

```bash
# Frontend
npm run dev              # Development server
npm run build            # Production build

# Backend
cd backend
alembic upgrade head     # Run database migrations
uvicorn app.main:app --reload --host 0.0.0.0 --port 3031

# Testing
pytest                   # Run backend tests
```

## License

MIT
