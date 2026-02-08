# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Top 10 Expensive Purchases table on dashboard
- Recent 10 Purchases table on dashboard
- User-configurable date format settings
- Hybrid settings storage (database + localStorage)
- Flatpickr date picker for custom date formats
- Currency symbol display based on user preference

### Changed
- Renamed dashboard tables for consistency
- Warranty timeline simplified to Active/Expired only
- Improved date formatting across the application

### Fixed
- CORS errors on API endpoints
- Removed redundant expiring_soon from warranty data
- Fixed purchase status error in analytics

## [1.0.0] - 2026-02-07

### Added
- Initial release of Spends Tracker
- Purchase tracking with product details, price, retailer, brand
- Warranty tracking with auto-expiry detection
- File management with deduplication (receipts, manuals, photos)
- Spending analytics and visualization
- Dashboard with charts and KPI cards
- Inventory table with filtering and sorting
- Data import/export (JSON and CSV)
- Responsive design with Bootstrap 5
- Dark/Light theme support

### Tech Stack
- Frontend: Vite + Alpine.js + Bootstrap 5 + Chart.js
- Backend: FastAPI + SQLAlchemy + Pydantic
- Database: SQLite (dev) / PostgreSQL (prod)
- File Storage: Hash-sharded with reference counting
