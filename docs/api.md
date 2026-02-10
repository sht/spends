# Spends Tracker API Documentation

## 1. Introduction & Quick Setup

**Spends Tracker API** is a FastAPI-based backend for managing personal purchase tracking with warranties, receipts, and analytics.

### Base URLs

| Service           | Development URL              | Production URL                    |
| ----------------- | ---------------------------- | --------------------------------- |
| Frontend          | `http://localhost:3030`      | CDN deployment                    |
| Backend API       | `http://localhost:3031/api`  | `https://api.yourdomain.com`      |
| API Documentation | `http://localhost:3031/docs` | `https://api.yourdomain.com/docs` |

### Configuration

- **Authentication**: None implemented (admin dashboard for personal use)
- **Rate Limiting**: None configured
- **CORS**: All origins allowed in development
- **Database**: SQLite (dev) / PostgreSQL (production)

### Quick Start

```bash
# Terminal 1: Backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 3031

# Terminal 2: Frontend
npm run dev -- --host 0.0.0.0 --port 3030
```

---

## 2. API Endpoint Reference

### 2.1 Purchases API `/api/purchases`

| Method    | Endpoint                        | Description                    |
| --------- | ------------------------------- | ------------------------------ |
| 🟢 GET    | `/api/purchases/`               | List purchases with pagination |
| 🟢 GET    | `/api/purchases/{purchase_id}/` | Get single purchase            |
| 🟡 POST   | `/api/purchases/`               | Create new purchase            |
| 🔵 PUT    | `/api/purchases/{purchase_id}/` | Update purchase                |
| 🔴 DELETE | `/api/purchases/{purchase_id}/` | Delete purchase                |

#### Query Parameters

| Parameter     | Type  | Default | Constraints        | Description             |
| ------------- | ----- | ------- | ------------------ | ----------------------- |
| `skip`        | `int` | `0`     | `min: 0`           | Pagination offset       |
| `limit`       | `int` | `20`    | `min: 1, max: 100` | Items per page          |
| `retailer_id` | `str` | -       | UUID format        | Filter by retailer      |
| `search`      | `str` | -       | `max: 255`         | Search in product names |

#### Request Examples

**Create Purchase:**

```bash
curl -X POST http://localhost:3031/api/purchases/ \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "iPhone 15 Pro",
    "price": "999.99",
    "currency_code": "USD",
    "retailer_id": "550e8400-e29b-41d4-a716-446655440000",
    "brand_id": "550e8400-e29b-41d4-a716-446655440001",
    "purchase_date": "2026-02-10",
    "notes": "Latest model with titanium",
    "tax_deductible": 0,
    "warranty_expiry": "2027-02-10",
    "model_number": "A3108",
    "serial_number": "XYZ123ABC456",
    "retailer_order_number": "ORD-2026-001",
    "quantity": 1,
    "link": "https://apple.com/iphone-15-pro",
    "return_deadline": "2026-03-10",
    "return_policy": "30 days return policy",
    "tags": "electronics,phone,apple"
  }'
```

