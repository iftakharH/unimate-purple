# Unimate — Build progress

> Living document. Updated at the END of every phase, before the user is asked to test.
> A phase is **DONE** only when all three gates are green and the user confirms the manual
> test. Current phase: **awaiting user test of Phase 4**.

## Phase overview

| # | Phase | Status | Gate evidence |
| --- | --- | --- | --- |
| 0 | Pre-flight, scaffold, Supabase wiring, docs | **DONE** | ✅ type-check / lint / build |
| 1 | Database schema, RLS, storage buckets, seed | **DONE — user proceeded** | 17/17 RLS checks, advisors clean |
| 2 | Auth: domain restriction, super-admin bootstrap, invite/direct-create, password flows | **DONE — user proceeded** | 13 routes, browser-verified, 0 emails sent |
| 3 | Roles, seller requests, stores, store pages | **DONE — user proceeded** | See Phase 3 section |
| 4 | Listings: create/edit with photos, browse, search, filters, product page | **Awaiting user test** | See Phase 4 section |
| 5 | Saved items, My Listings, sold/sold-out handling | Not started | — |
| 6 | Realtime chat + notifications | Not started | — |
| 7 | Deals tracker + mock payment | Not started | — |
| 8 | Profiles and account pages | Not started | — |
| 9 | Admin panel + audit log | Not started | — |
| 10 | Responsive polish, README/deploy guide, final verification | Not started | — |

---

## Phase 0 — Pre-flight, scaffold, Supabase wiring, docs — 2026-10-18

### Built

- Git repo initialized; `.gitignore` hardened (`.env.example` now committable, everything else
  `.env*` ignored).
- Supabase project `unimate-purple` created (ref `jleztdtwkctvuogaechh`, `ap-southeast-1`,
  free tier, "Purple Tech" org). Old "Unimate" project left untouched.
- Next.js 16.4.2 App Router + TypeScript (strict) + Tailwind v4 scaffolded via
  `create-next-app`; shadcn/ui initialized (Base UI variant, `components.json`, button
  component, `src/lib/utils.ts`, purple-ready token file).
- Dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `zod` (v4), `react-hook-form`,
  `@hookform/resolvers`, `@tanstack/react-query`, `next-themes`, `server-only`.
- Environment layer:
  - `.env.example` — full template with comments (committed).
  - `.env.local` — real values (git-ignored). `SUPABASE_SERVICE_ROLE_KEY` intentionally empty
    until the user provides it (needed from Phase 2).
  - `src/lib/env.ts` — Zod-validated public env, client-safe, static `process.env.X` access so
    values inline into the browser bundle.
  - `src/lib/env.server.ts` — `server-only`-guarded server env, lazy-validated; exports
    `isSuperAdminEmail()`.
- Supabase clients (docs-verified against current `@supabase/ssr` guidance):
  - `src/lib/supabase/client.ts` (browser), `server.ts` (RSC/actions, async `cookies()`),
    `admin.ts` (service role, `server-only`), `proxy.ts` (session refresh helper).
  - `src/proxy.ts` — Next 16 Proxy (the renamed middleware) running session refresh on every
    request.
- `next.config.ts` — Cache Components/partialPrefetching removed (ADR-004); Supabase Storage
  `remotePatterns` added for `next/image`.
- Root metadata set to Unimate; `npm run type-check` script added.
- Documentation: `AGENTS.md` (developer/AI guide), `docs/DECISIONS.md` (6 ADRs),
  this file, `README.md`.

### Gate evidence (run 2026-10-18)

| Gate | Command | Result |
| --- | --- | --- |
| Type-check | `npm run type-check` | ✅ pass |
| Lint | `npm run lint` | ✅ pass |
| Build | `npm run build` | ✅ pass |

### How to verify manually (for the user)

1. `npm run dev` (already running) → open http://localhost:3000 — the default Next.js page
   should render without console errors.
2. This phase is infrastructure only — pages are deliberately placeholders until later phases.

### Notes / carry-forward

