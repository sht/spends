# Spends Tracker API

Reference for every endpoint the backend exposes. It was written from the FastAPI OpenAPI schema and checked against the running app. FastAPI also serves interactive docs at `/docs` and the raw schema at `/openapi.json` on the backend (dev: `http://localhost:3031/docs`), which stay correct automatically. Use them when this file and the code disagree, and then fix this file.

## Conventions

- **Base path**: everything is under `/api`. The backend serves the frontend on the same origin, so the frontend uses relative `/api/...` paths.
- **Auth**: none. 1 user.
- **Trailing slashes matter.** Paths are listed exactly as registered. Calling `/api/purchases/{id}` without the final `/` returns `404`, because the static frontend mount at `/` catches unmatched paths. Warranties, retailers, brands and settings keys have no trailing slash after the id.
- **Money** (`price`, `total_spent`, …) is returned as a decimal string, for example `"49.99"`. Send it as a string or number. `total_spending` on the purchase list is a JSON number.
- **Dates** are ISO `YYYY-MM-DD`. Timestamps are ISO datetimes.
- **IDs** are UUID strings. Purchase, warranty, retailer, brand and component IDs have dashes. File IDs are returned with dashes, and both forms are accepted in URLs.
- **Paginated lists** take `skip` and `limit` and return:
  ```json
  { "items": [], "total": 30, "page": 1, "limit": 20, "pages": 2 }
  ```
  `limit` is capped at 100 for warranties, retailers and brands. Purchases have no cap.
- **Errors**: `404` with `{"detail": "… not found"}`, `422` for validation errors with `{"detail": [{"loc": ["body", "price"], "msg": "…", "type": "…"}]}`, `400` for a bad file type, `413` for a file over 10 MB.

## Data model

### Purchase

```json
{
  "id": "3f2b8c1e-7a4d-4e9b-9c21-5d6e8f0a1b2c",
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
  "notes": "…",
  "tags": "audio,travel",
  "tax_deductible": 0,
  "item_status": "active",
  "warranty_id": "…",
  "warranty": {
    "id": "…", "warranty_start": "2025-11-02", "warranty_end": "2027-11-02",
    "warranty_type": "LIMITED", "status": "ACTIVE", "provider": "Sony", "notes": null
  },
  "photo_id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  "photo_count": 3,
  "created_at": "2025-11-02T18:21:05",
  "updated_at": null
}
```

- `item_status`: `active`, `sold`, `lost`, `donated`, `disposed`. Only `active` purchases count in spending totals.
- `tags`: comma-separated string, max 255 characters.
- `tax_deductible`: `0` or `1`.
- `warranty`: `null` if there's none, at most 1 per purchase.
- `photo_id` and `photo_count`: the first photo and number of photos. Only set on `GET /api/purchases/` list items, `null`/`0` elsewhere.

**Create and update body** (`PurchaseCreate` / `PurchaseUpdate`): all fields above except `id`, `retailer`, `brand`, `warranty`, `warranty_id`, `photo_*`, timestamps, plus 2 warranty fields:

| Field | Notes |
| ----- | ----- |
| `product_name` | Required on create, 1 to 255 characters |
| `price` | Required on create, ≥ 0 |
| `purchase_date` | Required on create, can't be in the future (`422`) |
| `currency_code` | Default `"USD"`, max 3 characters |
| `warranty_expiry` | Creates or updates the warranty with this end date. On update, `null` removes the warranty |
| `warranty_type` | Free text, usually `LIMITED`, `EXTENDED` or `LIFETIME`. `LIFETIME` creates a warranty ending `9999-12-31` |

On update, send only the fields that change. Fields you leave out are not touched.

### Warranty

`id`, `purchase_id`, `warranty_start`, `warranty_end`, `warranty_type`, `status`, `provider`, `notes`, `created_at`.

`status` is computed on every read: `VOIDED` if it was set to voided, otherwise `ACTIVE` when `warranty_end` is today or later and `EXPIRED` when it's earlier. A lifetime warranty has `warranty_end: "9999-12-31"`.

### Component

A sub-part of a purchase: `id`, `purchase_id`, `name` (required), `description`, `price`, `currency_code` (default `"USD"`), `brand` (free text, not a brand id), `model_number`, `serial_number`, `quantity`, `link`, `warranty_expiry`, `warranty_type`, `notes`, `tags`, `created_at`, `updated_at`.

A component's warranty is just the `warranty_expiry` date on the component. It doesn't appear in the warranty endpoints or in analytics.

### File

```json
{
  "id": "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
  "purchase_id": "…",
  "filename": "receipt.pdf",
  "file_type": "receipt",
  "mime_type": "application/pdf",
  "file_size": 120043,
  "created_at": "…",
  "updated_at": null,
  "stored_filename": "…", "file_hash": "…", "reference_count": 1
}
```

