# Architecture - Spends Tracker

**Last Updated:** February 7, 2026
**Architecture:** Static Frontend + REST API Backend (Decoupled)

---

## Overview

Spends Tracker uses a **modern decoupled architecture** with a static frontend and REST API backend. This design provides:

- ✅ **Independent deployment** - Frontend and backend can be deployed separately
- ✅ **Scalability** - Each layer can scale independently
- ✅ **Developer experience** - Frontend and backend teams can work independently
- ✅ **Cost efficiency** - Frontend can be hosted for free on CDN
- ✅ **Performance** - Static files served from edge locations

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│                      (Web Browser)                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS
                     │
        ┌────────────┴─────────────┐
        │                          │
        │   Static HTML/CSS/JS     │   API Requests (/api/*)
        │   (from CDN/Netlify)     │   (JSON)
        │                          │
        ▼                          ▼
┌──────────────────┐       ┌────────────────────┐
│    FRONTEND      │       │     BACKEND        │
│                  │       │                    │
│  Static Files    │       │   FastAPI Server   │
│  - HTML Pages    │       │   - REST API       │
│  - CSS (SCSS)    │       │   - Business Logic │
│  - JavaScript    │       │   - Database       │
│  - Alpine.js     │       │                    │
│  - Chart.js      │       │   Port: 8000       │
│                  │       │                    │
│  Port: 3000 (dev)│       └─────────┬──────────┘
│  CDN (prod)      │                 │
└──────────────────┘                 │
                                     ▼
                            ┌────────────────┐
                            │   DATABASE     │
                            │                │
                            │   SQLite (dev) │
                            │   PostgreSQL   │
                            │   (production) │
                            └────────────────┘
```

---

## Directory Structure

```
spends-tracker/
├── src-modern/                   # Frontend source code
│   ├── index.html                # Dashboard page
│   ├── inventory.html            # Inventory page
│   ├── settings.html             # Settings page
│   ├── manifest.json             # PWA manifest
│   ├── scripts/
│   │   ├── main.js               # Entry point
│   │   ├── components/           # Page components
│   │   │   ├── dashboard.js
│   │   │   ├── inventory.js
│   │   │   ├── settings.js
│   │   │   └── sidebar.js
│   │   └── utils/                # Utilities
│   │       ├── theme-manager.js
│   │       ├── notifications.js
│   │       └── icon-manager.js
│   └── styles/scss/              # SCSS styles (24 files)
│       ├── main.scss
│       ├── abstracts/            # Variables, mixins
│       ├── components/           # Component styles
│       ├── layout/               # Layout styles
│       ├── pages/                # Page-specific styles
│       └── themes/               # Dark/light themes
│
├── dist-modern/                  # Frontend build output
│   ├── index.html                # Built HTML
│   ├── inventory.html
│   ├── settings.html
│   └── assets/                   # Bundled JS/CSS with hashes
│       ├── main-[hash].js
│       ├── main-[hash].css
│       └── vendor-[hash].js
│
├── backend/                      # Backend API
│   ├── app/
│   │   ├── main.py               # FastAPI app (serves API + static files)
│   │   ├── config.py             # Configuration
│   │   ├── database.py           # Database connection
│   │   ├── models/               # SQLAlchemy models
│   │   │   ├── purchase.py
│   │   │   ├── warranty.py
│   │   │   ├── retailer.py
│   │   │   ├── brand.py
│   │   │   └── setting.py        # User settings (DB-persisted)
│   │   ├── schemas/              # Pydantic schemas
│   │   │   ├── purchase.py
│   │   │   ├── warranty.py
│   │   │   ├── analytics.py
│   │   │   └── common.py
│   │   ├── routes/               # API endpoints
│   │   │   ├── purchases.py      # /api/purchases
│   │   │   ├── warranties.py     # /api/warranties
│   │   │   ├── retailers.py      # /api/retailers
│   │   │   ├── brands.py         # /api/brands
│   │   │   ├── analytics.py      # /api/analytics
│   │   │   ├── exports.py        # /api/export
│   │   │   ├── imports.py        # /api/import
│   │   │   └── settings.py       # /api/settings
│   │   ├── services/             # Business logic
│   │   │   ├── purchase_service.py
│   │   │   ├── warranty_service.py
│   │   │   ├── analytics_service.py
│   │   │   ├── retailer_service.py
│   │   │   └── brand_service.py
│   │   └── utils/                # Utilities
│   │       └── import_export.py
│   ├── tests/                    # Test suite
│   │   ├── conftest.py
│   │   ├── test_purchases.py
│   │   └── test_analytics.py
│   ├── migrations/               # Alembic migrations
│   ├── scripts/
│   │   └── seed_data.py          # Sample data
│   ├── requirements.txt          # Python dependencies
│   ├── alembic.ini               # Migration config
│   ├── pytest.ini                # Test config
│   ├── Dockerfile                # Container image
│   └── docker-compose.yml        # Local PostgreSQL
│
├── public-assets/                # Static assets (not built)
│   └── assets/
│       ├── images/               # Images, logos
│       └── icons/                # Favicons, PWA icons
│
├── package.json                  # Frontend dependencies
├── vite.config.js                # Vite configuration
├── README.md                     # Project overview
├── DEVELOPMENT.md                # Development plan
└── ARCHITECTURE.md               # This file
```

---

## Component Interaction

### 1. Development Mode

```
Developer runs TWO servers:

Terminal 1:
$ npm run dev
→ Vite dev server on http://localhost:3000
→ Hot Module Reload (HMR) enabled
→ Proxies /api/* requests to backend

Terminal 2:
$ cd backend && python run_server.py
→ FastAPI server on http://localhost:8000
→ Serves API endpoints only
→ Returns JSON responses
```

**Request Flow:**
```
Browser → http://localhost:3000/
        → Vite serves src-modern/index.html (with HMR)

Browser → http://localhost:3000/api/purchases
        → Vite proxies to http://localhost:8000/api/purchases
        → FastAPI returns JSON
        → Alpine.js renders data
```

---

### 2. Production Mode

```
$ npm run build
→ Builds frontend to dist-modern/

$ cd backend && python run_server.py
→ FastAPI serves:
  - Static files from dist-modern/ at /
  - API endpoints at /api/*
```

**Request Flow:**
```
Browser → http://localhost:8000/
        → FastAPI serves dist-modern/index.html (static file)

Browser → http://localhost:8000/api/purchases
        → FastAPI returns JSON
        → Alpine.js renders data
```

---

### 3. Separate Deployment (Recommended)

**Frontend on CDN:**
```
$ npm run build
$ deploy dist-modern/ to Netlify/Vercel/S3

→ https://spends-tracker.netlify.app/
```

**Backend on Server:**
```
$ deploy backend/ to Railway/Render/Heroku

→ https://api.spends-tracker.com/
```

**Frontend Config:**
```javascript
// In production build:
const API_URL = 'https://api.spends-tracker.com';
```

**Request Flow:**
```
Browser → https://spends-tracker.netlify.app/
        → CDN serves static HTML/CSS/JS

Browser → https://api.spends-tracker.com/api/purchases
        → Backend returns JSON
        → Alpine.js renders data
```

---

## Technology Stack

### Frontend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Build Tool** | Vite 7.3 | Fast dev server, optimized builds |
| **UI Framework** | Bootstrap 5.3 | Responsive components, grid system |
| **State Management** | Alpine.js 3.15 | Lightweight reactive data binding |
| **Charts** | Chart.js 4.5 | Interactive data visualization |
| **Icons** | Bootstrap Icons 1.13 | SVG icon library |
| **Dates** | Day.js 1.11 | Date formatting and manipulation |
| **Modals** | SweetAlert2 11.26 | Beautiful alert/confirm dialogs |
| **Styling** | SCSS (Sass 1.97) | CSS preprocessor |
| **CSS Processing** | PostCSS + Autoprefixer | Cross-browser compatibility |

### Backend

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Framework** | FastAPI 0.104 | High-performance async API |
| **Server** | Uvicorn 0.24 | ASGI server |
| **ORM** | SQLAlchemy 2.0 | Database abstraction |
| **Validation** | Pydantic 2.5 | Request/response validation |
| **Database** | SQLite (dev), PostgreSQL (prod) | Data persistence |
| **Migrations** | Alembic 1.13 | Database schema versioning |
| **Testing** | pytest 7.4 | Test framework |
| **Async Driver** | aiosqlite, asyncpg | Async database drivers |

---

## API Design

### Endpoint Structure

All API endpoints are under `/api/` prefix:

```
/api/purchases              # Purchase CRUD
/api/warranties             # Warranty CRUD
/api/retailers              # Retailer management
/api/brands                 # Brand management
/api/analytics/*            # Analytics endpoints
/api/export/*               # Data export
/api/import/*               # Data import
```

### Response Format

**Success Response:**
```json
{
  "id": "uuid",
  "product_name": "iPhone 15 Pro",
  "price": 999.99,
  "status": "RECEIVED",
  "purchase_date": "2026-01-15",
  "created_at": "2026-01-15T10:30:00Z"
}
```

**Error Response:**
```json
{
  "detail": "Purchase not found"
}
```

**Paginated Response:**
```json
{
  "items": [...],
  "total": 50,
  "skip": 0,
  "limit": 20
}
```

### Settings API

The Settings API uses a **hybrid storage approach** - database-persisted settings for cross-device consistency, and localStorage for device-specific preferences.

**Endpoints:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settings/` | Get all settings with defaults |
| PUT | `/api/settings/` | Update settings (partial updates supported) |
| GET | `/api/settings/{key}` | Get a specific setting by key |
| POST | `/api/settings/reset` | Reset all settings to defaults |

**Settings Storage Strategy:**

| Setting | Storage | Reason |
|---------|---------|--------|
| `currency_code` | Database + localStorage | Cross-device consistency |
| `date_format` | Database + localStorage | Cross-device consistency |
|   - `short` |   | "Jan 30, 2026" format |
|   - `MM/DD/YYYY` |   | 01/30/2026 format |
|   - `DD/MM/YYYY` |   | 30/01/2026 format |
|   - `YYYY-MM-DD` |   | 2026-01-30 format |
|   - `DD.MM.YYYY` |   | 30.01.2026 format |
| `language` | localStorage only | Device preference |
| `cardVisibility` | localStorage only | Device preference |
| `notifications` | localStorage only | Device preference |
| `theme` | localStorage only | Device preference |

**Data Flow:**

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Settings   │────▶│  Backend API │────▶│   Database   │
│    Page      │     │  /api/settings│     │   (SQLite)   │
└──────────────┘     └──────────────┘     └──────────────┘
       │                                           ▲
       │ localStorage (sync)                       │
       ▼                                           │
┌──────────────┐     ┌──────────────┐            │
│ localStorage │◀────│  Other Pages │────────────┘
│  (cache)     │     │(read-only)   │
└──────────────┘     └──────────────┘
```

**Request/Response Examples:**

```bash
# Get settings
GET /api/settings/
Response:
{
  "currency_code": "USD",
  "date_format": "MM/DD/YYYY"
}

# Update settings
PUT /api/settings/
Body: {"currency_code": "EUR", "date_format": "DD/MM/YYYY"}
Response:
{
  "currency_code": "EUR",
  "date_format": "DD/MM/YYYY",
  "timezone": "America/New_York"
}

# Reset to defaults
POST /api/settings/reset
Response:
{
  "currency_code": "USD",
  "date_format": "MM/DD/YYYY"
}
```

**Date Format Usage:**

All date displays respect the user's preferred format:
- **Inventory table** - Uses user preference
- **Dashboard** - Uses user preference
- **Date inputs** - Show format hint below field (e.g., "Format: 30.01.2026")
- **API** - Always uses ISO `YYYY-MM-DD` for data exchange

### Authentication

**Current:** None (admin dashboard for personal use)

**Future:** Can add JWT tokens or OAuth2

---

## Data Flow

### Creating a Purchase

```
1. User fills form in inventory.html
   ↓
2. Alpine.js captures form data
   ↓
3. JavaScript sends POST to /api/purchases
   ↓
4. FastAPI validates with Pydantic schema
   ↓
5. PurchaseService creates record
   ↓
6. SQLAlchemy inserts into database
   ↓
7. FastAPI returns JSON response
   ↓
8. Alpine.js updates UI
   ↓
9. Toast notification shows success
```

### Loading Dashboard

```
1. Browser loads index.html
   ↓
2. Alpine.js initializes
   ↓
3. DashboardManager calls multiple APIs in parallel:
   - GET /api/analytics/summary
   - GET /api/analytics/spending
   - GET /api/analytics/warranties/timeline
   - GET /api/analytics/retailers
   - GET /api/analytics/brands
   - GET /api/analytics/top-products
   - GET /api/analytics/recent-purchases
   ↓
4. Chart.js renders visualizations
   ↓
5. Alpine.js binds data to UI
```

---

## Deployment Options

### Option 1: Monolithic (Simplest)

**Single server runs both frontend and backend**

```bash
# Build frontend
npm run build

# Deploy backend (serves both API and static files)
cd backend
docker build -t spends-tracker .
docker run -p 80:8000 spends-tracker
```

**Pros:**
- Simple deployment
- One domain
- No CORS issues

**Cons:**
- Can't scale independently
- Backend must serve static files
- Single point of failure

---

### Option 2: Separated (Recommended)

**Frontend on CDN, Backend on server**

```bash
# Deploy frontend to Netlify
npm run build
netlify deploy --prod --dir=dist-modern

# Deploy backend to Railway
cd backend
railway up
```

**Pros:**
- ✅ Frontend on CDN (fast, free)
- ✅ Backend scales independently
- ✅ Lower costs
- ✅ Better performance

**Cons:**
- Need to configure CORS
- Two separate deployments

---

### Option 3: Docker Compose (Development)

```bash
docker-compose up
```

Runs:
- PostgreSQL on port 5432
- Backend on port 8000
- Frontend served by backend

---

## Security Considerations

### Current State (No Authentication)

This is an **admin dashboard for personal use**, so authentication is not implemented. Deploy behind:
- VPN
- IP whitelist
- Reverse proxy with basic auth

### Future Authentication

To add authentication:

1. Add JWT token generation:
```python
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer

security = HTTPBearer()

@app.post("/api/login")
async def login(credentials: LoginSchema):
    # Verify credentials
    token = create_jwt_token(user_id)
    return {"access_token": token}
```

2. Protect routes:
```python
@app.get("/api/purchases", dependencies=[Depends(verify_token)])
async def get_purchases():
    ...
```

3. Frontend stores token:
```javascript
localStorage.setItem('token', response.access_token);

// Add to all requests
headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
}
```

---

## Performance Optimizations

### Frontend

1. **Code Splitting** - Vite automatically splits vendor code
2. **Asset Hashing** - Cache busting with content hashes
3. **Lazy Loading** - Charts load on demand
4. **CSS Minification** - SCSS compiled and minified
5. **Image Optimization** - WebP with PNG fallback
6. **Font Optimization** - Google Fonts with display=swap

### Backend

1. **Async/Await** - Non-blocking I/O with async SQLAlchemy
2. **Connection Pooling** - Database connection reuse
3. **Query Optimization** - Eager loading of relationships
4. **Pagination** - Limit results to 20 per page
5. **Caching** - (Future) Redis for analytics queries

---

## Testing Strategy

### Frontend Testing

**Current:** Manual testing
**Future:**
- Unit tests with Vitest
- E2E tests with Playwright

### Backend Testing

**Current:**
- Unit tests with pytest
- Integration tests for API endpoints

```bash
cd backend
pytest
```

**Coverage:**
- test_purchases.py - CRUD operations
- test_analytics.py - Analytics calculations
- **TODO:** test_warranties.py, test_imports.py

---

## Development Workflow

### Adding a New Feature

1. **Frontend Changes**
```bash
# Edit src-modern/scripts/components/
npm run dev  # See changes instantly with HMR
```

2. **Backend Changes**
```bash
cd backend
# Edit app/routes/ or app/services/
# Server auto-reloads with --reload flag
```

3. **Database Changes**
```bash
cd backend
# Edit app/models/
alembic revision --autogenerate -m "Add field"
alembic upgrade head
```

4. **Testing**
```bash
# Backend tests
cd backend && pytest

# Frontend tests (future)
npm run test
```

5. **Build & Deploy**
```bash
npm run build
cd backend && docker build -t spends-tracker .
```

---

## Future Enhancements

### Short Term
- [ ] Add missing test files (test_warranties.py, test_imports.py)
- [ ] Add frontend unit tests
- [ ] Implement build-time HTML templating (avoid duplication)
- [ ] Add API response caching

### Medium Term
- [ ] Add authentication (JWT)
- [ ] Add user management
- [ ] Add data backup/restore
- [ ] Add export to PDF
- [ ] Add email notifications for expiring warranties

### Long Term
- [ ] Mobile app (React Native or Flutter)
- [ ] Real-time updates (WebSockets)
- [ ] Multi-user support
- [ ] Receipt image upload and OCR
- [ ] Integration with retailers (Amazon API)

---

## Troubleshooting

### Frontend doesn't load

**Check:**
1. Is `dist-modern/` built? Run `npm run build`
2. Is backend running? Check http://localhost:8000/api
3. Check browser console for errors

### API calls fail

**Check:**
1. Backend running on correct port (8000)
2. CORS configuration in backend/app/main.py
3. Network tab in browser DevTools

### Database errors

**Check:**
1. Database file exists: `backend/spends_tracker.db`
2. Run migrations: `cd backend && alembic upgrade head`
3. Check database logs

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

**Architecture Version:** 2.1
**Last Updated:** February 7, 2026
**Status:** ✅ Production Ready