**Response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440002",
  "product_name": "iPhone 15 Pro",
  "price": "999.99",
  "currency_code": "USD",
  "retailer_id": "550e8400-e29b-41d4-a716-446655440000",
  "brand_id": "550e8400-e29b-41d4-a716-446655440001",
  "purchase_date": "2026-02-10",
  "notes": "Latest model with titanium",
  "tax_deductible": 0,
  "warranty_expiry": "2027-02-10",
  "model_number": "A3108",
  "serial_number": "XYZ123ABC456",
  "retailer_order_number": "ORD-2026-001",
  "quantity": 1,
  "link": "https://apple.com/iphone-15-pro",
  "return_deadline": "2026-03-10",
  "return_policy": "30 days return policy",
  "tags": "electronics,phone,apple",
  "created_at": "2026-02-10T10:30:00Z",
  "updated_at": "2026-02-10T10:30:00Z",
  "retailer": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Apple Store"
  },
  "brand": {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "name": "Apple"
  }
}
```

---

### 2.2 Warranties API `/api/warranties`

| Method    | Endpoint                        | Description                     |
| --------- | ------------------------------- | ------------------------------- |
| 🟢 GET    | `/api/warranties/`              | List warranties with pagination |
| 🟢 GET    | `/api/warranties/{warranty_id}` | Get single warranty             |
| 🟡 POST   | `/api/warranties/`              | Create new warranty             |
| 🔵 PUT    | `/api/warranties/{warranty_id}` | Update warranty                 |
| 🔴 DELETE | `/api/warranties/{warranty_id}` | Delete warranty                 |
| 🟢 GET    | `/api/warranties/expiring`      | Get expiring warranties         |

#### Query Parameters

| Parameter | Type  | Default | Constraints                         | Description                   |
| --------- | ----- | ------- | ----------------------------------- | ----------------------------- |
| `skip`    | `int` | `0`     | `min: 0`                            | Pagination offset             |
| `limit`   | `int` | `20`    | `min: 1, max: 100`                  | Items per page                |
| `status`  | `str` | -       | Enum: `ACTIVE`, `EXPIRED`, `VOIDED` | Filter by status              |
| `days`    | `int` | `30`    | `min: 1, max: 365`                  | Days to look ahead (expiring) |

#### Expiring Warranties Example

```bash
curl "http://localhost:3031/api/warranties/expiring?days=30"
```

```json
[
  {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "warranty_start": "2026-01-15",
    "warranty_end": "2026-03-15",
    "warranty_type": "manufacturer",
    "status": "ACTIVE",
    "provider": "Apple",
    "notes": "Standard 1-year warranty",
    "created_at": "2026-01-15T10:30:00Z",
    "updated_at": "2026-01-15T10:30:00Z",
    "purchase": {
      "id": "550e8400-e29b-41d4-a716-446655440002",
      "product_name": "iPhone 15 Pro",
      "purchase_date": "2026-01-15"
    }
  }
]
```

---

### 2.3 Retailers API `/api/retailers`

| Method    | Endpoint                       | Description         |
| --------- | ------------------------------ | ------------------- |
| 🟢 GET    | `/api/retailers/`              | List retailers      |
| 🟢 GET    | `/api/retailers/{retailer_id}` | Get single retailer |
| 🟡 POST   | `/api/retailers/`              | Create new retailer |
| 🔵 PUT    | `/api/retailers/{retailer_id}` | Update retailer     |
| 🔴 DELETE | `/api/retailers/{retailer_id}` | Delete retailer     |

#### Request Example

```bash
curl -X POST http://localhost:3031/api/retailers/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Best Buy",
    "url": "https://bestbuy.com"
  }'