- `file_type`: `receipt`, `manual`, `photo`, `warranty`, `other`.
- Component files are stored with the parent purchase's `purchase_id`.
- `stored_filename`, `file_hash` and `reference_count` are internal. Identical files are stored once on disk and shared.

### Retailer and brand

`id`, `name` (1 to 255 characters), `url`, `created_at`. Retailers also have `is_brand`: `true` when a brand with exactly the same name exists.

### Settings

`{ "currency_code": "USD", "date_format": "MM/DD/YYYY" }`. Values aren't validated by the API, so the frontend must check them.

## Endpoints

### Purchases

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| GET | `/api/purchases/` | Query, see below | `200` paginated list of purchases, plus `total_spending` |
| POST | `/api/purchases/` | `PurchaseCreate` | `201` purchase |
| GET | `/api/purchases/{purchase_id}/` | | `200` purchase |
| PUT | `/api/purchases/{purchase_id}/` | `PurchaseUpdate` | `200` purchase |
| DELETE | `/api/purchases/{purchase_id}/` | | `204`. Also deletes its warranty, components and files |

List query parameters:

| Parameter | Notes |
| --------- | ----- |
| `skip`, `limit` | Default `0` and `20`, no maximum |
| `search` | Case-insensitive, matches product name, model number, serial number, order number, tags, notes, retailer name and brand name |
| `retailer_id`, `brand_id` | Exact match |
| `tag` | Case-insensitive substring match on the `tags` string |
| `item_status` | Exact match |
| `date_from`, `date_to` | Inclusive, on `purchase_date` |
| `sort_by` | `name`, `price`, `purchaseDate`, `createdAt`, `retailer` (by name), `brand` (by name), `modelNumber`, `quantity`, `serialNumber`, `retailerOrderNumber`, `taxDeductible`, `tags`, `notes`. Default `createdAt` |
| `sort_direction` | `asc` or `desc` (default) |

`total_spending` is the sum of `price` over the filtered purchases that have `item_status = active`. It ignores `quantity` and currency.

### Warranties

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| GET | `/api/warranties/` | `skip`, `limit` (max 100), `status` (`ACTIVE`, `EXPIRED`, `VOIDED`) | `200` paginated list of warranties |
| GET | `/api/warranties/expiring` | `days` (default 30) | `200` plain list of non-voided warranties ending between today and today + `days`, soonest first |
| GET | `/api/warranties/{warranty_id}` | | `200` warranty |
| POST | `/api/warranties/` | `purchase_id`, `warranty_start`, `warranty_end`, optional `warranty_type`, `status`, `provider`, `notes` | `201` warranty |
| PUT | `/api/warranties/{warranty_id}` | Any of the fields above except `purchase_id` | `200` warranty |
| DELETE | `/api/warranties/{warranty_id}` | | `204` |

Warranty items only have `purchase_id`, not product details. For create and edit, it's usually simpler to use `warranty_expiry` on the purchase.

### Components

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| GET | `/api/components/{purchase_id}/` | | `200` plain list of components for the purchase |
| POST | `/api/components/` | Component fields, `purchase_id` and `name` required | `201` component |
| PUT | `/api/components/{component_id}/` | Any component fields | `200` component |
| DELETE | `/api/components/{component_id}/` | | `204`. Also deletes its file records |

### Files

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| POST | `/api/files/{purchase_id}/` | Multipart: `file`, `file_type` | `200` file. Uploading a file the purchase already has returns the existing record |
| GET | `/api/files/{purchase_id}/` | | `200` plain list of **all** files stored under the purchase, including its components' files. `404` if the purchase doesn't exist |
| GET | `/api/files/{purchase_id}/{file_id}/` | | `200` file |
| DELETE | `/api/files/{purchase_id}/{file_id}/` | | `200 {"message": "File deleted successfully"}`. Also works for component files, using the parent purchase id |
| GET | `/api/files/file/{file_id}/download/` | | `200` the file itself. Images and PDFs use `Content-Disposition: inline`, so the URL works in `<img>` and `<iframe>`. Everything else downloads |
| POST | `/api/files/component/{component_id}/` | Multipart: `file`, `file_type` | `200` file |
| GET | `/api/files/component/{component_id}/` | | `200` plain list of the component's files |

Uploads are limited to 10 MB (`413`), and an unknown `file_type` returns `400`. There's no endpoint to change a file's type after upload: delete it and upload it again.

File records don't include a `component_id`. To show only a purchase's own files, fetch the files of each component (`GET /api/files/component/{component_id}/`) and leave out those IDs.

### Retailers and brands

