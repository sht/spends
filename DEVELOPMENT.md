# Development Plan - Spends Tracker Backend

## Overview

This document outlines the development roadmap for the Spends Tracker backend. The frontend (React-like dashboard with Alpine.js) is production-ready and requires a backend API to replace mock data with real database storage.

## Technology Stack

- **Language:** Python 3.10+
- **Framework:** FastAPI
- **Database:** SQLite (initial development) → PostgreSQL (production)
- **ORM:** SQLAlchemy 2.0+
- **Async Driver:** aiosqlite (SQLite) → asyncpg (PostgreSQL)
- **Validation:** Pydantic v2
- **Migrations:** Alembic
- **Testing:** pytest
- **Environment:** python-dotenv
- **Server:** Uvicorn

## Project Structure

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                          # FastAPI app initialization
│   ├── config.py                        # Configuration & environment
│   ├── database.py                      # Database connection & session
│   ├── models/                          # SQLAlchemy models
│   │   ├── __init__.py
│   │   ├── purchase.py                  # Purchase model
│   │   ├── warranty.py                  # Warranty model
│   │   ├── retailer.py                  # Retailer model
│   │   └── brand.py                     # Brand model
│   ├── schemas/                         # Pydantic schemas (API contracts)
│   │   ├── __init__.py
│   │   ├── purchase.py                  # Purchase request/response schemas
│   │   ├── warranty.py                  # Warranty schemas
│   │   ├── analytics.py                 # Analytics schemas
│   │   └── common.py                    # Common schemas
│   ├── routes/                          # API endpoints
│   │   ├── __init__.py
│   │   ├── purchases.py                 # /api/purchases
│   │   ├── warranties.py                # /api/warranties
│   │   ├── retailers.py                 # /api/retailers
│   │   ├── brands.py                    # /api/brands
│   │   └── analytics.py                 # /api/analytics
│   ├── services/                        # Business logic
│   │   ├── __init__.py
│   │   ├── purchase_service.py          # Purchase operations
│   │   ├── warranty_service.py          # Warranty operations
│   │   └── analytics_service.py         # Analytics & reporting
│   ├── middleware/                      # Custom middleware
│   │   ├── __init__.py
│   │   └── cors.py                      # CORS configuration
│   └── utils/                           # Utilities
│       ├── __init__.py
│       └── decorators.py                # Custom decorators
├── migrations/                          # Alembic database migrations
├── tests/
│   ├── __init__.py
│   ├── test_purchases.py
│   ├── test_analytics.py
│   └── conftest.py                      # Pytest fixtures
├── scripts/
│   └── seed_data.py                     # Populate test data
├── requirements.txt                     # Python dependencies
├── .env.example                         # Environment template
├── .dockerignore
├── Dockerfile                           # Container image
├── docker-compose.yml                   # Local dev environment
├── pytest.ini                           # Test configuration
└── README.md                            # Backend-specific docs
```

## Development Phases

### Phase 1: Project Setup ⚙️
**Objective:** Initialize backend project with all dependencies and infrastructure

**Tasks:**
- [ ] Create Python virtual environment
- [ ] Initialize requirements.txt with dependencies
- [ ] Create .env.example file
- [ ] Set up FastAPI app with CORS middleware
- [ ] Configure SQLite connection (aiosqlite) for local development
- [ ] Create docker-compose.yml for local PostgreSQL (for later migration)
- [ ] Set up project structure and __init__.py files
- [ ] Configure development server (Uvicorn)

**Deliverables:**
- Running FastAPI server on http://localhost:8000
- SQLite database accessible via SQLAlchemy
- Auto-generated API docs at http://localhost:8000/docs

---

### Phase 2: Database Models 🗄️
**Objective:** Define all database schemas and relationships

**Models to create:**

1. **Purchase**
   - id (UUID, primary key)
   - product_name (string, required)
   - price (Decimal, required) ⚠️ Use Decimal for money
   - currency_code (string, default: USD)
   - retailer_id (FK to Retailer)
   - brand_id (FK to Brand)
   - status (enum: ORDERED, RECEIVED)
   - purchase_date (datetime, required)
   - notes (text, optional)
   - created_at (datetime, auto)
   - updated_at (datetime, auto)

2. **Warranty**
   - id (UUID, primary key)
   - purchase_id (FK to Purchase, unique)
   - warranty_start (datetime, required)
   - warranty_end (datetime, required)
   - warranty_type (string: LIMITED, EXTENDED, LIFETIME, etc.)
   - status (enum: ACTIVE, EXPIRED, VOIDED)
   - provider (string, optional)
   - notes (text, optional)
   - created_at (datetime, auto)
   - updated_at (datetime, auto)

3. **Retailer**
   - id (UUID, primary key)
   - name (string, unique, required)
   - url (string, optional)
   - created_at (datetime, auto)

4. **Brand**
   - id (UUID, primary key)
   - name (string, unique, required)
   - url (string, optional)
   - created_at (datetime, auto)

**Tasks:**
- [ ] Create SQLAlchemy models with proper relationships
- [ ] Add database constraints (unique, not null, check)
- [ ] Set up Alembic for migrations
- [ ] Create initial migration
- [ ] Seed default retailers and brands

**Deliverables:**
- SQLite tables with proper schema (migratable to PostgreSQL)
- Alembic migration system ready
- Initial data (retailers, brands) loaded

---

### Phase 3: API Endpoints - CRUD 📝
**Objective:** Build REST endpoints for managing purchases, warranties, retailers, brands

#### Purchase Endpoints
- [ ] `GET /api/purchases` - List all purchases (paginated, filterable)
  - Query params: `skip`, `limit`, `status`, `retailer_id`, `search`
  - Response: List of purchases with total count
- [ ] `GET /api/purchases/{id}` - Get single purchase with warranty
- [ ] `POST /api/purchases` - Create new purchase
  - Auto-create warranty record if warranty dates provided
- [ ] `PUT /api/purchases/{id}` - Update purchase
- [ ] `DELETE /api/purchases/{id}` - Delete purchase (cascade delete warranty)

#### Warranty Endpoints
- [ ] `GET /api/warranties` - List all warranties (paginated, filterable)
  - Query params: `skip`, `limit`, `status`, `expiring_soon`
- [ ] `GET /api/warranties/{id}` - Get warranty details
- [ ] `PUT /api/warranties/{id}` - Update warranty
- [ ] `GET /api/warranties/expiring` - Get warranties expiring in X days (default 30)

#### Retailer Endpoints
- [ ] `GET /api/retailers` - List all retailers
- [ ] `POST /api/retailers` - Create new retailer
- [ ] `DELETE /api/retailers/{id}` - Delete retailer

#### Brand Endpoints
- [ ] `GET /api/brands` - List all brands
- [ ] `POST /api/brands` - Create new brand
- [ ] `DELETE /api/brands/{id}` - Delete brand

**Pydantic Schemas Needed:**
- PurchaseCreate, PurchaseUpdate, PurchaseResponse
- WarrantyCreate, WarrantyUpdate, WarrantyResponse
- RetailerCreate, RetailerResponse
- BrandCreate, BrandResponse
- PaginatedResponse (generic wrapper)

**Tasks:**
- [ ] Create all Pydantic schemas with validation
- [ ] Implement all CRUD routes
- [ ] Add pagination support (skip/limit)
- [ ] Add filtering (status, dates, search)
- [ ] Add proper error handling and status codes
- [ ] Document endpoints in docstrings

**Deliverables:**
- All CRUD endpoints functional and tested
- Swagger docs auto-generated

---

### Phase 4: Analytics Endpoints 📊
**Objective:** Build analytics endpoints that power dashboard charts

#### Analytics Routes

1. **Spending Analysis**
   - [ ] `GET /api/analytics/spending` - Total spending over 12 months
     - Response: Array of {month, total_amount, item_count}
   - [ ] `GET /api/analytics/spending/by-period` - Spending for specific date range
   - [ ] `GET /api/analytics/summary` - Overall stats (total spent, avg price, etc.)

2. **Warranty Timeline**
   - [ ] `GET /api/analytics/warranties/timeline` - Warranties expiring vs expired (12 months)
     - Response: {month, active, expired, expiring_soon}
   - [ ] `GET /api/analytics/warranties/summary` - Total active, expired, voided count

3. **Distribution Analysis**
   - [ ] `GET /api/analytics/retailers` - Purchases by retailer
     - Response: [{retailer_name, count, percentage, total_spent}]
   - [ ] `GET /api/analytics/brands` - Purchases by brand
     - Response: [{brand_name, count, percentage, total_spent}]

4. **Top Products**
   - [ ] `GET /api/analytics/top-products` - Top 10 most purchased items
     - Response: [{product_name, count, total_spent, avg_price}]

5. **Recent Activity**
   - [ ] `GET /api/analytics/recent-purchases` - 10 most recent purchases
   - [ ] `GET /api/analytics/recent-warranties` - 10 recently added warranties

**AnalyticsService Methods:**
- get_spending_by_month(months: int = 12)
- get_warranty_timeline(months: int = 12)
- get_retailer_distribution()
- get_brand_distribution()
- get_top_products(limit: int = 10)
- get_spending_summary()
- get_warranty_summary()

**Tasks:**
- [ ] Create AnalyticsService with all calculation methods
- [ ] Implement analytics routes with proper query parameters
- [ ] Add date range filtering
- [ ] Optimize queries (consider caching for heavy aggregations)
- [ ] Return data in format matching frontend expectations

**Deliverables:**
- All analytics endpoints functional
- Frontend can fetch and display real data instead of mock data

---

### Phase 5: Data Import/Export 💾
**Objective:** Allow users to export and import their data

#### Export Endpoints
- [ ] `GET /api/export/json` - Export all data as JSON
- [ ] `GET /api/export/csv` - Export purchases as CSV

#### Import Endpoints
- [ ] `POST /api/import/json` - Import data from JSON file
- [ ] `POST /api/import/csv` - Import purchases from CSV file

**Schema Handling:**
- Validate imported data before inserting
- Handle duplicates (skip vs update)
- Return import report (success count, errors, warnings)

**Tasks:**
- [ ] Implement export functions (JSON, CSV)
- [ ] Implement import functions with validation
- [ ] Add progress reporting for large imports
- [ ] Handle error cases gracefully

**Deliverables:**
- Users can export and import their purchase data

---

### Phase 6: Testing 🧪
**Objective:** Ensure reliability and correctness

**Test Coverage:**
- [ ] Unit tests for models and services
- [ ] Integration tests for API endpoints
- [ ] Analytics calculation tests
- [ ] Data validation tests
- [ ] Error handling tests

**Test Structure:**
```
tests/
├── test_purchases.py          # CRUD operations
├── test_warranties.py         # Warranty operations
├── test_analytics.py          # Analytics calculations
├── test_imports.py            # Import/export
└── conftest.py                # Shared fixtures (DB, client)
```

**Tasks:**
- [ ] Create pytest fixtures for database and test client
- [ ] Write unit tests for all services
- [ ] Write integration tests for all endpoints
- [ ] Aim for 80%+ code coverage
- [ ] Set up CI/CD pipeline (GitHub Actions)

**Deliverables:**
- Test suite with >80% coverage
- CI/CD pipeline validates all commits

---

### Phase 7: Frontend Integration 🔗
**Objective:** Connect frontend to backend API

**Changes to Frontend:**
- Replace mock data functions with API calls in:
  - `src-modern/scripts/components/dashboard.js`
  - `src-modern/scripts/components/inventory.js`
  - `src-modern/scripts/components/settings.js`
- Update API base URL in environment/config
- Add error handling for API failures
- Add loading states during API calls

**Key API Calls Needed:**
- Dashboard: warranties timeline, spending, retailers, brands, top products, recent items
- Inventory: paginated purchases, search, filters, CRUD operations
- Settings: retailers list, add/delete retailer, export/import

**Tasks:**
- [ ] Update environment variables with backend URL
- [ ] Replace all generateXxxData() calls with fetch calls
- [ ] Add loading indicators
- [ ] Add error toast notifications
- [ ] Test full workflow end-to-end

**Deliverables:**
- Frontend fully functional with real data from backend
- No console errors or failed API calls

---

### Phase 8: Deployment 🚀
**Objective:** Ready for production deployment

**Infrastructure:**
- [ ] Docker image for backend
- [ ] Database connection pooling (asyncpg)
- [ ] Environment variable management
- [ ] Logging configuration
- [ ] Error tracking (optional: Sentry)

**Deployment Options:**
- [ ] Docker Compose for local development
- [ ] Platform options: Render, Railway, Fly.io, AWS, Heroku

**Tasks:**
- [ ] Create Dockerfile and .dockerignore
- [ ] Create docker-compose.yml with PostgreSQL service
- [ ] Test Docker build and run
- [ ] Document deployment steps
- [ ] Set up environment variables for production

**Deliverables:**
- Backend deployable as Docker container
- Ready for cloud hosting

---

### Phase 9: Backup & Disaster Recovery 💾
**Objective:** Protect user data with reliable backup and restore capabilities

**Background:**
The app uses hash-sharded file storage (`uploads/{hash[:2]}/{hash[2:4]}/{hash}`) for scalability and automatic deduplication. This requires careful backup strategy to ensure data integrity and easy disaster recovery.

#### Backup Components
| Component | Location | Frequency | Notes |
|-----------|----------|-----------|-------|
| Database | `spends_tracker.db` | Daily | SQLite file, small size |
| File Storage | `uploads/` | Weekly | Hash-sharded, can use incremental sync |
| Config | `.env` | Once | Environment variables |

#### Backup Strategy (3-2-1 Rule)
- **3 copies**: Primary + Local Backup + Offsite Backup
- **2 media**: Local disk + Cloud storage
- **1 offsite**: Cloud storage (S3, B2, Dropbox, etc.)

#### Backend Tasks
- [ ] Create backup service (`app/services/backup_service.py`)
  - [ ] Export database to temp location (handle locked DB gracefully)
  - [ ] Collect all files from hash-sharded storage
  - [ ] Create timestamped .zip archive
  - [ ] Verify backup integrity (checksum validation)
- [ ] Create restore service
  - [ ] Validate backup structure before restore
  - [ ] Create restore point (backup current state first)
  - [ ] Extract and verify database
  - [ ] Extract uploads (skip existing files to avoid re-download)
  - [ ] Run post-restore integrity check
- [ ] Support incremental backups using rsync-style sync
- [ ] API endpoints:
  - [ ] `POST /api/backup/create` - Trigger manual backup
  - [ ] `GET /api/backup/status` - Check backup job status
  - [ ] `POST /api/backup/restore` - Restore from uploaded backup
  - [ ] `GET /api/backup/list` - List available backups

#### Frontend Tasks
- [ ] Settings page → "Data Management" tab
  - [ ] Manual backup button (one-click download .zip)
  - [ ] Restore from backup (upload .zip file)
  - [ ] Backup configuration:
    - [ ] Enable automatic backups toggle
    - [ ] Frequency selector (Daily/Weekly/Monthly)
    - [ ] Backup location (Local folder / Cloud storage)
    - [ ] Retention policy (keep last N backups)
  - [ ] Display backup status: "Last backup: 2 days ago, 45 files, 12MB"
  - [ ] Show restore warnings and confirmation dialog

#### Disaster Recovery Scenarios to Handle
- [ ] Database corruption: Restore SQLite from backup, uploads intact
- [ ] Uploads folder lost: Identify orphaned DB records, mark files unavailable
- [ ] Complete system failure: Fresh install + restore DB + sync uploads

#### Deliverables:
- Users can create and download full backups
- Users can restore from backups via UI
- Automated backup scheduling (optional but recommended)
- Clear disaster recovery documentation

**References:**
- Hash-sharded storage used by: Git, Docker, IPFS, Immich, Paperless-ngx
- Backup patterns from: Home Assistant, Nextcloud, Photoprism

---

## Key Considerations

### 1. **Money Handling** ⚠️
- Use `Decimal` type in SQLAlchemy, NOT float
- Pydantic schemas must validate decimal format
- Example: `price: Decimal = Field(..., decimal_places=2, max_digits=10)`

### 2. **Timestamps & Timezones**
- Store all timestamps in UTC
- Frontend handles timezone conversion based on user settings
- Use `datetime.utcnow()` for server timestamps

### 3. **Database Precision**
- Purchase dates: day precision (no time needed)
- Warranty dates: day precision
- Created_at/Updated_at: second precision
- Use proper PostgreSQL types (DATE vs TIMESTAMP)

### 4. **Pagination**
- Default limit: 20, max limit: 100
- Use skip/limit pattern (not page numbers)
- Always return total count for UI

### 5. **Filtering & Search**
- Case-insensitive search
- Support multiple filters at once
- Filter by status, retailer, brand, date range

### 6. **Error Handling**
- Return proper HTTP status codes
- Include error details in response
- Log errors for debugging

### 7. **CORS Configuration**
- Allow frontend domain (localhost:3000 for dev)
- Allow credentials if needed later
- Restrict in production

### 8. **Performance**
- Use database indexes on frequently queried columns
- Consider caching analytics results (daily/weekly aggregations)
- Use database connection pooling
- Lazy load relationships in ORM

---

## Development Workflow

### Local Setup
```bash
# 1. Create virtual environment
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows

