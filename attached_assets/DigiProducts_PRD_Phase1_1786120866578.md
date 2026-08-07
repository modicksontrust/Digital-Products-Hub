# DigiProducts — Product Requirements Document
## Phase 1: Creation & Learning Platform

| Field | Value |
|---|---|
| Product name | **DigiProducts** |
| Document version | 2.0 |
| Date | 7 August 2026 |
| Phase | 1 of 2 — Creation & Learning |
| Stack | **Laravel 11 + Vue 3 (Inertia.js)** |
| Build environment | Replit Agent (development) |
| Reference product | vardlinks.co — same content and layout, green colour variation |

---

## 1. Executive summary

DigiProducts is a single-company (single-tenant) platform where an internal team creates AI-generated digital products — eBooks, PDF guides and lead magnets — from a central dashboard.

The reference product bundles two things: a **creator side** (AI eBook/PDF generator, lead magnets) and a **distribution side** (link-in-bio, storefront, checkout, wallet, payouts, affiliates, ad pixels).

This PRD covers **Phase 1 only: the creator side plus a mandatory Learn/onboarding layer.** Nothing in Phase 1 sells anything or takes money.

The one meaningful addition over the reference product is the **Learn module**: a gated onboarding sequence of videos that every non-admin user must complete before the rest of the platform unlocks.

### Three pillars of Phase 1
1. **Public landing page** — marketing site explaining the product, routing visitors to log in or request access.
2. **Learn (onboarding gate)** — a short video curriculum. The platform stays locked until it's completed. Admins bypass.
3. **Creation dashboard** — AI eBook/PDF generator, product library, asset management, role-based access.

### Visual direction
Content and layout follow vardlinks.co closely. The colour system is a **green variation** of the reference's warm crimson→amber gradient language: deep pine → emerald → lime, with a gold accent retained for balance. Full tokens in §8.

---

## 2. Goals and success metrics

### Business goals
- Give one company a self-owned tool for producing digital products at volume without per-seat SaaS fees.
- Standardise output quality through templates and an enforced onboarding curriculum.
- Build the foundation (auth, roles, product records, asset storage) that Phase 2's storefront plugs into without a refactor.

### Success metrics — measured 30 days post-launch
| Metric | Target |
|---|---|
| Onboarding completion rate for invited users | ≥ 90% within 48h of first login |
| Time from "New eBook" click to downloadable PDF | ≤ 10 minutes |
| AI generation job success rate | ≥ 95% |
| Products created per active creator per week | ≥ 3 |
| Failed generations requiring manual restart | ≤ 5% |

---

## 3. Scope

### 3.1 In scope — Phase 1

| # | Feature | Priority |
|---|---|---|
| F1 | Public landing page | Must |
| F2 | Authentication (invite-only) & session management | Must |
| F3 | Roles & permissions (5 roles) | Must |
| F4 | Learn module + onboarding gate | Must |
| F5 | Main dashboard | Must |
| F6 | AI eBook / PDF Guide Generator | Must |
| F7 | Product Library (drafts, versions, exports) | Must |
| F8 | Lead Magnet generator | Should |
| F9 | Asset & media management | Must |
| F10 | AI credits / usage quota system | Must |
| F11 | Admin console | Must |
| F12 | Brand kit | Should |
| F13 | Sales page copy draft generator (stored, not published) | Should |
| F14 | Review / approval workflow | Should |
| F15 | Activity log & light analytics | Could |
| F16 | In-app notifications | Could |

### 3.2 Out of scope — Phase 1
Link-in-bio pages · public product pages · checkout · payment gateways (Paystack/Flutterwave/Stripe) · wallet & payouts · refunds · order management · affiliate program · discount codes · smart bundles · buyer accounts · email marketing sends · Meta/Google/TikTok pixels · online course builder · multi-tenant support.

**Architectural instruction:** although out of scope, the schema in §11 must leave room (e.g. `products` carries `slug`, `price_cents`, `visibility` columns unused in Phase 1). Do not paint into a corner.

---

## 4. Personas and roles

DigiProducts is **single-tenant**: one company owns it, one `organization` record exists, all users belong to it. There is **no public sign-up** — accounts are created by invitation only.

### 4.1 Roles

| Role | Who they are | Core job |
|---|---|---|
| **Admin (Owner)** | Business owner / technical lead | Full control. Manages users, lessons, credits, brand kit, settings. Bypasses the onboarding gate. |
| **Manager** | Team lead / operations | Sees all products, reviews and approves, assigns work, views team analytics, grants credits up to a cap. Cannot manage users or lessons. |
| **Product Creator** | Content producer | Creates and generates eBooks/lead magnets, edits chapters, exports PDFs, submits for review. Sees own products. |
| **Product Uploader** | Assistant / VA | Uploads pre-existing PDFs and assets, fills metadata. AI generation off by default (configurable). |
| **Marketer** | Copy / growth | Read-only on products. Creates and edits sales page copy drafts and lead magnets. Views analytics. |

### 4.2 Permission matrix

Legend: ✅ full · 🔸 own records only · 👁 read-only · ❌ none

| Capability | Admin | Manager | Creator | Uploader | Marketer |
|---|:--:|:--:|:--:|:--:|:--:|
| Access platform without completing Learn | ✅ | ❌ | ❌ | ❌ | ❌ |
| View dashboard | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create product (AI generation) | ✅ | ✅ | ✅ | ⚙️ configurable | ❌ |
| Upload existing PDF as product | ✅ | ✅ | ✅ | ✅ | ❌ |
| Edit product content | ✅ | ✅ | 🔸 | 🔸 | ❌ |
| View all products | ✅ | ✅ | 🔸 | 🔸 | 👁 |
| Delete / archive product | ✅ | ✅ | 🔸 archive only | ❌ | ❌ |
| Submit for review | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve / reject product | ✅ | ✅ | ❌ | ❌ | ❌ |
| Generate & edit sales page copy | ✅ | ✅ | ✅ | ❌ | ✅ |
| Manage lead magnets | ✅ | ✅ | ✅ | ❌ | ✅ |
| Upload / manage assets | ✅ | ✅ | 🔸 | ✅ | 🔸 |
| View own credit balance | ✅ | ✅ | ✅ | ✅ | ✅ |
| Grant credits to others | ✅ | ⚙️ up to cap | ❌ | ❌ | ❌ |
| Invite / deactivate users | ✅ | ❌ | ❌ | ❌ | ❌ |
| Change user roles | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage Learn lessons | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage brand kit & templates | ✅ | 👁 | 👁 | 👁 | 👁 |
| View audit log | ✅ | 👁 | ❌ | ❌ | ❌ |
| Platform settings | ✅ | ❌ | ❌ | ❌ | ❌ |