```

---

### 2.4 Brands API `/api/brands`

| Method    | Endpoint                 | Description      |
| --------- | ------------------------ | ---------------- |
| 🟢 GET    | `/api/brands/`           | List brands      |
| 🟢 GET    | `/api/brands/{brand_id}` | Get single brand |
| 🟡 POST   | `/api/brands/`           | Create new brand |
| 🔵 PUT    | `/api/brands/{brand_id}` | Update brand     |
| 🔴 DELETE | `/api/brands/{brand_id}` | Delete brand     |

---

### 2.5 Analytics API `/api/analytics`

| Method | Endpoint                             | Description            |
| ------ | ------------------------------------ | ---------------------- |
| 🟢 GET | `/api/analytics/summary`             | Get dashboard summary  |
| 🟢 GET | `/api/analytics/spending`            | Get spending trends    |
| 🟢 GET | `/api/analytics/warranties/timeline` | Warranty timeline      |
| 🟢 GET | `/api/analytics/warranties/summary`  | Warranty summary       |
| 🟢 GET | `/api/analytics/retailers`           | Retailer distribution  |
| 🟢 GET | `/api/analytics/brands`              | Brand distribution     |
| 🟢 GET | `/api/analytics/top-products`        | Top products           |
| 🟢 GET | `/api/analytics/expensive-purchases` | Expensive purchases    |
| 🟢 GET | `/api/analytics/recent-purchases`    | Recent purchases       |
| 🟢 GET | `/api/analytics/recent-warranties`   | Recent warranties      |
| 🟢 GET | `/api/analytics/spending/by-period`  | Spending by date range |

#### Analytics Parameters

| Parameter    | Type  | Default | Constraints        | Description                  |
| ------------ | ----- | ------- | ------------------ | ---------------------------- |
| `months`     | `int` | `12`    | `min: 1, max: 120` | Number of months to analyze  |
| `limit`      | `int` | `10`    | `min: 1, max: 100` | Number of results to return  |
| `start_date` | `str` | -       | Date format        | Start date for range queries |
| `end_date`   | `str` | -       | Date format        | End date for range queries   |

#### Summary Analytics Example

```bash
curl "http://localhost:3031/api/analytics/summary"
```

```json
{
  "total_spent": "15499.87",
  "avg_price": "258.33",
  "total_items": 60,
  "active_warranties": 12,
  "expiring_warranties": 3,
  "expired_warranties": 5,
  "tax_deductible_count": 8
}
```

#### Spending Trends Example

```bash
curl "http://localhost:3031/api/analytics/spending?months=6"
```

```json
{
  "spending_over_time": [
    { "month": "2025-09", "total_amount": "1245.50", "item_count": 5 },
    { "month": "2025-10", "total_amount": "892.75", "item_count": 3 },
    { "month": "2025-11", "total_amount": "2156.00", "item_count": 8 }
  ]
}
```

---

### 2.6 Files API `/api/files`

| Method    | Endpoint                              | Description                |
| --------- | ------------------------------------- | -------------------------- |
| 🟡 POST   | `/api/files/{purchase_id}/`           | Upload file for purchase   |
| 🟢 GET    | `/api/files/{purchase_id}/`           | Get all files for purchase |
| 🟢 GET    | `/api/files/{purchase_id}/{file_id}/` | Get specific file info     |
| 🔴 DELETE | `/api/files/{purchase_id}/{file_id}/` | Delete file                |
| 🟢 GET    | `/api/files/file/{file_id}/download/` | Download file              |

#### File Upload

```bash
curl -X POST http://localhost:3031/api/files/550e8400-e29b-41d4-a716-446655440002/ \
  -F "file=@receipt.jpg" \
  -F "file_type=receipt"
```

**File Types:**

- `receipt` - Purchase receipts
- `manual` - Product manuals
- `photo` - Product photos
- `warranty` - Warranty documents
- `other` - Other documents

**Constraints:**

- Maximum file size: 10MB
- Supported formats: Images, PDFs, documents
- Automatic deduplication by SHA-256 hash

**Response:**

```json
{
  "id": "770e8400-e29b-41d4-a716-446655440000",
  "filename": "receipt_abc123.jpg",
  "original_filename": "iPhone_receipt.jpg",
  "file_type": "receipt",
  "file_size": 2048576,
  "mime_type": "image/jpeg",
  "upload_date": "2026-02-10T10:30:00Z",
  "hash": "sha256:a1b2c3d4e5f6...",
  "reference_count": 1
}
```

---

### 2.7 Export API `/api/export`

| Method | Endpoint           | Description                   |
| ------ | ------------------ | ----------------------------- |
| 🟢 GET | `/api/export/json` | Export all data as JSON       |
| 🟢 GET | `/api/export/csv`  | Export purchases as CSV       |
| 🟢 GET | `/api/export/zip`  | Export complete backup as ZIP |

#### Export Examples

```bash
# Export all data as JSON
curl -o spends-data.json "http://localhost:3031/api/export/json"

# Export purchases as CSV
curl -o purchases.csv "http://localhost:3031/api/export/csv"

# Export complete backup with files
curl -o spends-backup.zip "http://localhost:3031/api/export/zip"
```

---

### 2.8 Import API `/api/import`

| Method  | Endpoint           | Description                     |
| ------- | ------------------ | ------------------------------- |
| 🟡 POST | `/api/import/json` | Import data from JSON           |
| 🟡 POST | `/api/import/csv`  | Import purchases from CSV       |
| 🟡 POST | `/api/import/zip`  | Import complete backup from ZIP |

#### Import Examples

```bash
# Import JSON data
curl -X POST http://localhost:3031/api/import/json \
  -F "file=@spends-data.json"

# Import CSV data
curl -X POST http://localhost:3031/api/import/csv \
  -F "file=@purchases.csv"

# Import complete backup
curl -X POST http://localhost:3031/api/import/zip \
  -F "file=@spends-backup.zip"