- **Blocker for Phase 2:** `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard → Project Settings →
  API → service_role) must be pasted by the user into `.env.local`.
- **Blocker for Phase 2:** SMTP credentials for Supabase Auth (user provides).
- Phase 1 will drop nothing — the new project is empty; all 15 tables arrive as migrations.

---

## Phase 1 — Database schema, RLS, storage & seed — 2026-10-18

### Built

- **10 migration files** in `supabase/migrations/` applied to project `unimate-purple`
  (`jleztdtwkctvuogaechh`). 16 tables, every one with RLS enabled:
  `profiles`, `notifications`, `invited_emails`, `stores`, `seller_requests`, `categories`,
  `listings`, `listing_images`, `saved_items`, `conversations`, `messages`, `deals`,
  `payments`, `reports`, `admin_audit_log` — plus the `public_profiles` view.
- **Auth guards live in the database** (the UI check is defense-in-depth, never the control):
  signup-domain trigger (`@eastdelta.edu.bd` + super admins + invited emails only),
  profile-bootstrap trigger (super admin → `admin`, invited email → invited role,
  everyone else → `buyer`), role/ban protection triggers, super-admin delete protection,
  `ensure_super_admin()` login bootstrap.
- **Business rules enforced in SQL:** seller-request approval atomically promotes the role,
  creates the store (unique slug) and notifies; deal state machine with per-actor
  transitions and payment-mode rules; payment success → deal `paid`; deal completion →
  listing `sold` / quantity decrement / `sold_out`; messages immutable (only `read_at`
  changes); max 8 photos per listing; append-only audit log.
- **Storage buckets**: `listing-images`, `avatars`, `store-assets` — public read,
  owner-folder writes only (`{bucket}/{uid}/…`), images only, max 5 MB/file.
- **Seed**: 11 campus categories (mirrored in `supabase/seed.sql`).
- **Hardening** driven by the security advisor + checklist findings (see ADR-007/008/009).
- Realtime publication enabled for `messages`, `conversations`, `notifications` (Phase 6).

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| Migrations | Supabase MCP `apply_migration` × 11, in order | ✅ success |
| RLS acceptance checklist | `supabase/tests/rls_checklist.sql` — 17 checks | ✅ **17/17 pass** |
| Post-hardening regression | Smoke script: approval → store → role → notify; RLS insert + block; deal → sold | ✅ **7/7 pass** |
| `npm run type-check` | local | ✅ pass |
| `npm run lint` | local | ✅ pass |
| `npm run build` | local | ✅ pass |
| Security advisor (pre-hardening run) | Supabase advisor | 1 ERROR + 5 WARNs — all accepted & documented (ADR-009) |
| Advisor re-run (after migration 11) | Supabase advisor | ✅ security: only the accepted findings (ADR-009); performance: only `unused_index` INFO (expected on an empty DB) |

### How to verify manually (for the user)

1. Supabase dashboard → **Table editor**: 16 tables exist. `categories` shows **11 rows**;
   other tables are empty — every test creates its users/data inside a transaction that
   rolls back, so nothing fake is left behind.
2. Dashboard → **Storage**: the 3 buckets exist, marked public.
3. Dashboard → **SQL editor**: paste `supabase/tests/rls_checklist.sql` and run. Expected:
   one error message `RLS CHECKLIST — 0 failure(s)` followed by 17 `PASS` lines. (Safe —
   the script rolls itself back.)

### Notes / carry-forward

- **Types generated**: `src/types/database.ts` (from the live schema) and all three Supabase
  clients wired with the `Database` generic. Regenerate via `generate_typescript_types` after
  any migration.
- `supabase/seed.sql` intentionally seeds categories only; demo listings arrive in Phase 4
  alongside the listing UI.
- Changing the super-admin pair requires a migration edit to `public.super_admin_emails()`
  **and** `SUPER_ADMIN_EMAILS` in env — both must stay in sync (ADR-007).

---

## Phase 2 — Auth, account security & admin user management — 2026-10-18

### Built

- **Design system live** (ADR-010 / `docs/DESIGN.md`): purple OKLCH token set, light default +
  dark toggle (`next-themes` + CSS-only icon swap), two-part elevation utilities (`elev-1/2/3`),
  motion tokens, global `prefers-reduced-motion` guard, one soft glow used on auth screens.
- **Auth shell + screens** `(auth)/`: login, signup (live domain-rule validation), verify-email
  (with resend), forgot-password, reset-password (session-gated), change-password
  (forced-flow aware), banned screen.
- **Server auth layer**: `src/lib/auth.ts` (`getAuthContext` cached per request, `requireUser`,
  `requireAdmin`) — the real authorization checks; `src/proxy.ts` keeps doing session refresh only.
- **Auth flows**: signup restricted to `@eastdelta.edu.bd` (UI zod + DB trigger; super-admin
  emails exempt), email confirmation via PKCE `/auth/callback`, super-admin bootstrap RPC on
  login, friendly error mapping, open-redirect guard (`sanitizeNextPath`).
- **Account security** `(protected)/settings/security`: password change (re-verifies current
  password first), secure email change (both-address confirmation copy), **TOTP 2FA**
  (enroll QR → verify → disable; server-rendered factor state), sign-out-of-all-devices,
  **account self-deletion** (password-confirmed, super-admin protected, audit-logged).
- **Settings profile**: profile form (name/phone/bio), avatar upload — browser → Supabase
  Storage (`avatars/{uid}/…`, storage-RLS enforced) → server action persists the URL.
- **Admin → Users** (first slice; full panel in Phase 9): invite-by-email + direct-create with
  temporary password (forces `must_change_password` on first login), audit-log entries for both,
  members list with roles/bans/last-seen. Admin role options are Super-Admin-only (enforced in
  UI **and** server action **and** DB trigger).
- **DB hardening**: migration 12 — email-change domain guard (the signup rule now also applies
  to post-signup email changes).
- **Dev utility**: `scripts/create-test-users.mjs` — throwaway accounts via the admin API with
  `email_confirm: true` (sends NO email); `--delete` cleans up.

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` | local | ✅ pass |
| `npm run lint` | local | ✅ pass |
| `npm run build` | local | ✅ pass — 13 routes |
| Browser test (Puppeteer) | home, signup domain rejection (live error shown), unauthenticated `/settings` → 307 → `/login`, login as test admin → `/`, `/admin/users` (members list + forms render; Admin role option hidden for non-super admins), `/settings`, `/settings/security` light + dark | ✅ all pass, **0 dev-overlay issues** |
| Emails sent during tests | — | **0** (admin API `email_confirm`, no real addresses touched) |