**Implementation requirement:** permissions are enforced **server-side via Laravel Policies and Gates on every route**, not by hiding UI. A hidden button is not a permission. Vue receives an `auth.can` object from the Inertia shared props to drive rendering, but that object is derived from the same Gate definitions — one source of truth.

---

## 5. Core user flows

### 5.1 First-time user (non-admin)
```
Admin sends invite → user receives email with signed token link
→ sets password, accepts terms
→ lands on /learn (forced redirect; every other route blocked)
→ roadmap-style lesson list: Step 0, Step 1, Step 2...
→ watches each required lesson; progress saved continuously
→ downloads lesson resources
→ completes final required lesson
→ celebration screen → "Go to Dashboard"
→ onboarding_completed_at set → full platform unlocks
```

### 5.2 Returning creator — making an eBook
```
Dashboard → "Create eBook"
→ Step 1 Brief: topic, audience, tone, chapter count, depth, language
→ Step 2 Outline: AI generates → user edits, reorders, adds/removes chapters
→ Step 3 Generate: queued jobs write chapters, live progress
→ Step 4 Editor: edit any chapter, regenerate individual chapters
→ Step 5 Cover: template, title, colours, optional AI image
→ Step 6 Preview → Export PDF → saved to library + download
→ Optional: generate sales page copy (stored for Phase 2)
→ Submit for review
```

### 5.3 Admin managing the curriculum
```
Admin → Learn Curriculum → create module → add lessons
(title, description, video, duration, resources)
→ toggle "Required for onboarding" per lesson → drag to reorder → publish
→ optionally reset onboarding for a user, or mark them exempt
```

### 5.4 Approval flow
```
Creator: draft → Submit for review → in_review
Manager/Admin: Review Queue → Approve (approved) or Request changes (changes_requested + comment)
Approved products are the ones Phase 2 will be allowed to publish.
```

---

## 6. Feature specifications

### F1 — Public landing page

Public-facing at `/`. The only unauthenticated page besides login and invite acceptance.

**Requirements**
- Sections: hero (headline, subhead, primary CTA, dashboard screenshot), value props (3–4 cards), "How it works" (3 steps), feature grid mirroring dashboard capabilities, FAQ, footer with legal links.
- Primary CTA **Log in**. Secondary CTA **Request access** → form (name, email, role requested, message) creating an `access_request` and notifying admins. It does **not** create an account.
- Server-rendered Blade or an Inertia page — must be crawlable. Meta title/description, Open Graph image, `sitemap.xml`, `robots.txt`.
- Responsive 360px → 1920px. Lighthouse mobile performance ≥ 85.
- Copy managed in a config file or an admin-editable settings record — no CMS in Phase 1.

**Acceptance criteria**
- Anonymous visitor reaches `/`; every section renders without auth errors.
- Access request stores the record and shows confirmation; duplicate email within 24h silently deduped.
- Logged-in visitor sees a "Go to dashboard" link rather than a forced redirect.

---

### F2 — Authentication

**Requirements**
- **Invite-only.** No registration route exists anywhere in the app — remove it from Breeze/Fortify scaffolding.
- Laravel Fortify (or Breeze Inertia+Vue) with bcrypt (cost ≥ 12) or argon2id.
- Invitation flow: admin enters email + role → `invitation` record with hashed single-use token, 7-day expiry → mailed signed URL → acceptance sets password and creates the user.
- Login, logout, forgot password, reset password (1-hour token expiry, single use).
- Sessions: database driver, HTTP-only + Secure + SameSite=Lax cookies, 7-day rolling expiry.
- Rate limiting via Laravel's `RateLimiter`: 5 failed logins per email per 15 min then 15-min lockout; 10 attempts per IP per minute.
- Optional (Should): TOTP 2FA for Admin, via Fortify's built-in support.
- Record `last_login_at`, `last_login_ip`.
- Deactivated users blocked immediately and all their sessions invalidated.

**Acceptance criteria**
- Expired or used invite token shows a clear error and cannot create an account.
- Password reset invalidates all existing sessions for that user.
- Unauthenticated access to any protected route redirects to `/login` preserving the intended URL.

---

### F3 — Roles & permissions

Implements §4.2.

**Requirements**
- Single `role` column on `users`, backed by a PHP enum `UserRole`.
- A central `PermissionMap` consumed by Laravel Gates; Policies for `Product`, `Asset`, `Lesson`, `User`.
- Ownership checks: creators and uploaders see only their own products unless the ability grants "any".
- `spatie/laravel-permission` is optional — with five fixed roles, native Gates and Policies are simpler and faster. Add the package only if the client wants custom roles later.
- Every role change written to the audit log with actor, target, before/after.
- The system blocks demoting or deactivating the last active Admin.

**Acceptance criteria**
- A Marketer POSTing to the generation endpoint directly receives 403.
- A Creator requesting another creator's product receives 404 (not 403 — do not leak existence).

---

### F4 — Learn module & onboarding gate ⭐

Every non-admin user must complete a short video curriculum before any creation feature unlocks. Visually modelled on the reference course UI: stepped roadmap, lesson player, "Completed" badges, "Download Resources", and an "Up Next" card.

#### 4a. Curriculum structure
- **Module** → ordered **Lessons**.
- Lesson fields: title, description, video provider + ID, duration (seconds), order index, `is_required_for_onboarding`, resources (0–n), optional body text under the player.
- Onboarding completes when all lessons flagged required are complete.
- Non-required lessons form an ongoing **Academy** library available after onboarding.

#### 4b. The gate
- Middleware `EnsureOnboardingComplete` registered on the authenticated route group. If `role !== admin` and `onboarding_completed_at` is null and `onboarding_exempt` is false → redirect to `/learn`. Excluded: `learn.*`, `logout`, `account.*`, static assets.
- The same check runs on API/AJAX routes, returning `403 ONBOARDING_REQUIRED`.
- Sidebar renders locked items with a padlock and tooltip "Complete onboarding to unlock."
- Admins bypass entirely; admins can also mark any user exempt.
- If a new required lesson is added after users have finished, existing users are **not** re-locked by default — they get an in-app "New lesson available" prompt. An explicit admin action "Re-lock users until new lessons complete" exists as an opt-in.