```

**Import Response:**

```json
{
  "purchases_added": 25,
  "purchases_skipped_future_date": 2,
  "warranties_added": 18,
  "retailers_added": 8,
  "brands_added": 12,
  "files_added": 45,
  "errors": []
}
```

---

### 2.9 Data Management API `/api/data`

| Method  | Endpoint              | Description                   |
| ------- | --------------------- | ----------------------------- |
| 🟡 POST | `/api/data/reset-all` | ⚠️ Reset all application data |

#### Reset All Data

```bash
curl -X POST http://localhost:3031/api/data/reset-all
```

**⚠️ Warning:** This is an irreversible operation that deletes:

- All purchases, warranties, retailers, brands
- All uploaded files from storage
- All settings

**Response:**

```json
{
  "success": true,
  "message": "All data has been erased successfully",
  "details": {
    "database_cleared": true,
    "uploads_deleted": 156
  }
}
```

---

### 2.10 Settings API `/api/settings`

| Method  | Endpoint              | Description          |
| ------- | --------------------- | -------------------- |
| 🟢 GET  | `/api/settings/`      | Get all settings     |
| 🔵 PUT  | `/api/settings/`      | Update settings      |
| 🟢 GET  | `/api/settings/{key}` | Get specific setting |
| 🟡 POST | `/api/settings/reset` | Reset to defaults    |

#### Storage Strategy

| Setting                   | Storage                 | Reason                   |
| ------------------------- | ----------------------- | ------------------------ |
| `currency_code`           | Database + localStorage | Cross-device consistency |
| `date_format`             | Database + localStorage | Cross-device consistency |
| `theme`, `language`, etc. | localStorage only       | Device preference        |

#### Settings Examples

```bash
# Get all settings
curl "http://localhost:3031/api/settings/"

# Update settings
curl -X PUT http://localhost:3031/api/settings/ \
  -H "Content-Type: application/json" \
  -d '{
    "currency_code": "EUR",
    "date_format": "DD.MM.YYYY"
  }'

# Reset to defaults
curl -X POST http://localhost:3031/api/settings/reset
```

**Response:**

```json
{
  "currency_code": "USD",
  "date_format": "MM/DD/YYYY"
}
```

---

## 3. Complete Schema Definitions

### 3.1 Base Schemas

```python
class BaseResponse(BaseModel):
    id: str  # UUID
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class PaginatedResponse(BaseModel):
    items: List[Dict]
    total: int
    page: int
    limit: int
    pages: int
```

### 3.2 Purchase Schemas

```python
class PurchaseCreate(BaseModel):
    product_name: str = Field(..., min_length=1, max_length=255)
    price: Decimal = Field(..., gt=0)
    currency_code: str = Field(default="USD", max_length=3)
    retailer_id: Optional[str] = None
    brand_id: Optional[str] = None
    purchase_date: date
    notes: Optional[str] = None
    tax_deductible: int = Field(default=0, ge=0, le=1)
    warranty_expiry: Optional[date] = None
    model_number: Optional[str] = Field(default=None, max_length=100)
    serial_number: Optional[str] = Field(default=None, max_length=100)
    retailer_order_number: Optional[str] = Field(default=None, max_length=100)
    quantity: int = Field(default=1, ge=1)
    link: Optional[str] = Field(default=None, max_length=500)
    return_deadline: Optional[date] = None
    return_policy: Optional[str] = Field(default=None, max_length=200)
    tags: Optional[str] = Field(default=None, max_length=255)

class PurchaseUpdate(BaseModel):
    # All fields optional for partial updates
    product_name: Optional[str] = Field(None, min_length=1, max_length=255)
    price: Optional[Decimal] = Field(None, gt=0)
    # ... all other fields optional

class PurchaseResponse(PurchaseCreate, BaseResponse):
    warranty_id: Optional[str] = None
    retailer: Optional[RetailerInfo] = None
    brand: Optional[BrandInfo] = None
    warranty: Optional[WarrantyInfo] = None
```

### 3.3 Warranty Schemas

```python
class WarrantyCreate(BaseModel):
    purchase_id: str
    warranty_start: date
    warranty_end: date
    warranty_type: Optional[str] = Field(default=None, max_length=50)
    status: Optional[str] = Field(default="ACTIVE")
    provider: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = None

