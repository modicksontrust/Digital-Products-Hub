# PokiPoki

Internal production studio where an invite-only team creates, reviews, and exports AI-generated eBooks and lead magnets.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm --filter @workspace/digiproducts run dev` — run the web frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, Anthropic AI integration vars (managed by Replit)
- Seed admin login: `admin@digiproducts.local` / `admin1234` (created automatically on first boot if missing)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + express-session (Postgres store) + bcryptjs
- DB: PostgreSQL + Drizzle ORM
- AI: Anthropic (claude-sonnet-4-6) via Replit AI Integrations (`lib/integrations-anthropic-ai`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec); frontend uses generated hooks in `lib/api-client-react`
- Frontend: React + Vite + Tailwind v4 + wouter + TanStack Query
- PDF export: pdfkit (externalized in esbuild build)

## Where things live

- DB schema: `lib/db/src/schema/` (users, learn, products, credits)
- API spec: `lib/api-spec/openapi.yml` → generated zod in `lib/api-zod`, hooks in `lib/api-client-react`
- Server: `artifacts/api-server/src/` — `routes/` (auth, learn, dashboard, products, generation, admin), `lib/` (permissions, session, helpers, jobs, ai, pdf, serialize), `middlewares/auth.ts`, `seed.ts`
- Frontend: `artifacts/digiproducts/src/` — pages per route, `components/layout/AppLayout.tsx` (sidebar shell), design tokens in `src/index.css`
- PDF/MD exports written to `artifacts/api-server/data/exports/`

## Architecture decisions

- Session auth (cookie `digiproducts.sid`) with role→permission map in `lib/permissions.ts`; 5 roles: admin, manager, creator, uploader, marketer
- Onboarding gate enforced server-side: `requireOnboarding` middleware returns 403 `ONBOARDING_REQUIRED` until required Learn lessons complete (admins/exempt users bypass)
- AI generation jobs are DB rows (`generation_jobs`) run fire-and-forget in-process; client polls `GET /api/jobs/:id`
- Credits: every AI action charges via `spendCredits` (row-locked transaction, 402 on insufficient balance); admins bypass charges
- Creators only see their own products (404, not 403, for others')

## Product

- Public landing page + invite-only login, password reset, access requests
- Gated Learn module (video lessons, sequential unlock, onboarding completion)
- AI eBook wizard (outline → per-chapter generation → rewrite actions), lead magnet generator, sales copy generator
- Product library with review workflow (submit → approve/request changes), comments, PDF/Markdown export with brand kit
- Admin console: users, invitations, access requests, curriculum, credit costs/reports, brand kit, settings, audit log

## User preferences

- Green design system per PRD §8 ("Forest & Lime"); no emojis in the UI

## Gotchas

- connect-pg-simple `createTableIfMissing` breaks under esbuild bundling — the session table is created by `ensureSessionTable()` at boot instead
- `pdfkit`/`fontkit` must stay in the esbuild `external` list (font `.afm` data can't be bundled)
- Orval emits zod v4 syntax; codegen script sed-rewrites imports to `zod/v4` — don't remove that step
- Gradient text utilities need `background-image:` (not the `background:` shorthand) or `bg-clip-text` gets reset

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