#### 4c. Player and progress
- Video hosting: **Bunny Stream or Mux recommended** (signed playback URLs, real progress events). MVP fallback: unlisted Vimeo/YouTube embed.
- Vue player component posts progress every 10 seconds (`watched_seconds`, `furthest_position`); debounced, and flushed on `beforeunload`.
- Auto-complete at **≥ 90% watched**. Manual "Mark as complete" only if the admin enabled `allow_manual_complete` for that lesson.
- Seeking forward past unwatched content does not advance `furthest_position` when `enforce_watch_order` is on.
- Sequential unlock when `sequential_unlock` is on (platform setting, default on).
- Optional per-lesson quiz (Could): 1–5 multiple choice, configurable pass mark, must pass to complete.

#### 4d. UI
- `/learn` — roadmap: progress bar ("Step 2 of 5 · 40% complete"), lesson cards with state (locked / in progress / completed), duration.
- `/learn/{lesson}` — player page: video, title, "Lesson N", completion badge, **Download Resources (count)**, optional notes area, and an **Up Next** card with the next lesson title, description and "Proceed to next step".
- Completion screen: celebration, summary of what was covered, prominent "Go to Dashboard".

**Acceptance criteria**
- A newly invited Creator is redirected to `/learn` on first login and cannot reach `/dashboard`, `/products` or `/create` by URL.
- Closing the browser mid-lesson and returning resumes at the saved position.
- After the last required lesson, `onboarding_completed_at` is set once, the celebration shows, and nav unlocks on next page load without re-login.
- Admin accounts never see the gate.

---

### F5 — Main dashboard

`/dashboard`, mirroring the reference layout.

**Requirements**
- Header: "Welcome back, {name}", role badge, credit chip, search, notification bell — on the green hero gradient (§8).
- **Start Creating** row: two large cards — "eBook & PDF Generator" (CTA "Create eBook") and "Lead Magnet Generator" (CTA "Create Lead Magnet"). Cards render locked for roles without permission.
- **Quick Stats** tiles — Phase 1 versions, no money metrics: Products Created · Drafts In Progress · Awaiting Review · Approved · Total PDF Exports · AI Credits Remaining.
- **Explore** section: grouped shortcut cards (Create / Learn / Admin) in the reference's grid style.
- **Your Products**: last 5 with cover thumbnail, title, status pill, quick actions (Open, Download PDF, Duplicate).
- **Recent activity**: last 10 audit events visible to that role.
- **Credit history** collapsible panel: date, action, delta, balance after.
- Empty states everywhere, each with a helpful CTA.
- Wallet, sales and payout tiles from the reference are **omitted entirely** in Phase 1 — not greyed out.

**Acceptance criteria**
- Loads in < 1.5s warm with 100 products in the library.
- Stats respect role scope: a Creator sees own counts, a Manager sees org-wide.

---

### F6 — AI eBook / PDF Guide Generator ⭐

The centrepiece: a six-step wizard producing a designed, downloadable PDF.

#### Step 1 — Brief
Inputs: title (or "let AI suggest"), topic/description (required, 20–1000 chars), target audience, tone (professional / conversational / authoritative / friendly / bold), product type (eBook / guide / checklist / workbook), chapter count (3–20), depth (short ≈500 w/chapter · standard ≈900 · deep ≈1500), language, optional key points, optional CTA to weave into the conclusion.

Estimated credit cost shown before proceeding.

#### Step 2 — Outline generation
- AI returns book title, subtitle, and chapters each with a 1–2 line summary and 3–5 subpoints.
- User inline-edits any field, drags to reorder, deletes, adds a chapter manually, or regenerates (costs credits again).
- Outline persisted; the user can leave and return.

#### Step 3 — Content generation (queued)
- **One queued job per chapter**, dispatched as a `Bus::batch` so progress and failures are trackable natively.
- Live progress: "Writing chapter 4 of 10…" with per-chapter status. Polling every 2s, or Laravel Reverb/Echo broadcasting if real-time is preferred.
- A single failed chapter does not fail the book — it's marked `failed` with a Retry action.
- The user may navigate away; the batch continues and an in-app notification fires on completion.
- Consistency: each chapter prompt receives book title, full outline, summaries (not full text) of prior chapters, and style directives, so chapters don't repeat one another.

#### Step 4 — Editor
- Chapter list sidebar plus a TipTap (Vue 3) markdown-backed editor.
- Per-chapter actions: Regenerate · Expand · Shorten · Rewrite in another tone · Add examples.
- Global actions: generate introduction, conclusion, auto table of contents, about-the-author, disclaimer page.
- Word count per chapter and total. Autosave every 3s with a saved indicator.
- Version history: every generation and every manual save older than 5 minutes creates a restorable snapshot (keep last 20).

#### Step 5 — Cover designer
- 6–10 built-in templates (typographic, gradient, image-backed).
- Editable: title, subtitle, author, colour palette (defaults from Brand Kit), font pairing, logo toggle.
- Background: solid/gradient · uploaded image · stock search (Should) · AI-generated image (Should, extra credits).
- Live preview at 1600×2560.

#### Step 6 — Assemble, preview, export
- Composition: cover → title page → copyright/disclaimer → auto TOC with page numbers → chapters → conclusion → CTA/back page.
- 3–5 interior typographic themes; A4 / US Letter / 6×9"; page numbers, running headers, chapter title pages.
- In-browser preview before export.
- Export writes a PDF to object storage, links it to the product, and serves it via a **temporary signed URL** (15 min).
- Also offer `.md` and `.docx` export (Should).
- Re-export creates a new version; prior versions retained.

**Acceptance criteria**
- A 10-chapter standard-depth book completes in ≤ 8 minutes and produces a valid PDF opening in Chrome, Acrobat and macOS Preview.
- Killing the tab during Step 3 does not corrupt the batch; returning shows correct progress.
- Credits debited per successful unit and auto-refunded for failed units.
- Concurrent generations by two users do not block each other.

---

### F7 — Product Library

- `/products`: cover thumbnail, title, type, status pill, owner, word count, dates, actions.
- Filters: type, status, owner, date range. Search on title/topic. Sort by updated/created/title.
- Grid and table view toggle.
- Statuses: `draft · generating · ready · in_review · changes_requested · approved · archived`.
- Bulk actions (Admin/Manager): archive, change owner, export.
- Detail page: metadata, chapter list, export versions with download links, sales copy draft, activity timeline, comments.
- **Duplicate** clones outline and chapters into a new draft — the fast path for re-skinning an existing product.
- Soft delete only (`SoftDeletes`); archived products recoverable by Admin for 30 days.

