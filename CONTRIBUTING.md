# Contributing to Spends Tracker

Thank you for your interest in contributing to Spends Tracker! This document provides guidelines and instructions for contributing.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

---

## Code of Conduct

Be respectful, inclusive, and collaborative. We welcome contributions from everyone.

---

## Getting Started

### Prerequisites

**Frontend Development:**
- Node.js 16+ and npm
- Basic knowledge of HTML, CSS, JavaScript
- Familiarity with Alpine.js (lightweight, easy to learn)

**Backend Development:**
- Python 3.10+
- Basic knowledge of FastAPI
- Understanding of SQLAlchemy ORM

**Full-Stack Development:**
- Both of the above

---

## Development Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/spends-tracker.git
cd spends-tracker
```

### 2. Frontend Setup

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev
```

The frontend dev server includes:
- ✅ Hot Module Reload (HMR) - instant updates
- ✅ Proxy to backend API
- ✅ Source maps for debugging

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Run migrations
alembic upgrade head

# (Optional) Seed sample data
python scripts/seed_data.py

# Start backend server (http://localhost:8000)
python run_server.py
```

### 4. Verify Setup

**Frontend:**
- Open http://localhost:3000
- Should see dashboard with charts (may show empty data)

**Backend API:**
- Open http://localhost:8000/docs
- Should see Swagger UI with all API endpoints

**Full Integration:**
- Frontend at http://localhost:3000 should fetch data from backend at http://localhost:8000/api

---

## Project Structure

```
spends-tracker/
├── src-modern/          # Frontend source (Vite + Alpine.js)
│   ├── scripts/         # JavaScript components
│   └── styles/scss/     # SCSS stylesheets
├── backend/             # Backend API (FastAPI)
│   ├── app/             # Application code
│   │   ├── routes/      # API endpoints
│   │   ├── services/    # Business logic
│   │   ├── models/      # Database models
│   │   └── schemas/     # Pydantic schemas
│   └── tests/           # Test suite
├── dist-modern/         # Frontend build output (generated)
└── public-assets/       # Static assets
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed architecture documentation.

---

## Development Workflow

### Working on Frontend

1. **Start dev server:**
```bash
npm run dev
```

2. **Make changes:**
- Edit files in `src-modern/`
- Changes appear instantly in browser (HMR)

3. **Check code quality:**
```bash
npm run lint        # Check for errors
npm run lint:fix    # Auto-fix errors
npm run format      # Format code
```

4. **Test build:**
```bash
npm run build
npm run preview
```

### Working on Backend

1. **Start backend:**
```bash
cd backend
python run_server.py
```

2. **Make changes:**
- Edit files in `backend/app/`
- Server auto-reloads on changes

3. **Run tests:**
```bash
pytest                    # Run all tests
pytest tests/test_purchases.py  # Run specific test
```

4. **Check code quality:**
```bash
# Install dev tools
pip install black flake8 mypy

# Format code
black app/

# Check linting
flake8 app/

# Type checking
mypy app/
```

### Database Changes

1. **Modify model:**
```python
# backend/app/models/purchase.py
class Purchase(Base):
    # Add new field
    notes = Column(Text, nullable=True)
```

2. **Create migration:**
```bash
cd backend
alembic revision --autogenerate -m "Add notes field to purchases"
```

3. **Review migration:**
```bash
# Check backend/migrations/versions/[hash]_add_notes_field.py
```

4. **Apply migration:**
```bash
alembic upgrade head
```

5. **Update schema:**
```python
# backend/app/schemas/purchase.py
class PurchaseCreate(BaseModel):
    notes: Optional[str] = None
```

---

## Coding Standards

### Frontend (JavaScript)

**Style Guide:**
- Use ESLint configuration (`.eslintrc.js`)
- 2 spaces for indentation
- Single quotes for strings
- Semicolons required
- camelCase for variables and functions

**Example:**
```javascript
// Good ✅
function fetchPurchases() {
  return fetch('/api/purchases')
    .then(response => response.json())
    .catch(error => console.error('Error:', error));
}

// Bad ❌
function fetch_purchases(){
  return fetch("/api/purchases").then(response=>response.json())
}
```

**Alpine.js Conventions:**
```javascript
// Component definition
Alpine.data('purchaseList', () => ({
  purchases: [],
  loading: false,

  async init() {
    await this.loadPurchases();
  },

  async loadPurchases() {
    this.loading = true;
    // ...
  }
}));
```

### Backend (Python)

**Style Guide:**
- Follow PEP 8
- 4 spaces for indentation
- Type hints required
- snake_case for variables and functions

**Example:**
```python
# Good ✅
async def get_purchase(
    purchase_id: UUID,
    db: AsyncSession
) -> Optional[Purchase]:
    """Get a purchase by ID."""
    result = await db.execute(
        select(Purchase).where(Purchase.id == purchase_id)
    )
    return result.scalar_one_or_none()

# Bad ❌
async def getPurchase(purchase_id, db):
    result = await db.execute(select(Purchase).where(Purchase.id==purchase_id))
    return result.scalar_one_or_none()
```