### How to verify manually (for the user)

1. http://localhost:3000 → **Sign in** with `test-admin@eastdelta.edu.bd` / `TestAdmin123`
   (or the buyer experience: `test-buyer@eastdelta.edu.bd` / `TestBuyer123`).
2. **Settings → Profile**: edit name/phone/bio, upload a photo, save.
3. **Settings → Security**: change password, set up 2FA with an authenticator app, try
   sign-out-of-all-devices; delete-account flow (you can back out before confirming).
4. **Admin → Users**: try Create-with-password (no email needed). Invite-by-email saves the
   invite but its email will fail until SMTP is configured — expected today.
5. `/signup` with e.g. `someone@gmail.com` → rejected; toggle dark mode top-right.

### SMTP / email — decision needed (see report)

- `*.vercel.app` cannot be verified in Resend (no DNS control) — **Resend waits for a real
  domain**. Free-for-now options: **Gmail SMTP app password** (recommended) or the
  rate-limited Supabase sender. Dashboard steps in the phase report.
- Until then: signup confirmation, reset links and invite emails will not deliver; the
  **test accounts above bypass email entirely**, and admin *direct-create* needs no email.

---

## Phase 3 — Seller onboarding, review queue & store pages — 2026-10-18

### Built

- **Motion system** (ADR-011): `motion` via `LazyMotion` + `dmAnimation` + `strict`
  (`src/components/motion-provider.tsx`), named spring presets and stagger variants in
  `src/lib/motion.ts`, global `prefers-reduced-motion` for CSS **and** `MotionConfig` for JS.
- **"Become a seller"** `(protected)/become-seller`: benefits row, validated request form,
  state-aware page (pending timeline Submitted → Review → Store live; rejection note +
  re-apply with defaults kept).