---

### F8 — Lead Magnet generator

A trimmed F6 for 3–10 page assets.

- Formats: checklist · cheat sheet · one-page guide · template/worksheet · swipe file.
- Three steps only: Brief → Generate (single job) → Design & export.
- Same cover and interior engine with compact templates.
- Marketers have full create/edit rights here, unlike eBooks.

---

### F9 — Asset & media management

- Laravel Filesystem with the S3 driver (S3, Cloudflare R2 or DigitalOcean Spaces) for generated PDFs, covers, uploads, lesson resources. Video lives with the external provider.
- Uploads: images (jpg/png/webp/svg ≤ 10 MB), documents (pdf/docx ≤ 50 MB).
- Server-side validation of MIME type **and magic bytes** — never trust the extension.
- Images resized into web and print variants on upload via a queued job (Intervention Image); thumbnails generated.
- All reads via `Storage::temporaryUrl()`. No public buckets.
- `/assets` library with grid, filters and a usage indicator ("used in 2 products") to prevent accidental deletion.
- Org storage quota, configurable; warning at 80%.

---

### F10 — AI credits / usage quota

An internal cost-control mechanism, not a purchase.

- Each user has `credits_balance`. Each AI operation has an admin-configurable cost.
- Suggested defaults: outline 1 · chapter 1 · full 10-chapter book ≈ 11 · lead magnet 3 · AI cover image 2 · sales copy 2 · chapter rewrite 1.
- Every change writes a `credit_transaction` (delta, reason, job reference, balance after). The balance is always reconcilable against the ledger.
- Pre-flight check inside a DB transaction with row locking, so parallel jobs can't overdraw. Blocked operations show a clear message plus "Request credits", which notifies the admin.
- Admin grants to anyone; Manager grants up to a configurable weekly cap.
- Optional monthly auto-refill per role via a scheduled command.
- Admin report: spend by user, by operation type, and estimated real API cost (credits × configured cost-per-credit).

---

### F11 — Admin console

`/admin`, Admin-only (Manager read-only on some tabs).

- **Users:** list, invite, resend invite, change role, deactivate/reactivate, reset onboarding, set exempt, adjust credits, force logout.
- **Access requests:** queue from the landing page → convert to invite or dismiss.
- **Learn curriculum:** CRUD modules and lessons, drag-reorder, toggle required, upload resources, publish/unpublish, "preview as new user".
- **Onboarding progress:** users × lessons matrix, CSV export.
- **Credits:** cost table editor, bulk grant, spend report.
- **Brand kit:** logo, palette, fonts, default author, footer/legal text, default disclaimer.
- **Templates:** enable/disable cover and interior templates, set defaults.
- **AI settings:** model per task, max tokens, temperature, system prompt overrides per product type.
- **Platform settings:** sequential unlock, manual complete, approval workflow on/off, storage quota, session length.
- **Audit log:** filterable, exportable.

---

### F12 — Brand kit
Org-level record (logo light/dark, primary/secondary/accent colours, heading + body font pairing, default author, footer text) pre-populating every cover and interior theme. Per-product override allowed.

### F13 — Sales page copy draft
AI-generated copy stored against the product: headline, subheadline, 5–8 benefit bullets, "who it's for", FAQ (3–5), CTA text, suggested price band. Editable, exportable as markdown. **Not rendered publicly in Phase 1** — it's the payload Phase 2's sales page consumes.

### F14 — Review workflow
Toggleable in settings; states per §5.4. Threaded comments at product and chapter level. Notifications on submit, approve and changes-requested.

### F15 — Activity log & analytics
Audit rows for login, invite, role change, product create/generate/export/delete, lesson completion, credit change, settings change. Light charts: products created over time, exports over time, credits consumed, onboarding funnel (invited → activated → completed).

### F16 — Notifications
Laravel database notifications surfaced in a bell with unread count: generation complete, generation failed, review requested, review decision, credits granted/low, new lesson published. Email only for invites, password resets and review decisions — keep volume low.

---

## 7. Information architecture

```
Public
  /                          Landing page
  /login
  /forgot-password
  /reset-password/{token}
  /invite/{token}
  /legal/terms, /legal/privacy

Authenticated — gated by onboarding
  /learn                     Roadmap
  /learn/{lesson}            Player
  /learn/complete            Celebration
  /account                   Profile, password, notification prefs
  /logout

Authenticated — unlocked after onboarding
  /dashboard
  /create/ebook              Wizard (steps 1–6)
  /create/lead-magnet
  /products                  Library
  /products/{product}        Detail
  /products/{product}/edit   Chapter editor
  /products/{product}/cover
  /products/{product}/sales-copy
  /assets
  /academy                   Non-required lessons
  /review                    Review queue (Manager/Admin)
  /admin/*                   Admin console (Admin)
```

### Sidebar navigation
```
  Dashboard
CREATE
  eBook / PDF Generator
  Lead Magnet
  My Products
LEARN
  Onboarding        (hidden once complete)
  Academy
TEAM              (Manager/Admin)
  Review Queue
  Team Products
ADMIN             (Admin)
  Users
  Learn Curriculum
  Credits
  Brand Kit
  Settings
  Audit Log
```
Locked items render with a padlock for gated users.

---

## 8. Visual design system — green variation

The reference product runs a warm crimson→amber gradient across a dark maroon sidebar. DigiProducts keeps that structure exactly — same card layouts, same generous radii, same gradient hero, same colourful stat tiles — and swaps the hue family to green, retaining a gold accent so the palette doesn't flatten into monochrome.

### 8.1 Brand palette

```css
/* Core green ramp */
--brand-950: #041A13;   /* deepest pine — page chrome on dark */
--brand-900: #06251C;   /* sidebar top */
--brand-800: #0B3B2E;   /* sidebar base, hero gradient start */
--brand-700: #10553F;
--brand-600: #167A57;
--brand-500: #1FA06B;   /* primary green — buttons, active states */
--brand-400: #4CBE83;
--brand-300: #86D9A4;
--brand-200: #BDECCF;
--brand-100: #E4F7EC;

/* Lime accent — the "warm end" of the gradient */
--lime-600: #7CB518;
--lime-500: #A3D939;
--lime-400: #BFE85C;
--lime-300: #D6F292;

/* Gold — credits, PRO badge, premium chips (carried over from reference) */
--gold-500: #D9A02B;
--gold-400: #E3B341;
--gold-300: #F0CE7A;

/* Neutrals */
--ink-900: #0C1512;  --ink-700: #2A3A34;  --ink-500: #5A6B64;
--ink-300: #A8B5AF;  --ink-100: #E8EDEA;  --paper: #FAFCFB;

/* Semantic */
--success: #1FA06B;  --warning: #E3B341;
--danger:  #D64545;  --info:    #2E8B9E;
```