**FastAPI Route Conventions:**
```python
@router.get("/", response_model=List[PurchaseResponse])
async def list_purchases(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db)
) -> List[Purchase]:
    """
    List all purchases with pagination.

    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        db: Database session

    Returns:
        List of purchases
    """
    service = PurchaseService(db)
    return await service.list_purchases(skip=skip, limit=limit)
```

### Database Models

```python
class Purchase(Base):
    """Purchase model representing a purchased item."""

    __tablename__ = "purchases"

    # Always use UUID for primary keys
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Use Decimal for money (never Float)
    price = Column(Numeric(10, 2), nullable=False)

    # Use Enum for status fields
    status = Column(Enum(PurchaseStatus), default=PurchaseStatus.ORDERED)

    # Always add timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### SCSS/CSS

```scss
// Use BEM naming convention
.purchase-card {
  padding: 1rem;

  &__title {
    font-size: 1.25rem;
    font-weight: 600;
  }

  &__price {
    color: var(--bs-success);
  }

  &--featured {
    border: 2px solid var(--bs-primary);
  }
}
```

---

## Testing

### Frontend Tests (Future)

```bash
# Unit tests with Vitest
npm run test

# E2E tests with Playwright
npm run test:e2e
```

### Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app tests/

# Run specific test file
pytest tests/test_purchases.py

# Run specific test
pytest tests/test_purchases.py::test_create_purchase
```

**Writing Tests:**

```python
# tests/test_purchases.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_purchase(client: AsyncClient):
    """Test creating a new purchase."""
    purchase_data = {
        "product_name": "Test Product",
        "price": 99.99,
        "purchase_date": "2026-01-15",
        "status": "ORDERED"
    }

    response = await client.post("/api/purchases", json=purchase_data)

    assert response.status_code == 201
    data = response.json()
    assert data["product_name"] == "Test Product"
    assert data["price"] == 99.99
```

---

## Pull Request Process

### 1. Create a Branch

```bash
# Create feature branch
git checkout -b feature/add-receipt-upload

# Or bug fix branch
git checkout -b fix/dashboard-chart-error
```

**Branch Naming:**
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation
- `refactor/description` - Code refactoring
- `test/description` - Adding tests

### 2. Make Changes

- Write clean, documented code
- Follow coding standards
- Add tests for new features
- Update documentation

### 3. Commit Changes

```bash
git add .
git commit -m "feat: Add receipt image upload"
```

**Commit Message Format:**
```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no logic change)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: Add warranty expiration notifications

Implemented email notifications for warranties expiring within 30 days.
Added new route /api/warranties/notify and email service integration.

Closes #42
```

```
fix: Correct date formatting in analytics charts

Fixed bug where dates were showing in incorrect timezone.
Updated day.js configuration to use UTC consistently.

Fixes #58
```

### 4. Push and Create PR

```bash
git push origin feature/add-receipt-upload
```

Then create Pull Request on GitHub with:

**PR Title:** Clear, descriptive summary
```
feat: Add receipt image upload feature
```

**PR Description Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-reviewed the code
- [ ] Added comments for complex logic
- [ ] Updated documentation
- [ ] Added tests that prove fix/feature works
- [ ] All tests pass locally
- [ ] No new warnings

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #42
```

### 5. Code Review

- Respond to reviewer comments
- Make requested changes
- Push updates to same branch
- Re-request review when ready

### 6. Merge

Once approved:
- PR will be merged by maintainer
- Branch will be deleted
- Changes will be in `main` branch

---

## Issue Guidelines

### Reporting Bugs

Use the bug report template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
 - OS: [e.g. macOS 13.0]
 - Browser: [e.g. Chrome 120]
 - Version: [e.g. 1.0.0]

**Additional context**
Any other relevant information.
```

### Requesting Features

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
Clear description of what you want.

**Describe alternatives you've considered**
Other solutions you've thought about.

**Additional context**
Mockups, examples, or other info.
```

---

## Areas Needing Contribution

### High Priority
- [ ] Add missing test files (test_warranties.py, test_imports.py)
- [ ] Implement build-time HTML templating (avoid duplication)
- [ ] Add frontend unit tests with Vitest
- [ ] Improve error handling in API
- [ ] Add API response caching

### Medium Priority
- [ ] Add authentication (JWT)
- [ ] Add user management
- [ ] Add receipt image upload
- [ ] Add PDF export
- [ ] Add email notifications

### Good First Issues
- [ ] Update color scheme
- [ ] Add more chart types
- [ ] Improve mobile responsiveness
- [ ] Add keyboard shortcuts
- [ ] Fix minor UI bugs

---

## Getting Help

- 📖 Read [ARCHITECTURE.md](ARCHITECTURE.md) for system design
- 📖 Read [README.md](README.md) for project overview
- 💬 Ask questions in GitHub Discussions
- 🐛 Report bugs in GitHub Issues
- 📧 Email: [your-email@example.com]

---

## Recognition

Contributors will be:
- ✨ Listed in CONTRIBUTORS.md
- 🎉 Mentioned in release notes
- 💖 Thanked in README.md

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Spends Tracker! 🎉**
