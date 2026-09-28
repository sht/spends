# Frontend Checklist

Missing and weak features in the new Vue frontend (`src/`), compared with the previous frontend. Implement 1 item at a time, in order.

## Rules for every item

- Frontend only. Don't change anything under `backend/`. Everything below works with the existing API.
- Keep the current stack: Vue 3, Vite, vue-router with hash routes. Don't add dependencies unless the item says so.
- It must work on a phone and in both light and dark mode.
- Handle loading, empty and error states, like the existing views.
- Verify with `npm run build`, then use the feature in the browser at `http://127.0.0.1:3030/#/` against the dev backend (`npm run dev`).
- 1 commit per item, and tick the checkbox in this file in the same commit.
- If an item changes a rule written in `docs/FRONTEND.md`, update that file too.

## Photos and browsing

- [x] **1. Photo slider on the purchase detail page**
  - Problem: a purchase with several photos only shows small thumbnails in the file list. The old detail view had a slider.
  - Expected: at the top of the detail page, show a large photo with previous/next buttons, an "N / total" counter, and a thumbnail strip underneath. Clicking a thumbnail shows that photo. Arrow keys work when the slider has focus, and swiping works on touch screens. Hide the slider when there are no photos, and hide the arrows and strip when there's only 1.
  - Data: `GET /api/files/{purchase_id}/` returns all files. Photos are the ones with `file_type === "photo"`. Image URL: `/api/files/file/{file_id}/download/`.
  - Done when: a purchase with 3 photos lets you browse all 3 by button, thumbnail, keyboard and swipe, and a purchase with no photos shows no empty slider.

- [ ] **2. Bring back the Marketplace page**
  - Problem: the Marketplace page is gone. The list/grid toggle on Purchases doesn't replace it.
  - Expected: a separate "Marketplace" item in the sidebar and in the mobile bottom nav, at `#/marketplace`. It's a photo-first grid of cards: large photo (a placeholder if none), product name, brand, price, and a small badge with the photo count when there's more than 1. Newest purchase first, 20 per page with pagination. A header shows the total item count and total spending. Clicking a card opens the purchase detail page.
  - Data: `GET /api/purchases/?skip=&limit=20&sort_by=purchaseDate&sort_direction=desc`. Each item has `photo_id` (first photo) and `photo_count`. The response has `total` and `total_spending`.
  - Done when: the page is reachable from both navigations, cards show photos lazily (`loading="lazy"`), and a broken image falls back to the placeholder.

- [ ] **3. In-app file viewer**
  - Problem: every file opens in a new browser tab.
  - Expected: clicking a file opens a full-screen viewer inside the app. Images are shown fitted to the screen, PDFs are embedded (`<iframe>` or `<object>`), and other types show the filename with a download button. The viewer has close (also on Escape and a click on the backdrop), download, and previous/next between files of the same purchase. Reuse it from the photo slider (item 1) to view a photo full-screen.
  - Done when: images and PDFs from the detail page, and from components, open in the viewer without leaving the app.

## Adding purchases

- [ ] **4. Attach files while adding a purchase**
  - Problem: the form says "Add photos and documents after saving". Adding a purchase with its receipt takes 3 steps.
  - Expected: a "Files" section in the add/edit form. The user picks files (and a file type for each, default `photo` for images and `receipt` for PDFs), sees them listed with previews, and can remove them before saving. On save, create or update the purchase first, then upload each file with `POST /api/files/{purchase_id}/` (multipart: `file`, `file_type`). Include a "Take photo" button (`accept="image/*" capture="environment"`) for phones.
  - If some uploads fail, keep the saved purchase, go to its detail page and show which files failed.
  - Done when: on a phone you can add a purchase, take a receipt photo and save it all from 1 screen.

- [ ] **5. Multiple files and drag and drop**
  - Problem: uploads accept 1 file at a time.
  - Expected: file inputs use `multiple`. On desktop, allow dropping files onto the upload area, both in the purchase form and on the detail page. Show progress per file, for example "Uploading 2 of 5". Reject files over 10 MB with a clear message, without blocking the others.
  - Done when: selecting or dropping 5 files uploads all 5, and 1 oversized file is reported while the rest succeed.

- [ ] **6. Date validation in the purchase form**
  - Problem: you can save a warranty expiry or return deadline earlier than the purchase date. The old form blocked this.
  - Expected: show a field error and block saving if `warranty_expiry` or `return_deadline` is before `purchase_date`. `purchase_date` can't be in the future (the API also rejects this with 422, so show the API error on the field). Apply the same warranty check in the component form, against the parent purchase date.
  - Done when: each invalid combination shows an error on the right field and nothing is saved.