The same endpoints exist for `retailers` and `brands`:

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| GET | `/api/retailers/` | `skip`, `limit` (max 100) | `200` paginated list |
| POST | `/api/retailers/` | `name`, optional `url` | `201`. If a retailer with exactly the same name exists, it's returned instead of creating a duplicate |
| GET | `/api/retailers/{retailer_id}` | | `200` retailer |
| PUT | `/api/retailers/{retailer_id}` | `name` and/or `url` | `200` retailer |
| DELETE | `/api/retailers/{retailer_id}` | | `204`. **No check for purchases that use it**: those purchases silently lose their retailer |

There's no search on these lists. They're small, so filter in the browser.

### Analytics

None of these convert currencies. Only `/summary` limits itself to purchases with `item_status = active`. The others count every purchase regardless of status.

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| GET | `/api/analytics/summary` | | `{ total_spent, avg_price, total_items, active_warranties, expiring_warranties, expired_warranties, tax_deductible_count }`. `expiring_warranties` means ending within 30 days |
| GET | `/api/analytics/spending` | `months` (optional, all time if omitted) | `{ "spending_over_time": [{ "month": "Jun 2025", "total_amount": "412.00", "item_count": 3 }] }`. Only months that have purchases |
| GET | `/api/analytics/retailers` | | `{ "retailers": [...], "brands": [...] }`, items `{ name, count, percentage, total_spent }` |
| GET | `/api/analytics/brands` | | Same as `/retailers` |
| GET | `/api/analytics/top-products` | `limit` (default 10) | `{ "top_products": [{ product_name, count, total_spent, avg_price }] }`, highest average price first |
| GET | `/api/analytics/expensive-purchases` | `limit` (default 10) | `{ "purchases": [{ id, product_name, brand_name, price, purchase_date }] }` |
| GET | `/api/analytics/recent-purchases` | `limit` (default 10) | Plain list of purchases with nested `retailer`, `brand`, `warranty`, newest created first |
| GET | `/api/analytics/recent-warranties` | `limit` (default 10) | Plain list of warranties, newest created first |
| GET | `/api/analytics/warranties/timeline` | `months` (optional) | `{ "timeline": [{ "month": "Jan 2026", "active": 8, "expired": 2 }], "summary": {} }`. Active and expired counts per calendar month |

### Settings

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| GET | `/api/settings/` | | `{ currency_code, date_format }` |
| PUT | `/api/settings/` | Either or both fields | Updated settings |
| GET | `/api/settings/{key}` | `key` is `currency_code` or `date_format` | `{ "key": "…", "value": "…" }`, `404` for other keys |
| POST | `/api/settings/reset` | | Settings after reset to defaults |

### Export and backups

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| GET | `/api/export/json` | | Full data export as a JSON file download |
| GET | `/api/export/csv` | | Purchases as a CSV file download |
| GET | `/api/export/zip` | | Full backup download: `data.json` plus all uploaded files |
| POST | `/api/export/backup/save` | | Saves a full backup zip on the server. `{ success, filename, filepath, size, … }` |
| GET | `/api/export/backup/list` | | `{ "backups": [{ filename, size, created_at }], "total": 0 }` |
| POST | `/api/export/backup/cleanup` | `max_backups` (default 7) | Deletes the oldest server backups beyond `max_backups`. `{ success, … }` |

There's no endpoint to download or restore a backup stored on the server. Restore uses `POST /api/import/zip` with an uploaded file.

### Import

All take multipart with a single `file` field and return a result object with counts and an `errors` list:

| Method | Path | File | Result fields |
| ------ | ---- | ---- | ------------- |
| POST | `/api/import/json` | JSON from `/export/json` | `purchases_added`, `purchases_skipped_future_date`, `warranties_added`, `retailers_added`, `brands_added`, `files_added`, `errors` |
| POST | `/api/import/csv` | CSV in the `/export/csv` format | `purchases_added`, `errors` |
| POST | `/api/import/amazon-csv` | Amazon order history CSV | `purchases_added`, `purchases_skipped`, `images_fetched`, `images_failed`, `errors` |
| POST | `/api/import/zip` | Zip from `/export/zip` | `data_imported` (bool), `files_extracted`, `files_added`, plus the JSON import counts, `errors` |

Imports add to existing data. A zip restore imports `data.json` and copies files back, skipping files that already exist.

### Data

| Method | Path | Request | Response |
| ------ | ---- | ------- | -------- |
| POST | `/api/data/reset-all` | | Deletes all purchases, warranties, retailers, brands, settings, file records and uploaded files. `{ success, message, details: { database_cleared, uploads_deleted } }`. Can't be undone. Known bug: component rows aren't deleted and stay behind orphaned |

### Other

| Method | Path | Response |
| ------ | ---- | -------- |
| GET | `/api` | `{ "message": "Welcome to the Spends Tracker API", "version": "0.1.0" }` |
