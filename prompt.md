# Frontend Redesign: Spends Tracker

You are designing and building a new frontend for an existing, working application. The owner wants to replace the current UI completely. Your job is frontend only: the backend stays exactly as it is.

You don't have access to the repository. Everything you need about the backend is in this prompt. If something is missing or unclear, ask the owner instead of guessing.

Work in 2 steps: first give your opinion and options, then build what the owner picks.

## Project idea

Spends Tracker is a self-hosted, single-user app for tracking personal purchases and what happens to them afterwards. The owner uses it to:

- Keep a record of what they bought: product, price, currency, date, retailer, brand, model/serial number, order number, link, notes, tags, tax-deductible flag, quantity.
- Track warranties and return deadlines, so they know what is still covered and what is about to expire.
- Store receipts, invoices, manuals, warranty cards and product photos per purchase.
- Track sub-parts of a purchase ("components"), for example parts of a PC build, each with its own price, warranty and files.
- Track the lifecycle of each item: `active`, `sold`, `lost`, `donated`, `disposed`.
- See spending patterns: spending over time, by retailer, by brand, most expensive items.
- Import and export data (JSON, CSV, Amazon order CSV, full ZIP backup including files).

It runs on a home server and is open source. There is 1 user and no login. Today there are about 30 purchases, 17 warranties and 300 files, growing to roughly 300 purchases. Design for a personal inventory, not an enterprise dashboard.

## Current frontend (being replaced)

Stack: Vite + Alpine.js + Bootstrap 5 + Chart.js, with pages written as EJS templates compiled to static HTML. Pages today:

- **Dashboard**: summary cards (total spent, item count, active/expiring/expired warranties), a spending-over-time chart, a warranty timeline chart, retailer/brand distribution charts, top-5 charts, and "top 10 expensive" and "recent 10" purchase tables.
- **Inventory**: a paginated table of purchases with search, filters and sorting, plus a large add/edit form in a modal and a "view details" modal.
- **Marketplace**: a photo grid of the same purchases (a card per purchase with its first photo).
- **Retailers**: CRUD for retailers.
- **Settings**: currency and date format.
- **Data management**: import, export, backup, reset.

The owner doesn't like the UI as a whole. You don't need to keep any of the current layout, pages or libraries.

Problems with the current UI that show what to avoid:

- Dashboard charts that carry almost no information. Example: a "Warranty Timeline" chart of active vs expired warranty counts per month. With this dataset it's 2 flat parallel lines that change about once a year. Every chart or widget must answer a question the owner would act on (for example "what expires soon?"), not visualize data just because it exists.
- The same purchase data spread across several overlapping pages (inventory table, marketplace grid, dashboard tables).

## Backend (keep as is)

- **Stack**: Python 3.10, FastAPI, SQLAlchemy (async), Pydantic, SQLite.
- **Deployment**: 1 Docker image that runs the API and also serves the built frontend as static files from a `dist-modern/` folder at the repo root, mounted at `/` with `html=True` (so `/` serves `dist-modern/index.html`). Your build must output static files to `dist-modern/`.
- The API is on the same origin under `/api`. Use relative paths (`/api/...`). CORS is open and there's no authentication.
- Money values (`price`, `total_spent`, and so on) come back as decimal strings, for example `"153.01"`. Parse them before doing math.
- Dates are ISO strings (`"2026-09-28"`), timestamps are ISO datetimes.
- Trailing slashes matter: use the paths exactly as written below.

### Data model

**Purchase** (response shape):

```json
{
  "id": "f5bb7545-c41b-45a4-be2b-d06c3494c399",
  "product_name": "Sony WH-1000XM5",
  "price": "349.00",
  "currency_code": "EUR",
  "purchase_date": "2025-11-02",
  "retailer_id": "…", "retailer": { "id": "…", "name": "Amazon" },
  "brand_id": "…",    "brand":    { "id": "…", "name": "Sony" },
  "model_number": "WH1000XM5/B",
  "serial_number": "1234567",
  "retailer_order_number": "302-1234567-1234567",
  "quantity": 1,
  "link": "https://…",
  "return_deadline": "2025-12-02",
  "return_policy": "30 days",
  "notes": "Gift from …",
  "tags": "audio,travel",
  "tax_deductible": 0,
  "item_status": "active",
  "warranty_id": "…",
  "warranty": {
    "id": "…",
    "warranty_start": "2025-11-02",
    "warranty_end": "2027-11-02",
    "warranty_type": "LIMITED",
    "status": "ACTIVE",
    "provider": "Sony",
    "notes": null
  },
  "photo_id": "007a615210914469a131a4efae618fdc",
  "photo_count": 3,
  "created_at": "2025-11-02T18:21:05",
  "updated_at": null
}
```