class WarrantyResponse(WarrantyCreate, BaseResponse):
    purchase: Optional[Dict] = None
```

### 3.4 Retailer & Brand Schemas

```python
class RetailerCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: Optional[str] = Field(default=None, max_length=255)

class RetailerResponse(RetailerCreate, BaseResponse):
    pass

class BrandCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    url: Optional[str] = Field(default=None, max_length=255)

class BrandResponse(BrandCreate, BaseResponse):
    pass
```

### 3.5 Analytics Schemas

```python
class SpendingByMonth(BaseModel):
    month: str
    total_amount: Decimal
    item_count: int

class SpendingAnalytics(BaseModel):
    spending_over_time: List[SpendingByMonth]

class SummaryAnalytics(BaseModel):
    total_spent: Decimal
    avg_price: Decimal
    total_items: int
    active_warranties: int
    expiring_warranties: int
    expired_warranties: int
    tax_deductible_count: int

class TopProduct(BaseModel):
    product_name: str
    count: int
    total_spent: Decimal
    avg_price: Decimal

class TopProductsAnalytics(BaseModel):
    top_products: List[TopProduct]

class DistributionItem(BaseModel):
    name: str
    count: int
    percentage: float
    total_spent: Decimal

class DistributionAnalytics(BaseModel):
    retailers: List[DistributionItem]
    brands: List[DistributionItem]
```

### 3.6 File Schemas

```python
class FileType(str, Enum):
    RECEIPT = "receipt"
    MANUAL = "manual"
    PHOTO = "photo"
    WARRANTY = "warranty"
    OTHER = "other"

class FileResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_type: FileType
    file_size: int
    mime_type: str
    upload_date: datetime
    hash: str
    reference_count: int
```

### 3.7 Settings Schemas

```python
class SettingsResponse(BaseModel):
    currency_code: str
    date_format: str

class SettingsUpdate(BaseModel):
    currency_code: Optional[str] = None
    date_format: Optional[str] = None
```

---

## 4. File Management System

### 4.1 Hash Calculation Process

1. **Upload Receipt**: File received via multipart form
2. **SHA-256 Hash**: `hashlib.sha256(file_content).hexdigest()`
3. **Duplicate Detection**: Check database for existing hash
4. **Reference Management**: Increment `reference_count` if exists
5. **Storage**: New file stored with hash-based filename

### 4.2 Storage Structure

```
uploads/
├── 0e/   # First 2 chars of hash
│   └── 25/
│       └── 4f8a9c...jpg  # Hash + original extension
├── 5c/
│   └── 62/
│       └── 87b1d2...pdf
└── d1/
    └── d5/
        └── d8f3a9...png
```

**Structure Formula:**

```
{hash_prefix_2}/{hash_prefix_4}/{hash_full}{extension}
```

### 4.3 Reference Counting

- **Initial Upload**: `reference_count = 1`
- **Duplicate Upload**: `reference_count += 1`
- **File Deletion**: `reference_count -= 1`
- **Physical Deletion**: Only when `reference_count = 0`

### 4.4 Upload Process Flow

```python
async def upload_file(purchase_id: str, file: UploadFile, file_type: str):
    # 1. Validation
    if file.size > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(413, "File too large")

    # 2. Calculate hash
    content = await file.read()
    file_hash = hashlib.sha256(content).hexdigest()

    # 3. Check for duplicates
    existing_file = await file_service.get_by_hash(file_hash)
    if existing_file:
        # Increment reference count
        await file_service.increment_reference(existing_file.id)
        return existing_file

    # 4. Store file
    stored_path = build_storage_path(file_hash, file.filename)
    with open(stored_path, "wb") as f:
        f.write(content)

    # 5. Create database record
    file_record = await file_service.create({
        "purchase_id": purchase_id,
        "original_filename": file.filename,
        "stored_filename": stored_path,
        "file_type": file_type,
        "file_hash": file_hash,
        "reference_count": 1,
        # ... other metadata
    })

    return file_record