# 2. Install dependencies
pip install -r requirements.txt

# 3. For initial development with SQLite (no Docker needed)
# Database file will be created automatically

# 4. Run migrations (uses SQLite initially)
alembic upgrade head

# 5. Seed initial data (optional)
python scripts/seed_data.py

# 6. Start dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Later: To switch to PostgreSQL
# docker-compose up -d  # Start PostgreSQL with Docker
# Update .env to use PostgreSQL connection string
# Run migrations again for PostgreSQL
```

### Database Migrations
```bash
# Create new migration after model changes
alembic revision --autogenerate -m "Add warranty table"

# Apply migrations
alembic upgrade head

# Rollback last migration
alembic downgrade -1
```

### Testing
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test
pytest tests/test_purchases.py::test_create_purchase
```

---

## Milestones

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Setup | 1-2 hours | ⏳ Pending |
| Phase 2: Models | 2-3 hours | ⏳ Pending |
| Phase 3: CRUD APIs | 3-4 hours | ⏳ Pending |
| Phase 4: Analytics | 2-3 hours | ⏳ Pending |
| Phase 5: Import/Export | 1-2 hours | ⏳ Pending |
| Phase 6: Testing | 2-3 hours | ⏳ Pending |
| Phase 7: Frontend Integration | 2-3 hours | ⏳ Pending |
| Phase 8: Deployment | 1-2 hours | ⏳ Pending |
| Phase 9: Backup & Recovery | 2-3 hours | ⏳ Pending |
| **Total** | **18-25 hours** | |

---

## Notes

- Start with Phase 1-3 for MVP (working CRUD API)
- Phases 4-7 add features and polish
- Phase 8 prepares for production
- Phase 9 ensures data safety (critical for production use)
- Each phase should include documentation updates
- Consider starting with Phase 6 (testing framework) early

---

**Last Updated:** January 29, 2025
**Status:** Ready for development