### 8.2 Signature gradients

```css
/* Dashboard hero — the headline element, mirrors the reference's maroon→gold sweep */
--grad-hero: linear-gradient(100deg, #0B3B2E 0%, #167A57 45%, #A3D939 100%);

/* Sidebar — vertical, near-black pine */
--grad-sidebar: linear-gradient(180deg, #06251C 0%, #0B3B2E 100%);

/* "Create" primary card (replaces the reference's crimson→amber) */
--grad-create: linear-gradient(135deg, #10553F 0%, #1FA06B 55%, #A3D939 100%);

/* "Secondary" dark card (replaces the reference's near-black → maroon) */
--grad-dark: linear-gradient(135deg, #041A13 0%, #0B3B2E 60%, #167A57 100%);
```

### 8.3 Stat tile colours
The reference uses six distinct saturated tiles. Keep the variety, biased green:

| Tile | Gradient |
|---|---|
| Products Created | `#1FA06B → #4CBE83` emerald |
| Drafts In Progress | `#2E8B9E → #57B3C4` teal |
| Awaiting Review | `#D9A02B → #E3B341` gold |
| Approved | `#7CB518 → #A3D939` lime |
| PDF Exports | `#167A57 → #1FA06B` deep emerald |
| AI Credits | `#0B3B2E → #10553F` pine |

### 8.4 Typography, shape, motion
- **Headings:** Plus Jakarta Sans (600/700) — geometric, close to the reference's display face. **Body:** Inter (400/500). Both via Bunny Fonts or self-hosted for GDPR-friendliness.
- Scale: 36/28/22/18/16/14/12px. Line height 1.5 body, 1.2 headings.
- Radii: cards 20px, buttons 12px, chips/pills 999px, inputs 10px.
- Shadows: soft and low-contrast — `0 1px 2px rgba(6,37,28,.06), 0 8px 24px rgba(6,37,28,.08)`.
- Spacing on a 4px grid; card padding 24px desktop, 16px mobile.
- Motion: 150–200ms ease-out on hover/press; skeleton loaders rather than spinners for content areas.

### 8.5 PDF themes
Product covers and interiors default to the brand palette but are **independent** of the app chrome — the client will produce books on many topics, so cover templates must offer non-green palettes too. Brand Kit sets the default; per-product override is always available.

### 8.6 Implementation
Define all tokens as CSS custom properties in a single `resources/css/tokens.css`, then map them into `tailwind.config.js` (`colors.brand.*`, `colors.lime.*`, `colors.gold.*`). No hardcoded hex values in Vue components. Dark mode is not required in Phase 1, but token structure should not preclude it.

---

## 9. Non-functional requirements

**Performance**
- p95 page load < 2s; server response p95 < 500ms excluding AI calls.
- No HTTP request holds open longer than 30s — all AI work is queued.
- Library paginates at 25; virtualised grid beyond 100.
- Eager-load relations to avoid N+1 (enable `Model::preventLazyLoading()` in non-production).

**Security**
- Every route protected by Gate/Policy checks. Ownership verified on every single-resource read.
- Eloquent/query builder only — no raw string-concatenated SQL.
- Form Request validation on every write endpoint.
- CSRF on all state-changing requests (Laravel default); strict CORS.
- Secrets in `.env` / Replit Secrets — never committed, never exposed to the Vue bundle.
- Temporary signed URLs for every file read; no public buckets.
- Rate limits: auth (§F2), AI generation 20 jobs/user/hour, uploads 50/user/hour.
- Sanitise AI output before rendering — treat model output as untrusted input; escape by default in Vue and sanitise any `v-html`.
- Audit trail append-only.
- Run `composer audit` and `npm audit` in CI.

**Reliability**
- Queued jobs: `tries = 3`, exponential backoff, `failed_jobs` monitored.
- Idempotency keys on generation endpoints to survive double-clicks and retries.
- Daily automated database backup, 7-day retention minimum (`spatie/laravel-backup`).
- Graceful degradation: if the AI provider is down, show a clear banner rather than an endless spinner.

**Usability & accessibility**
- Responsive 360px → 1920px. Dashboard and Learn player must work well on mobile.
- WCAG 2.1 AA: keyboard navigable, visible focus rings, 4.5:1 contrast, alt text, ARIA labels on icon-only buttons. **Check the lime-on-white combinations specifically** — `#A3D939` fails contrast on white for text and must only be used as a background or large decorative element.
- Every destructive action confirmed. Every async action shows a loading state. Every error says what to do next.

**Compliance**
- Terms and Privacy pages before launch.
- Personal data limited to name, email, IP, activity. Admin can export or delete a user's data.

---

## 10. Technical stack

| Layer | Choice | Note |
|---|---|---|
| Backend | **Laravel 11 (PHP 8.3)** | |
| Frontend | **Vue 3 (Composition API) + Inertia.js** | Single deployable, no separate SPA/API split |
| Build | Vite | Laravel's default |
| Styling | Tailwind CSS + design tokens (§8) | |
| UI components | shadcn-vue or Headless UI + custom | Match the reference's card-heavy look |
| State | Inertia props + Pinia for wizard/editor state only | Don't over-store |
| Database | **MySQL 8** or **PostgreSQL 15** | Either is fine; Postgres preferred for JSON querying |
| Auth | Laravel Fortify or Breeze (Inertia + Vue) | Registration route removed |
| Authorisation | Native Gates + Policies | `spatie/laravel-permission` optional |
| Queue | **Laravel Queues** — database driver, or Redis if available | `Bus::batch` for chapter generation |
| Queue monitoring | Laravel Horizon (Redis only) | Optional but valuable |
| Realtime | Polling (default) or Laravel Reverb + Echo | Start with polling |
| File storage | Laravel Filesystem, S3 driver → S3 / R2 / Spaces | `temporaryUrl()` for reads |
| AI | Anthropic Claude API via Laravel HTTP client | Model configurable per task |
| PDF | **Browsershot (Spatie, Puppeteer)** primary; **DomPDF** fallback | See §10.2 |
| Rich text | TipTap Vue 3 | Markdown-backed |
| Images | Intervention Image | Resize/thumbnail on queue |
| Email | Laravel Mail + Resend or Postmark | |
| Video | Bunny Stream or Mux | Signed playback + progress events |
| Charts | ApexCharts or Chart.js via vue-chartjs | |
| Testing | Pest (feature + unit), Laravel Dusk for critical flows | |

