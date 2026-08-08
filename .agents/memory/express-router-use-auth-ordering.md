---
name: Express sub-router auth ordering
description: Why a public/unauthenticated route can 401 even though it has no requireAuth middleware of its own.
---

When a feature router does `router.use(requireAuth, ...)` with no path prefix (common pattern in this codebase, e.g. `artifacts/api-server/src/routes/products.ts`), that `requireAuth` runs for **every** request that reaches that router — not just requests matching one of its declared routes — because `mainRouter.use(subRouter)` mounts the sub-router at `/` and Express walks the whole middleware chain of a router before falling through.

**Why:** a new unauthenticated router mounted *after* such a router in `routes/index.ts` never gets a chance to handle the request; the earlier router's blanket `requireAuth` already sent a 401 response. This caused a real bug where a new `/public/sales-page/:slug` route 401'd even though its own handler had no auth check.

**How to apply:** any new public/unauthenticated router must be `router.use(...)`'d in `artifacts/api-server/src/routes/index.ts` *before* routers that apply an unconditional `router.use(requireAuth, ...)` (currently products, generation, admin, covers). Check this file's registration order whenever adding a public endpoint.