- [ ] **7. Currency per purchase** (skip this item if a single app currency is what you want)
  - Problem: new purchases are forced into the app currency. Anything bought in another currency is excluded from totals until converted by hand.
  - Expected: a currency field in the purchase and component forms, defaulting to the app currency, with a short list of common codes plus free input (3 letters). Totals still only sum purchases in the app currency, and show a note with the count of purchases in other currencies. Remove the "I entered the equivalent amount" flow. Update the currency rule in `docs/FRONTEND.md`.
  - Done when: you can save a purchase in USD while the app currency is EUR, and it shows in USD everywhere.

- [ ] **8. Tag chips with suggestions**
  - Problem: tags are a plain comma-separated text box.
  - Expected: type a tag and press Enter or comma to turn it into a removable chip. Suggest existing tags as you type, collected from all purchases. Still save as the same comma-separated `tags` string.
  - Done when: existing tags are suggested and saving produces the same `tags` format as before.

## Components

- [ ] **9. Components on par with purchases**
  - Problem: component files are always saved as `other`, can't be deleted, and component warranties don't appear on the home page.
  - Expected:
    - Choose the file type when attaching a file to a component (`receipt`, `manual`, `photo`, `warranty`, `other`).
    - Delete a component file. Component files are stored with their parent purchase's id, so the normal route works: `DELETE /api/files/{purchase_id}/{file_id}/` with the parent purchase id. (`docs/FRONTEND.md` wrongly says there's no delete route, fix that line.)
    - On the home page, "Warranties ending" also lists components whose `warranty_expiry` is within 30 days, labelled with the component and parent purchase name and linking to the parent purchase. Load them with `GET /api/components/{purchase_id}/` per active purchase, or only for purchases shown on the page, whichever stays fast with 300 purchases.
  - Done when: a component file can be typed, viewed in the viewer (item 3) and deleted, and a component warranty ending in 10 days shows on the home page.

## Lists and insights

- [ ] **10. Table view for purchases**
  - Problem: the list view has a fixed row layout and only 5 sort options.
  - Expected: add a third display mode, "Table", next to list and grid. Columns: photo, name, brand, retailer, purchase date, price, status, warranty (end date or "Lifetime" or "None"), tags. Optional columns the user can switch on: model number, serial number, order number, quantity, tax deductible. Remember the chosen columns in `localStorage`. Click a column header to sort by it (ascending/descending). On phones, fall back to the list view.
  - Done when: sorting by any visible column works, and the column choice survives a reload.

- [ ] **11. Insights time range and missing figures**
  - Problem: insights are fixed to the last 12 months. Average price, tax-deductible count and top products are gone.
  - Expected: a range selector with last 6, 12, 24 and 60 months, and all time. It applies to every section on the page. Add figures for number of purchases, average price, and tax-deductible count, plus a "Most bought" list of products bought more than once (by count). Everything is computed from the purchase list, as today.
  - Done when: switching the range updates every section, and "All time" starts at the oldest purchase month.

## Settings and data

- [ ] **12. Show import results**
  - Problem: imports end with a generic "Import completed".
  - Expected: show what the API returned: counts of imported and skipped items (for example `purchases_skipped` from the Amazon import) and every entry in `errors`. Print any numeric field whose name contains `imported`, `created`, `skipped` or `updated`, with a readable label, so it works for all 4 import types.
  - Done when: importing a CSV with a bad row shows how many rows were imported, how many were skipped, and why.

- [ ] **13. Safe retailer and brand deletion**
  - Problem: deleting a retailer or brand that purchases still use just attempts the delete.
  - Expected: before deleting, count purchases using it (`GET /api/purchases/?retailer_id=…&limit=1` or `?brand_id=…&limit=1`, read `total`). If it's more than 0, say "Used by N purchases" and don't allow the delete. Also show that usage count next to each retailer and brand in Settings.
  - Done when: a retailer used by purchases can't be deleted and the reason is shown.

## Nice to have

- [ ] **14. Keyboard shortcuts**
  - Expected: `/` focuses search on Purchases, `n` opens "Add purchase", `Esc` closes dialogs and the viewer. Ignore shortcuts while typing in an input. Show them in a small "Keyboard shortcuts" section in Settings.

- [ ] **15. Copy link to a purchase**
  - Expected: a "Copy link" button on the detail page that copies the full URL (`…/#/purchases/{id}`) to the clipboard and confirms with a short message.