### 10.1 Queue workers — the critical infrastructure decision

A ten-chapter book is roughly eight minutes of AI work. That **cannot** run inside an HTTP request. Laravel's queue solves this cleanly, but it requires a **persistent process running `php artisan queue:work`**, plus `php artisan schedule:run` every minute for scheduled tasks.

- On Replit: use a **Reserved VM deployment** with Supervisor (or a background Repl process) keeping the worker alive. Autoscale deployments will not sustain a queue worker.
- For production, a conventional PHP host — Laravel Forge on a VPS, Ploi, or any Docker host — is the lower-friction path for Laravel specifically. Replit is well-suited to building and previewing this; confirm the production target early rather than discovering the constraint at milestone M4.
- Job state lives in the database. The UI reads job state; the UI is never the source of truth.

### 10.2 PDF rendering

Blade templates plus Tailwind give excellent typographic control, and **Browsershot** (headless Chromium via Puppeteer) renders them faithfully with proper page numbers, running headers and page breaks (`@page`, `break-after`). The cost is a Node + Chromium dependency in the container, which is the single most common deployment headache in this stack.

Recommended approach:
1. Build interior and cover templates as Blade + Tailwind pages designed for print.
2. Render via Browsershot in a queued job.
3. If Chromium proves unstable in the target environment, swap to a **Gotenberg** container (HTTP API, same HTML in, PDF out — a one-line driver change) rather than rewriting templates for DomPDF.
4. Keep DomPDF only as a degraded emergency fallback; it does not support modern CSS well.

Isolate rendering behind a `PdfRenderer` interface so the engine is swappable without touching templates.

---

## 11. Data model

Laravel migrations, snake_case tables, UUID primary keys, `timestamps()` on all.

```
organizations
  id, name, logo_light_path, logo_dark_path, primary_color, secondary_color,
  accent_color, heading_font, body_font, default_author, footer_text,
  default_disclaimer, storage_quota_mb, settings (json)

users
  id, organization_id, email (unique), password, full_name, avatar_path,
  role (enum: admin|manager|creator|uploader|marketer),
  status (enum: invited|active|suspended|deactivated),
  onboarding_completed_at (nullable), onboarding_exempt (bool),
  credits_balance (int, default 0), last_login_at, last_login_ip,
  two_factor_secret, remember_token, deleted_at

invitations
  id, organization_id, email, role, token_hash, invited_by,
  expires_at, accepted_at, revoked_at

access_requests
  id, name, email, requested_role, message,
  status (new|invited|dismissed), handled_by, handled_at

learn_modules
  id, organization_id, title, description, order_index, is_published

lessons
  id, learn_module_id, title, description, body_md,
  video_provider, video_id, video_url, duration_seconds, order_index,
  is_required_for_onboarding, allow_manual_complete, is_published

lesson_resources
  id, lesson_id, label, asset_id (nullable), external_url (nullable), order_index

lesson_progress
  id, user_id, lesson_id,
  status (not_started|in_progress|completed),
  watched_seconds, furthest_position, completed_at
  UNIQUE (user_id, lesson_id)

quiz_questions, quiz_attempts        -- optional (Could)

products
  id, organization_id, owner_id,
  type (ebook|lead_magnet|uploaded),
  title, subtitle, topic, audience, tone, language, depth,
  status (draft|generating|ready|in_review|changes_requested|approved|archived),
  cover_asset_id, current_export_id, word_count, chapter_count,
  brief (json), settings (json),
  -- Phase 2 placeholders, unused in Phase 1:
  slug, price_cents, currency, visibility, published_at,
  archived_at, deleted_at

product_chapters
  id, product_id, order_index, title, summary, content_md,
  status (pending|generating|ready|failed), word_count,
  ai_job_id, error_message

product_versions
  id, product_id, product_chapter_id (nullable), snapshot (json),
  created_by, reason (generation|manual_save|restore)

product_exports
  id, product_id, format (pdf|docx|md), asset_id, version_label,
  page_count, file_size_bytes, created_by

sales_page_drafts
  id, product_id, headline, subheadline, bullets (json),
  who_its_for, faq (json), cta_text, suggested_price_band, updated_by

assets
  id, organization_id, uploaded_by,
  kind (cover|pdf|image|resource|upload),
  disk, path, original_filename, mime_type, size_bytes,
  width, height, checksum, deleted_at

ai_jobs
  id, organization_id, user_id, product_id (nullable),
  product_chapter_id (nullable), batch_id (nullable),
  type (outline|chapter|intro|conclusion|cover_image|sales_copy|rewrite),
  status (queued|running|succeeded|failed|cancelled),
  provider, model, input (json), output (json),
  prompt_tokens, completion_tokens, credits_charged,
  attempt_count, error_message, idempotency_key (unique),
  started_at, finished_at

credit_transactions
  id, user_id, delta (int), reason, ai_job_id (nullable),
  granted_by (nullable), balance_after, note

reviews
  id, product_id, requested_by, reviewer_id,
  decision (pending|approved|changes_requested), comment, decided_at

comments
  id, product_id, product_chapter_id (nullable), author_id, body, resolved_at

notifications              -- Laravel's standard notifications table
audit_logs
  id, organization_id, actor_id, action, entity_type, entity_id,
  before (json), after (json), ip, user_agent
```

**Indexes:** `users(email)`, `lesson_progress(user_id, lesson_id)`, `products(organization_id, status, owner_id)`, `product_chapters(product_id, order_index)`, `ai_jobs(status, created_at)`, `credit_transactions(user_id, created_at)`, `audit_logs(organization_id, created_at)`.

---

## 12. Routes

Inertia page routes in `web.php`; async/JSON endpoints under an `/api` prefix sharing session auth (`auth:web`), not Sanctum tokens.

