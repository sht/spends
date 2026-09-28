# Spends Tracker frontend

Vue 3 + Vite frontend for the existing Spends Tracker API. The backend and its routes remain unchanged. There is no login, SSR, external asset CDN or charting dependency.

Build with Node.js 22.12+ (Node 22, matching the Docker build). The running FastAPI image only needs the built static files.

## Production build

From the repository root, run `npm ci` and `npm run build`. The build writes `dist-modern/index.html` and hashed assets to `dist-modern/`, ready for the existing backend Docker build and FastAPI static mount. Navigation uses hash URLs and API calls use same-origin `/api/...` URLs.

## Development

Run `python3.12 scripts/dev.py setup`, then `npm run dev` from the repository root. This starts the frontend at http://localhost:3030 and an isolated local API at http://127.0.0.1:3031 with fictional data. See [Environment setup](ENVIRONMENTS.md) for prerequisites, data locations, tests, and production release steps.

For standalone frontend development, `npm run dev:frontend` uses `VITE_API_URL` from your environment (default `http://localhost:3031`). Build with `npm run build`; the existing backend serves the output from `dist-modern/`.

## UI and data rules

- Home lists active items with return deadlines or non-voided warranties ending in the next 30 days. Purchases is the main collection, with list and grid display modes. Marketplace shows the same purchases in a separate photo-first, server-paginated view (20 per page), with active spending totaled in the app currency. Purchase detail handles files and components. Insights use active purchases and group spending by original currency.
- The API does not convert currencies. `settings.currency_code` is the default for new purchases; each recorded amount is rendered in that purchase's currency. Totals never add unlike currencies.
- Purchase dates and deadlines are treated as local calendar dates, without converting ISO date strings through UTC. Lifetime warranties show “Lifetime”.
- Upload a purchase first, then add a receipt or take its photo from the detail view. Purchase files are limited to 10 MB each. Component file upload and listing are supported; the described API has no component-file delete route.
- JSON, CSV and Amazon CSV imports use the existing endpoints. A ZIP restore shows an overwrite confirmation. Reset-all requires typing `DELETE ALL` and a second confirmation.
- Backup list output is not specified in the backend contract. The UI accepts a plain array or an object containing `backups` or `items`, renders common filename/name properties, and does not claim that a stored backup can be downloaded or restored directly.
- The app loads up to 1000 purchases per request and continues fetching pages if the API returns fewer. This is suitable for the stated scale of about 300 purchases. Search, sorting and filters happen locally against that complete set.

## Source layout

- `src/api.js` — same-origin API requests, 422 error parsing, pagination, multipart upload.
- `src/utils.js` — date, money, totals and safe external links.
- `src/App.vue` — shell, navigation, theme and shared settings.
- `src/views/` — overview, collection, purchase form/detail, insights and settings/data.
- `src/styles.css` — responsive styles with light/dark color tokens.

No new backend endpoint is required for the implemented features. The backend contract does not specify whether component-file deletion is supported, so the UI does not expose it.