```

### 4.5 Download Process

```python
async def download_file(file_id: str):
    # 1. Get file record
    file_record = await file_service.get(file_id)
    if not file_record:
        raise HTTPException(404, "File not found")

    # 2. Read file from storage
    file_path = file_record.stored_filename
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found on disk")

    # 3. Determine content disposition
    if file_record.mime_type.startswith('image/') or file_record.mime_type == 'application/pdf':
        disposition = "inline"  # Display in browser
    else:
        disposition = f"attachment; filename=\"{file_record.original_filename}\""

    # 4. Return file response
    return FileResponse(
        file_path,
        media_type=file_record.mime_type,
        filename=file_record.original_filename
    )
```

---

## 5. CORS Configuration

### 5.1 Development Configuration

```python
# backend/app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # All origins allowed
    allow_credentials=True,
    allow_methods=["*"],  # All HTTP methods
    allow_headers=["*"],  # All headers
)
```

### 5.2 Production Considerations

For production deployment, configure specific origins:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://yourdomain.com",
        "https://app.yourdomain.com",
        "https://admin.yourdomain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)
```

### 5.3 Frontend API Configuration

The frontend should be configured to point to the backend API:

```javascript
// Development
const API_URL = 'http://localhost:3031/api';

// Production
const API_URL = 'https://api.yourdomain.com/api';
```

---

## 6. Database Transactions

### 6.1 Async Session Management

```python
# backend/app/database.py
engine = create_async_engine(DATABASE_URL)
async_session_maker = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

async def get_db():
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

### 6.2 Service Layer Transaction Pattern

```python
# backend/app/services/purchase_service.py
async def create_purchase(purchase_data: PurchaseCreate, db: AsyncSession):
    try:
        # Create purchase
        purchase = Purchase(**purchase_data.dict())
        db.add(purchase)

        # Flush to get ID for potential warranty creation
        await db.flush()

        # Additional logic if needed
        # ...

        await db.commit()
        await db.refresh(purchase)

        return purchase

    except Exception as e:
        await db.rollback()
        raise HTTPException(400, f"Failed to create purchase: {str(e)}")
```

### 6.3 Connection Pooling

```python
# Configuration for optimal performance
engine = create_async_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Validate connections before use
    pool_recycle=3600,   # Recycle connections after 1 hour
    echo=False           # Disable SQL logging in production
)
```

---

## 7. Testing Guide

### 7.1 Testing Setup

```bash
# Start test environment
cd backend
pytest --cov=app tests/
```

### 7.2 Sample Data for Testing

```json
{
  "purchases": [
    {
      "product_name": "MacBook Pro 14\"",
      "price": "1999.99",
      "currency_code": "USD",
      "purchase_date": "2026-01-15",
      "notes": "M3 Pro chip, 18GB RAM"
    }
  ],
  "retailers": [
    {
      "name": "Apple Store",
      "url": "https://apple.com"
    }
  ],
  "brands": [
    {
      "name": "Apple",
      "url": "https://apple.com"
    }
  ]
}
```

### 7.3 Essential API Testing Commands

#### Test Purchase CRUD

```bash
# Create purchase
PURCHASE_ID=$(curl -s -X POST http://localhost:3031/api/purchases/ \
  -H "Content-Type: application/json" \
  -d '{
    "product_name": "Test Product",
    "price": "99.99",
    "purchase_date": "2026-01-15"
  }' | jq -r '.id')

echo "Created purchase: $PURCHASE_ID"

# Get purchase
curl "http://localhost:3031/api/purchases/$PURCHASE_ID/"

# Update purchase
curl -X PUT "http://localhost:3031/api/purchases/$PURCHASE_ID/" \
  -H "Content-Type: application/json" \
  -d '{
    "notes": "Updated notes"
  }'

# Delete purchase
curl -X DELETE "http://localhost:3031/api/purchases/$PURCHASE_ID/"
```

#### Test File Upload/Download

```bash
# Create test file
echo "Test receipt content" > test_receipt.txt

# Upload file
FILE_ID=$(curl -s -X POST "http://localhost:3031/api/files/$PURCHASE_ID/" \
  -F "file=@test_receipt.txt" \
  -F "file_type=receipt" | jq -r '.id')

echo "Uploaded file: $FILE_ID"

# Download file
curl "http://localhost:3031/api/files/file/$FILE_ID/download/" \
  -o downloaded_receipt.txt