**Auth**
```
GET|POST  /login                       LoginController
POST      /logout
GET|POST  /forgot-password
GET|POST  /reset-password/{token}
GET       /invite/{token}              InvitationController@show
POST      /invite/{token}              InvitationController@accept
```

**Learn** — middleware `auth`
```
GET   /learn                           LearnController@index
GET   /learn/{lesson}                  LearnController@show
POST  /api/learn/lessons/{lesson}/progress
POST  /api/learn/lessons/{lesson}/complete
GET   /api/learn/status
GET   /learn/complete
```

**Products** — middleware `auth`, `onboarding.complete`
```
GET    /products                       ProductController@index
GET    /products/{product}             ProductController@show
GET    /products/{product}/edit        ProductController@edit
POST   /api/products                   store (create draft from brief)
PATCH  /api/products/{product}
POST   /api/products/{product}/duplicate
POST   /api/products/{product}/archive
PATCH  /api/products/{product}/chapters/{chapter}
POST   /api/products/{product}/chapters/reorder
POST   /api/products/{product}/submit-review
POST   /api/products/{product}/review          (Manager/Admin)
```

**Generation**
```
POST /api/generate/outline                     → job id
POST /api/generate/chapters                    → batch id
POST /api/generate/chapters/{chapter}/rewrite
POST /api/generate/sales-copy
POST /api/generate/cover-image
GET  /api/jobs/{job}
GET  /api/batches/{batch}                      progress polling
POST /api/jobs/{job}/cancel
```

**Export & assets**
```
POST /api/products/{product}/export            → export id
GET  /exports/{export}/download                → redirect to signed URL
GET  /products/{product}/preview               inline PDF
POST /api/assets/upload-url                    presigned upload
POST /api/assets                               confirm
GET  /api/assets
DELETE /api/assets/{asset}
```

**Admin** — middleware `auth`, `can:admin`
```
/admin/users            index, invite, update, destroy
/admin/users/{user}/credits
/admin/users/{user}/reset-onboarding
/admin/modules, /admin/lessons          full CRUD + reorder
/admin/onboarding-report
/admin/credits
/admin/brand
/admin/settings
/admin/audit-logs
/admin/access-requests
```

---

## 13. AI generation specification

### 13.1 Prompt chain
1. **Outline** — system role: expert non-fiction author and instructional designer. Input: topic, audience, tone, chapter count, depth, key points, language. Output: **strict JSON** (title, subtitle, chapters[{title, summary, subpoints[]}]). Validate against a schema; on parse failure retry once with a repair instruction.
2. **Chapter** — input: book title, full outline, this chapter's title/summary/subpoints, summaries of previously written chapters, tone, target word count, language, and explicit instructions not to repeat earlier material or write an overall conclusion. Output: markdown with `##`/`###` headings, no H1.
3. **Intro / conclusion** — run after all chapters, with all chapter summaries in context. Conclusion includes the user's CTA if supplied.
4. **Sales copy** — input: title, outline, audience, tone. Output: strict JSON matching `sales_page_drafts`.
5. **Rewrites** — existing chapter text plus a single instruction (expand / shorten / change tone / add examples).

### 13.2 Guardrails
- Max tokens capped per job type; hard ceiling on total tokens per product.
- If the model declines a topic, surface a clear message — never ship a silently empty chapter.
- Store `prompt_tokens` and `completion_tokens` on every job for cost reporting.
- Never place one user's content into another user's prompt.
- All prompts live in versioned config (`config/ai_prompts.php`), overridable in admin settings so copy can be tuned without a redeploy.

### 13.3 Quality controls
Post-generation checks: word count within ±30% of target; no chapter under 150 words; no duplicated chapter titles; no leftover placeholders (`[insert`, `TODO`, `As an AI`). Failures flag the chapter for review rather than silently shipping.

---

## 14. Build milestones

| # | Milestone | Deliverable | Est. |
|---|---|---|---|
| M0 | Foundation | Laravel 11 + Inertia + Vue 3 + Vite + Tailwind, design tokens (§8), DB connected, migrations, S3 disk, queue worker running, deploy pipeline green | 4–5 d |
| M1 | Auth & authorisation | Fortify/Breeze with registration removed, invite flow, resets, sessions, role enum, Gates + Policies, seeded admin | 4–5 d |
| M2 | Learn module | Curriculum CRUD, roadmap UI, player component with progress, **the gate middleware**, completion screen | 6–8 d |
| M3 | Dashboard shell | Layout, sidebar with lock states, hero gradient, stat tiles, empty states, account page | 4–5 d |
| M4 | AI generator core | Brief → outline → batched chapter jobs, progress polling, TipTap editor with autosave, version snapshots | 8–10 d |
| M5 | Cover + PDF export | Cover designer, Blade print templates, Browsershot rendering, preview, export versions | 7–9 d |
| M6 | Library & workflow | Product list/detail, filters, duplicate, review queue, comments, notifications | 5–6 d |
| M7 | Credits & admin | Credit ledger with locking, admin console (users, credits, brand, settings, audit) | 5–6 d |
| M8 | Landing page | Marketing site, access request form, legal pages, SEO | 3–4 d |
| M9 | Hardening | Lead magnets, sales copy, analytics, accessibility pass, Pest coverage, load test, security review, UAT | 6–8 d |

**Indicative total: 10–13 weeks** for one experienced Laravel/Vue developer. M2, M4 and M5 carry the most risk.

**Build order guidance:** work in vertical slices and verify each before moving on. Feed Replit Agent one milestone per session — quality degrades when asked to build everything at once. Lock down the migrations and the permission Gates early, since everything downstream depends on them.

---

## 15. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| No persistent queue worker in the hosting environment | **High** | Decide production hosting at M0. Reserved VM + Supervisor on Replit, or Forge/VPS. Never generate inside a request. |
| Chromium/Browsershot instability in the container | High | Isolate behind a `PdfRenderer` interface; Gotenberg container as the swap-in |
| AI API cost overruns | Medium | Credit ledger with locked pre-flight checks, per-job token caps, admin spend report |
| Inconsistent or repetitive chapters | Medium | Outline-first architecture, prior-chapter summaries in context, post-gen quality checks |
| Users circumventing the video gate | Medium | Middleware on API routes too, watch-position enforcement, provider progress events |
| Lime accent failing contrast checks | Low | Restrict `#A3D939` to backgrounds and large decorative use; text uses `--brand-700` or darker |
| Scope creep from Phase 2 | High | This document is the contract. Phase 2 items get logged, not built. |
| Replit Agent generating insecure defaults | Medium | Manual review of every auth, Policy and file-handling class; §9 security requirements are non-negotiable |