- **Admin → Seller requests**: pending queue with note field + Approve/Reject, decision
  history. Approval triggers the DB side-effects (role → seller, store created with unique
  slug, requester notified) and writes an audit-log entry.
- **Seller area** `(protected)/seller` (role-guarded): **My store** editor — branding card
  (banner 16:6 + logo uploads straight to Storage), store details form (name, intro, phone,
  pickup spot), public-page link.
- **THE signature moment** (`store-live-reveal.tsx`): first visit after approval —
  anticipation fade → checkmark draws + name settles → LIVE badge stamps with a bouncy
  spring → CTAs. Under ~800ms of choreography, skippable (Skip / Esc / backdrop / auto 3.6s),
  non-blocking, `MotionConfig` degrades it to an instant state for reduced-motion users.
- **Public storefront** `/store/[slug]`: orchestrated hero entrance (parent-driven stagger,
  ~650ms), deterministic on-brand banner hue per store (violet→indigo family, 252–319°),
  ambient drift (26s, transform-only) + film grain, overlapping logo tile, meta chips
  (listings count, joined, pickup), phone link, **listing grid** with scroll-driven CSS
  reveals (`animation-timeline: view()`, `@supports`-gated, zero JS) and a designed empty
  state. Shared `ListingCard` (hover lift, image zoom, condition/qty badges) — reused by
  browse/home in Phase 4.
- **Demo data**: "Rafi's Tech Corner" (test-buyer) with 4 realistic listings seeded via SQL.

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ (18 routes) |
| End-to-end browser walkthrough (Puppeteer) | login → request → admin queue → approve → seller reveal → dismiss → storefront | ✅ every step, **0 dev-overlay issues at the end** |
| Bugs caught by the walkthrough | (1) avatar menu crash — Base UI `GroupLabel` outside `Menu.Group` (found in dev-server logs, fixed); (2) hydration mismatch — client-only `localStorage` branch in the reveal (fixed: server-truth only) | both fixed & re-verified |
| Design correction | slug-hash banner hue spanned all 360° (rendered yellow-green) → constrained to brand family | fixed |

### How to verify manually (for the user)

1. The whole flow is already live as demo data. **See the signature moment**: sign in as
   `test-buyer@eastdelta.edu.bd` / `TestBuyer123`, visit `/become-seller` — you'll be
   redirected and the "store is live" reveal plays.
2. **Store editor**: `/seller/store` — upload a banner/logo, edit details, then open the
   public page.
3. **The storefront**: http://localhost:3000/store/rafi-s-tech-corner — hover the cards,
   watch the entrance, scroll the grid reveals, try dark mode.
4. **Admin queue**: sign in as `test-admin@eastdelta.edu.bd` / `TestAdmin123` →
   Admin → Seller requests (history row from the test approval).

### Notes / carry-forward

- Listing **creation/editing UI** is Phase 4; the 4 demo listings were seeded via SQL.
- The public storefront reads real data; listing detail pages (`/listing/[id]`) arrive in
  Phase 4 — store cards link there already.

### SMTP / email — still pending the user's provider choice (see Phase 2 section)

---

## Phase 4 — Listings, browse & the colour system — 2026-10-18

### Built

- **The real home page** `/`: ambient colour-field hero, live stats (listings/stores),
  "Shop by category" rail, "Fresh on campus" grid (8 latest), seller CTA for non-sellers.
- **Colour generation system** (`src/lib/colors.ts` + ADR-012/013): every generated colour in
  the product comes from one curated rule set — deterministic store banners (violet→indigo),
  **category duotones** (curated partner hues), **listing-card duotone placeholders**,
  `AmbientBackdrop` layered colour fields with slow drift + grain (dark-mode aware, per-page
  hue variants). Category tiles are colourful; the grid glows with variety; still one brand.
- **Browse** `/browse`: URL-synced everything — search `q` (debounced), category, condition
  (All/New/Used segmented), price min/max, sort (newest / price ↑ / price ↓), optional
  `store=` chip, classic pagination (24/page, Prev/Next, count). Public, works signed-out.