- `tags` is a comma-separated string. `tax_deductible` is `0` or `1`. `item_status` is 1 of `active`, `sold`, `lost`, `donated`, `disposed`.
- `warranty` is `null` if there's none. There is at most 1 warranty per purchase. `warranty_type` is free text, commonly `LIMITED`, `EXTENDED` or `LIFETIME`.
- `photo_id` is the first photo file, for thumbnails (`null` if none).
- Warranty `status` is computed by the API on every read: `ACTIVE` if `warranty_end` is today or later, `EXPIRED` if earlier, `VOIDED` if manually voided. You can trust it. Treat `VOIDED` as not covered.

**Creating or editing a purchase with a warranty**: send `warranty_expiry` (date) and optionally `warranty_type` in the purchase body. The backend creates, updates or removes the warranty for you. On update, sending `"warranty_expiry": null` removes it. `warranty_type: "LIFETIME"` creates a lifetime warranty. It's stored with `warranty_end: "9999-12-31"`, so show it as "Lifetime" instead of a date. `purchase_date` can't be in the future (returns 422).

Create/update body fields: `product_name` (required on create), `price` (required on create, ≥ 0), `purchase_date` (required on create), `currency_code`, `retailer_id`, `brand_id`, `notes`, `tax_deductible`, `warranty_expiry`, `warranty_type`, `model_number`, `serial_number`, `retailer_order_number`, `quantity`, `link`, `return_deadline`, `return_policy`, `tags`, `item_status`. On update, send only the fields that change.

**Component** (sub-part of a purchase): `id`, `purchase_id`, `name`, `description`, `price`, `currency_code`, `brand` (free text, not a brand id), `model_number`, `serial_number`, `quantity`, `link`, `warranty_expiry`, `warranty_type`, `notes`, `tags`.

**File**:

```json
{
  "id": "007a615210914469a131a4efae618fdc",
  "purchase_id": "…",
  "filename": "receipt.pdf",
  "file_type": "receipt",
  "mime_type": "application/pdf",
  "file_size": 120043,
  "created_at": "…"
}
```

`file_type` is 1 of `receipt`, `manual`, `photo`, `warranty`, `other`. Max 10MB per upload. Ignore the extra fields `stored_filename`, `file_hash` and `reference_count` (internal deduplication).

**Retailer / Brand**: `id`, `name` (unique), `url`, `created_at`.

**Settings**: `currency_code` (default `"USD"`) and `date_format` (default `"MM/DD/YYYY"`).

### API endpoints

List endpoints are paginated with `skip` and `limit` and return:

```json
{ "items": [ ... ], "total": 31, "page": 1, "limit": 20, "pages": 2 }
```

**Purchases**

- `GET /api/purchases/`: query params `skip`, `limit` (no maximum), `search`, `retailer_id`, `brand_id`, `tag`, `item_status`, `date_from`, `date_to`, `sort_by`, `sort_direction` (`asc`/`desc`).
  - `search` is case-insensitive and matches product name, model number, serial number, order number, tags, notes, retailer name and brand name.
  - `sort_by` is 1 of `name`, `price`, `purchaseDate`, `createdAt`, `retailer` (by name), `brand` (by name), `modelNumber`, `quantity`, `serialNumber`, `retailerOrderNumber`, `taxDeductible`, `tags`, `notes`. Default is newest created first.
  - The response also includes `total_spending`: the sum of `price` over the filtered purchases with `item_status = active`.
- `GET /api/purchases/{id}/`, `POST /api/purchases/`, `PUT /api/purchases/{id}/`, `DELETE /api/purchases/{id}/`

**Warranties**

- `GET /api/warranties/` (paginated), `GET /api/warranties/{id}`, `POST /api/warranties/`, `PUT /api/warranties/{id}`, `DELETE /api/warranties/{id}`
- `GET /api/warranties/?status=ACTIVE|EXPIRED|VOIDED`: filter by status.
- `GET /api/warranties/expiring?days=30`: plain list of non-voided warranties ending between today and today + `days`, soonest first. Each item has `purchase_id` but no product details, so match it against the purchase list.
- For create and edit you usually don't need these endpoints: the purchase response embeds the warranty, and the purchase body manages it.

**Components**

- `GET /api/components/{purchase_id}/` (plain list), `POST /api/components/` (body includes `purchase_id`), `PUT /api/components/{id}/`, `DELETE /api/components/{id}/`

**Files**

- `POST /api/files/{purchase_id}/`: multipart form with `file` and `file_type`
- `GET /api/files/{purchase_id}/`: plain list of files for a purchase
- `DELETE /api/files/{purchase_id}/{file_id}/`
- `GET /api/files/file/{file_id}/download/`: serves the file. Images and PDFs are served inline, so use this URL directly in `<img src>` and PDF previews.
- `POST /api/files/component/{component_id}/`, `GET /api/files/component/{component_id}/`

**Retailers and brands**

