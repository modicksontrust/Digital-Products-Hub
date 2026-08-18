---
name: Sell section architecture
description: How the Sell section (Products, Discount Codes) is wired up — DB, API, frontend
---

## What was built

A full **Sell** section added to PokiPoki:

### DB (lib/db/src/schema/products.ts)
- Added 20 new columns to `products` table: `productSaleType`, `pricingMode`, `currency`, `saleShortDescription`, `saleFullDescription`, `saleTheme`, `deliveryMethod`, `deliveryUrl`, `deliveryWhatsappNumber`, `deliveryWhatsappMessage`, `deliveryAccessKeys`, `deliveryDuration`, `deliveryDurationDays`, `limitedQuantityEnabled`, `limitedQuantity`, `earlyBirdEnabled`, `testimonials`, `contractEnabled`, `orderCount`, `showOnBio`
- Added `discount_codes` table with owner, product ref, code, discountType (percent|fixed_cents), discountValue, maxUses, useCount, active, expiresAt

### API (artifacts/api-server/src/routes/)
- `products.ts`: Added `PUT /products/:productId/sell-settings` — saves all sell settings + generates slug
- `sell.ts`: New file — CRUD for `GET/POST/PATCH/DELETE /sell/discounts`
- `routes/index.ts`: Mounts `sellRouter`

### Zod schemas (lib/api-zod/src/manual.ts)
- `UpdateSellSettingsBody`, `SellSettingsFields`
- `DiscountCodeItem`, `GetDiscountCodesResponse`, `CreateDiscountCodeBody`, `UpdateDiscountCodeBody`

### React hooks (lib/api-client-react/src/manual.ts)
- `useUpdateSellSettings` — PUT sell settings
- `useGetDiscountCodes`, `useCreateDiscountCode`, `useUpdateDiscountCode`, `useDeleteDiscountCode`

### Frontend pages
- `SellProducts.tsx` → `/sell/products` — card grid of all eBooks for selling; "Edit" → setup wizard
- `SellProductSetup.tsx` → `/sell/products/:productId/setup` — 6-step wizard (Type→Details→Pricing→Delivery→Extras→Review)
- `SellDiscounts.tsx` → `/sell/discounts` — discount codes CRUD table

### Navigation (AppLayout.tsx)
- SELL section: Products (`/sell/products`) + Discount Codes (`/sell/discounts`)

**Why:**
- Payment/checkout not yet wired (SalesPage still says "coming soon") — Stripe is a future task