# Clean up
curl -X DELETE "http://localhost:3031/api/files/$PURCHASE_ID/$FILE_ID/"
rm test_receipt.txt downloaded_receipt.txt
```

#### Test Analytics Endpoints

```bash
# Test summary
curl "http://localhost:3031/api/analytics/summary"

# Test spending trends
curl "http://localhost:3031/api/analytics/spending?months=6"

# Test top products
curl "http://localhost:3031/api/analytics/top-products?limit=5"

# Test expiring warranties
curl "http://localhost:3031/api/warranties/expiring?days=60"
```

#### Test Import/Export

```bash
# Export data
curl -o test_export.json "http://localhost:3031/api/export/json"

# Import data back
curl -X POST http://localhost:3031/api/import/json \
  -F "file=@test_export.json"

# Test CSV export
curl -o purchases.csv "http://localhost:3031/api/export/csv"

# Clean up
rm test_export.json purchases.csv
```

### 7.4 Error Handling Testing

```bash
# Test 404 errors
curl -w "HTTP Status: %{http_code}\n" \
  "http://localhost:3031/api/purchases/nonexistent-id/" \
  -o /dev/null -s

# Test validation errors
curl -w "HTTP Status: %{http_code}\n" \
  -X POST http://localhost:3031/api/purchases/ \
  -H "Content-Type: application/json" \
  -d '{"product_name": "", "price": -10}' \
  -o /dev/null -s

# Test file size limit
dd if=/dev/zero of=large_file.txt bs=1M count=11
curl -w "HTTP Status: %{http_code}\n" \
  -X POST "http://localhost:3031/api/purchases/$PURCHASE_ID/" \
  -F "file=@large_file.txt" \
  -F "file_type=receipt" \
  -o /dev/null -s
rm large_file.txt
```

---

## 8. Error Responses

### 8.1 Standard Error Format

```json
{
  "detail": "Error message description"
}
```

### 8.2 Common HTTP Status Codes

| Status | Description           | Example                          |
| ------ | --------------------- | -------------------------------- |
| `200`  | Success               | Data retrieved successfully      |
| `201`  | Created               | Resource created successfully    |
| `204`  | No Content            | Resource deleted successfully    |
| `400`  | Bad Request           | Validation failed, invalid input |
| `404`  | Not Found             | Resource not found               |
| `413`  | Payload Too Large     | File size exceeds 10MB limit     |
| `500`  | Internal Server Error | Unexpected server error          |

### 8.3 Validation Error Example

```json
{
  "detail": [
    {
      "loc": ["body", "price"],
      "msg": "ensure this value is greater than 0",
      "type": "value_error.number.not_gt"
    },
    {
      "loc": ["body", "purchase_date"],
      "msg": "Purchase date cannot be in the future",
      "type": "value_error"
    }
  ]
}
```

---

## 9. Performance Considerations

### 9.1 Database Optimization

- Use `selectinload` for relationship loading
- Implement proper indexing on frequently queried fields
- Use pagination for large result sets

### 9.2 File Management Performance

- Hash-based deduplication reduces storage costs
- Reference counting prevents unnecessary file operations
- Lazy loading for file contents

### 9.3 API Response Optimization

- Pagination limits large result sets (max 100 items)
- Optional field selection in analytics queries
- Compression for file downloads

---

## 10. Security Considerations

### 10.1 File Upload Security

- File type validation based on MIME type
- File size limits enforced (10MB max)
- Hash-based storage prevents path traversal attacks
- Reference counting prevents unauthorized file access

### 10.2 Input Validation

- All inputs validated through Pydantic schemas
- SQL injection prevention via SQLAlchemy ORM
- XSS prevention through proper data handling

### 10.3 Data Privacy

- No authentication required (admin dashboard model)
- Should be deployed behind VPN or IP whitelist
- Consider adding JWT authentication for multi-user scenarios

---

**API Documentation Version:** 1.0  
**Last Updated:** 2026-02-11  
**Backend Version:** FastAPI 0.104.1  
**Database:** SQLite (dev) / PostgreSQL (prod)

For additional information, see:

- [System Architecture](../ARCHITECTURE.md)
- [Backend Documentation](../backend/README.md)
- [Development Plan](../DEVELOPMENT.md)