- `GET /api/retailers/` (paginated, no search), `GET/PUT/DELETE /api/retailers/{id}`, `POST /api/retailers/`
- `GET /api/brands/` (paginated, no search), `GET/PUT/DELETE /api/brands/{id}`, `POST /api/brands/`
- The purchase body references retailers and brands by id. To allow picking a new retailer or brand from the purchase form, create it first with `POST`, then use the returned `id`.

**Analytics**

- `GET /api/analytics/summary`:
  ```json
  { "total_spent": "4743.42", "avg_price": "153.01", "total_items": 31,
    "active_warranties": 13, "expiring_warranties": 1, "expired_warranties": 4,
    "tax_deductible_count": 17 }
  ```
  Totals count only purchases with `item_status = active`. `expiring_warranties` means ending within 30 days.
- `GET /api/analytics/spending?months=N`: `{ "spending_over_time": [ { "month": "Jun 2025", "total_amount": "412.00", "item_count": 3 } ] }`. Only months that have purchases are included, and all time if `months` is omitted.
- `GET /api/analytics/retailers` and `GET /api/analytics/brands`: both return `{ "retailers": [...], "brands": [...] }`, each item `{ "name", "count", "percentage", "total_spent" }`.
- `GET /api/analytics/top-products?limit=10`: `{ "top_products": [ { "product_name", "count", "total_spent", "avg_price" } ] }`
- `GET /api/analytics/expensive-purchases?limit=10`: `{ "purchases": [ { "id", "product_name", "brand_name", "price", "purchase_date" } ] }`
- `GET /api/analytics/recent-purchases?limit=10`: list of purchases with nested retailer, brand and warranty.
- `GET /api/analytics/warranties/timeline?months=N`: the monthly active/expired counts described above. Probably not worth using.

**Settings**

- `GET /api/settings/`: `{ "currency_code": "USD", "date_format": "MM/DD/YYYY" }`
- `PUT /api/settings/` with the same shape, `POST /api/settings/reset`

**Import and export**

- Downloads: `GET /api/export/json`, `GET /api/export/csv`, `GET /api/export/zip` (full backup with files)
- Backups stored on the server: `GET /api/export/backup/list`, `POST /api/export/backup/save`
- Uploads (multipart field `file`): `POST /api/import/json`, `POST /api/import/csv`, `POST /api/import/amazon-csv`, `POST /api/import/zip` (restore a full backup, this overwrites data)

**Danger zone**

- `POST /api/data/reset-all`: deletes all data and files permanently. Needs a strong confirmation in the UI.

### Things the API doesn't do

- There's no endpoint for "return deadline soon". Compute it from the purchase list (`return_deadline`). At about 300 purchases, fetching the full list once (`limit=1000`) and deriving these views in the browser is fine.
- Retailer and brand lists have no search. They're small, so filter them in the browser.

## What I want from you

### Step 1: Opinion and options (no code yet)

1. Based on the description above, say what you think is wrong with the current UI from a user's point of view.
2. Propose the information architecture: which pages or views should exist, what goes on the home screen, and what to remove or merge. Justify each home-screen element by the question it answers for the owner.
3. Propose 2 or 3 frontend options, for example different framework and tooling choices (such as plain Alpine.js, Svelte, Vue or React, a CSS approach, and whether to use a charting library at all). For each option give trade-offs: build size, maintenance effort for 1 developer, fit with a static build served by FastAPI, and how easy it is to change later with LLM assistance.
4. Recommend 1 option and explain why.
5. Describe the visual direction: layout, navigation, information density, light/dark mode, and mobile behavior. It should work well on a phone, for example adding a purchase and taking a receipt photo right after buying something.

Stop after step 1 and wait for the owner to choose.

### Step 2: Design and build (after the owner chooses)

- Deliver a complete, self-contained frontend project: `package.json`, build config, and all source files, each with its full path relative to the repo root. The owner will copy them into the repo, replacing the old frontend (`src-modern/` and the Vite/EJS setup).
- `npm ci && npm run build` must output static files to `dist-modern/` at the repo root, with `index.html` at its root. If you use client-side routing, prefer hash-based routes (`#/purchases/…`) so it works with plain static file serving and no server-side fallback.
- Use only the API above. If a feature really needs a new endpoint, don't invent it: list it separately as a suggestion with the exact request and response you'd need.
- Keep it simple and maintainable. Avoid unnecessary dependencies and abstractions.
- Handle empty, loading and error states, including API validation errors (FastAPI returns `422` with a `detail` array).
- Format money and dates using the settings (`currency_code`, `date_format`).
- Include a short README section explaining how to run it in development against the backend on `http://localhost:3031` (for example via a dev-server proxy for `/api`).

## Constraints

- Frontend only. Assume the backend can't change.
- 1 user, no authentication.
- Served from the same origin as the API, so use relative `/api` paths.
- The build output folder must be `dist-modern/`.