---

## 16. Phase 2 preview — not to be built now

Storefront and link-in-bio pages · public product pages consuming the F13 sales copy · checkout (Paystack / Flutterwave / Stripe) · order management · customer accounts and delivery · wallet, pending clearance, withdrawals · refunds and chargebacks · discount codes · smart bundles · affiliate program · email capture and broadcasts · Meta/Google/TikTok pixels · sales analytics.

**Phase 1 must therefore ship with:** a stable `products` table carrying `slug` / `price_cents` / `visibility` / `published_at`; an `approved` status meaning "cleared for sale"; sales copy stored as structured data; PDFs already in object storage behind signed URLs; and a permission map with room for new roles.

---

## 17. Assumptions — confirm before build

1. **Single organisation, single tenant.** One company, one brand kit, no company switching.
2. **No public sign-up.** The landing page CTA creates an access request, not an account.
3. **The Learn videos already exist** or will be recorded by the client. This PRD builds the delivery system, not the content.
4. **Credits are internal quota**, not something anyone buys, in Phase 1.
5. **English-first UI**, with generated content supporting other languages.
6. **Phase 1 covers PDF-type products only** — eBooks, guides and lead magnets. Course-building is not in Phase 1.
7. **Replit is the development environment**; production hosting to be confirmed (see §10.1).
8. Approval workflow (F14) is on by default, disableable in settings.

## 18. Open questions for the client

1. How many onboarding videos, and what's the combined runtime? This determines whether sequential unlock feels sensible or irritating.
2. Should onboarding be **role-specific** (a Marketer watches a different set than a Creator) or one universal curriculum?
3. Expected team size and concurrent generation volume — this sizes the queue workers and the AI budget.
4. Monthly ceiling on AI API spend?
5. Where will the videos be hosted? An existing Vimeo/YouTube library changes the progress-tracking approach.
6. Should Product Uploaders be able to run AI generation at all, or strictly upload?
7. Is a quiz at the end of onboarding wanted, or is watch-completion sufficient?
8. MySQL or PostgreSQL — does the client's hosting have a preference?
9. Where is production hosting going to live (see §10.1)?
10. Target launch date for Phase 1, and does Phase 2 begin immediately after?

---

## Appendix A — Replit Agent kickoff prompt

> Build **DigiProducts**, a single-tenant internal platform using **Laravel 11 (PHP 8.3) with Inertia.js and Vue 3**, Tailwind CSS, Vite, and MySQL/PostgreSQL. File storage on an S3-compatible disk. Queued jobs via Laravel's database queue driver with a persistent `queue:work` process.
>
> **Core concept:** one company; invite-only accounts; five roles — `admin`, `manager`, `creator`, `uploader`, `marketer`. Every non-admin must complete a required video onboarding curriculum before any other part of the app unlocks. Admins bypass it.
>
> **Design:** dark pine green sidebar, emerald→lime gradient hero, gold accents. Define all colours as CSS custom properties in `resources/css/tokens.css` mapped into `tailwind.config.js` — no hardcoded hex in components. Headings Plus Jakarta Sans, body Inter. Cards 20px radius, soft shadows.
>
> **Build in this order, one step per session:**
> 1. Migrations and Eloquent models for: organizations, users, invitations, access_requests, learn_modules, lessons, lesson_resources, lesson_progress, products, product_chapters, product_versions, product_exports, sales_page_drafts, assets, ai_jobs, credit_transactions, reviews, comments, audit_logs. UUID keys, soft deletes where noted.
> 2. Laravel Breeze (Inertia + Vue) with the **registration route removed**. Add invite-token acceptance, password reset, database sessions, and login rate limiting. Seed one admin from env vars.
> 3. A `UserRole` enum plus Gates and Policies for Product, Asset, Lesson and User. Enforce on every route. Share an `auth.can` object via Inertia middleware so Vue renders from the same definitions.
> 4. `EnsureOnboardingComplete` middleware: if role is not admin, `onboarding_completed_at` is null and the user isn't exempt, redirect every route to `/learn` and return `403 ONBOARDING_REQUIRED` from `/api/*` creation endpoints.
> 5. `/learn` roadmap page and `/learn/{lesson}` player: video embed, progress POSTed every 10s, auto-complete at 90% watched, sequential unlock, "Download Resources" button, "Up Next" card, then the completion screen that sets `onboarding_completed_at`.
> 6. `/dashboard`: gradient hero header with welcome message and credit chip, two "Start Creating" cards, six stat tiles, recent products, recent activity. Locked nav items show a padlock.
> 7. eBook wizard: brief form → AI outline request returning strict JSON (validated) → editable outline → chapter generation dispatched as a `Bus::batch` of queued jobs → progress polling on the batch → TipTap chapter editor with 3-second autosave and version snapshots.
> 8. Cover designer with template presets, then PDF assembly: Blade + Tailwind print templates rendered by Spatie Browsershot in a queued job, stored on the S3 disk, downloadable via `temporaryUrl()` with a 15-minute expiry. Put rendering behind a `PdfRenderer` interface.
> 9. Product library with filters, statuses, duplicate, and the review workflow.
> 10. Credit system: configurable cost per operation, pre-flight balance check inside a locked transaction, `credit_transactions` ledger, automatic refund on failed jobs.
> 11. Admin console: users, invites, learn curriculum CRUD with drag-reorder, credits, brand kit, settings, audit log.
> 12. Public landing page: hero, features, how-it-works, FAQ, access-request form, legal pages, SEO meta.
>
> **Hard requirements:** never run a full book generation inside an HTTP request — always queue. Validate every write with a Form Request. Escape or sanitise all AI output before rendering. Keep secrets in `.env`. Use temporary signed URLs for every file read. Write audit rows for auth, role, product and credit events. Write Pest feature tests for the onboarding gate and every Policy.

---

## Appendix B — Status reference

| Status | Meaning | Set by |
|---|---|---|
| `draft` | Created, content incomplete | System on create |
| `generating` | Queued jobs in flight | Job batch |
| `ready` | Content complete, exportable | System when all chapters ready |
| `in_review` | Awaiting reviewer | Creator |
| `changes_requested` | Reviewer wants edits | Manager/Admin |
| `approved` | Cleared — Phase 2 may publish | Manager/Admin |
| `archived` | Hidden, recoverable 30 days | Manager/Admin |