- **Listing detail** `/listing/[id]`: photo gallery (crossfade, arrows, thumbnails, keyboard
  ←/→, counter), price/condition/title card, description, detail chips (qty, category link,
  pickup, posted date), **seller card** (store logo + link, seller name/avatar, verified mark),
  **Save** (heart, real saved_items toggle, optimistic), **Report listing** (inline disclosure,
  reasons, stored in `reports`), owner/admin see Edit + Manage; non-active listings show a
  status banner.
- **Seller listings**: seller area now has tabs (**My listings | My store**). `/seller/listings`
  (all statuses, cover thumbs, Edit/View), `/seller/listings/new`, `/seller/listings/[id]/edit`
  with **photo manager** — pick files (uploaded straight to Storage from the browser, progress
  state), **drag to reorder** + keyboard-accessible move buttons, remove, first photo = Cover,
  max 8/5 MB. Create → success banner on the live listing; edit → sync (removed photos are
  deleted from Storage too); delete → inline confirm, Storage cleanup.
- **Server actions with full validation** (`listingSchema`, `listingImagesSchema`) + ownership
  checks; image URLs are verified to live in the caller's own storage folder (defense in depth
  over storage RLS).
- **Shared `PublicHeader`** on home/browse/listing pages (Brand, Browse, Sell for sellers,
  theme, user menu).

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ (22 routes) |
| Create listing with **real photo upload** (Puppeteer) | injected a real file into the input → Storage upload → preview "1/8 · Cover" → publish → redirect `/listing/…?created=1` + "Your listing is live" banner | ✅ pass |
| Edit listing | swapped the photo (canvas-generated image) + fixed quantity → saved → DB shows 1 image row (new URL), old file cleaned up, quantity 1 | ✅ pass |
| Save toggle | click → "Saved", `aria-pressed=true`, toast "Saved to your list."; DB row in `saved_items` | ✅ pass |
| Browse search | typed "ipad" → URL `?q=ipad&sort=newest` after debounce → 1 result, correct item | ✅ pass |
| Storefront regression | `/store/rafi-s-tech-corner` → 5 cards → click card → listing detail opens | ✅ pass |
| Design check | home + browse captured light & dark; ambient backdrop visibly richer in both | ✅ pass |
| Emails sent during tests | — | **0** |

### How to verify manually (for the user)

1. **Home** http://localhost:3000 — the colour fields drift slowly behind the hero; hover the
   category tiles and the listing cards. Toggle dark mode: the backdrop is designed for both.
2. **Browse** — http://localhost:3000/browse. Try: search "laptop", filter New/Used, set price
   min/max + Apply, sort by price, click a category tile. Watch the URL change with every
   filter — shareable links, and Back works.
3. **A listing** — open any card (e.g. the seeded "TI-84 Plus CE"). Gallery arrows/thumbnails/
   keyboard, Save (heart) → check it flips to "Saved", Report listing folds out.
4. **Sell something** (as `test-buyer@eastdelta.edu.bd` / `TestBuyer123`, a seller):
   Header **Sell** → New listing → add 2-3 photos (drag to reorder!), fill fields, Publish →
   land on the live listing. Then **My listings** → Edit → swap a photo, delete the listing if
   you want (inline confirm).
5. **Admin note**: admins see Edit/Manage on any listing.

### Notes / carry-forward

- **"Message seller" and "Make an offer" are deliberately disabled** with a caption ("switch
  on with the chat & deals phase") — dead links would be worse. They light up in Phase 6/7.
- **Saved items page** (`/saved`), **sold / sold-out / relist management** and richer My
  Listings controls are Phase 5 (spec order) — the Save button already stores data.
- **Photo pipeline trade-off** (ADR-013): files upload the moment they're picked, so abandoning
  the form can leave orphaned files in Storage. Small at campus scale; a cleanup job is noted
  for a later phase. Edit/delete clean up properly.
- If the dev browser sits idle for a long time, the Supabase session can expire mid-testing
  (refresh-token rotation) — sign in again; nothing is lost.
- New demo data: "iPad 9th Gen — 64GB WiFi, with Pencil" (৳28,500, with a real photo) created
  through the UI as test-buyer, alongside the 4 seeded listings.
