# Unimate — Build progress

> Living document. Updated at the END of every phase, before the user is asked to test.
> A phase is **DONE** only when all three gates are green and the user confirms the manual
> test. Current phase: **awaiting user test of Phase 10 — the last one**.

## Phase overview

| # | Phase | Status | Gate evidence |
| --- | --- | --- | --- |
| 0 | Pre-flight, scaffold, Supabase wiring, docs | **DONE** | ✅ type-check / lint / build |
| 1 | Database schema, RLS, storage buckets, seed | **DONE — user proceeded** | 17/17 RLS checks, advisors clean |
| 2 | Auth: domain restriction, super-admin bootstrap, invite/direct-create, password flows | **DONE — user proceeded** | 13 routes, browser-verified, 0 emails sent |
| 3 | Roles, seller requests, stores, store pages | **DONE — user proceeded** | See Phase 3 section |
| 4 | Listings: create/edit with photos, browse, search, filters, product page | **DONE — user proceeded** | See Phase 4 section |
| 5 | Saved items, My Listings management, sold/sold-out, gated marketplace, veil & footer | **DONE — user proceeded** | See Phase 5 section |
| 6 | Realtime chat + notifications; glass navbar; kinetic landing | **DONE — user proceeded** | See Phase 6 section |
| 7 | Deals tracker + mock payment (both completion paths) | **DONE — user proceeded** | See Phase 7 section |
| 8 | Profiles & account pages | **DONE — user proceeded** | See Phase 8 section |
| 9 | Admin panel with audit log | **DONE — user proceeded** | See Phase 9 section |
| 10 | Responsive polish, error/empty/loading states, README + deployment guide | **Awaiting user test** | See Phase 10 section |
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

---

## Phase 5 — Saved items, listing lifecycle, gated marketplace, veil & footer — 2026-10-18

### Built

- **Marketplace is students-only now** (user directive; ADR-015): `/browse`, `/listing/[id]`
  and `/store/[slug]` redirect signed-out visitors to `/login?next=…` (browse keeps its full
  query string). Login returns you exactly where you were headed; default lands on the
  marketplace. Signed-out home shows a **landing** instead: hero, locked live-stats line
  ("5 listings live from 1 campus store — sign in to browse"), categories, "What's inside"
  feature cards, closing CTA — **zero products visible**.
- **The gate holds at the API layer too** (migration 13): `listings`, `listing_images` and
  `stores` SELECT policies now require `authenticated` — the public anon key cannot read
  product data. RLS checklist extended to **20 checks** (T18–T20), **20/20 pass**.
- **Footer** (`site-footer.tsx`): brand + tagline, Marketplace / Account / Campus columns
  (links adapt to signed-in state and seller role; no placeholder links) + legal line.
  On landing, marketplace home, browse, listing and storefront pages.
- **Ambient veil v2 — the elegant backdrop on every page** (ADR-016): one component, three
  CSS-only layers — a mask that dissolves the composition into the page, a fine dot grid for
  structure, and drifting colour fields (dark mode designed separately, deeper and richer).
  Applied to landing, marketplace, browse, listing, storefront, **every protected screen
  (settings, admin, seller) and the auth screens** — the old bespoke auth glow retired.
- **Saved items** `/saved`: heart in both headers, saved-grid with Remove (optimistic-free,
  toast + refresh), designed empty state, and an honest "n still unavailable" count when a
  saved listing has since been sold/hidden (RLS filters it out of the join).
- **My Listings management**: per-row status controls — **Mark sold / Sold out** on active
  listings, **Relist** on anything else (one form, buttons carry the target status; toasts
  confirm; rows update in place). Sold/sold out listings disappear from browse and storefront
  for everyone else while the owner keeps them (with the status banner) via RLS.

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ (23 routes) |
| RLS checklist (migration 13 applied) | Supabase MCP, full script | ✅ **20/20 pass** — incl. T18 anon listings, T19 anon photos, T20 anon stores |
| Landing (signed-out) | Puppeteer: 0 listing links, locked stats line, features, footer present | ✅ pass |
| Gate + round-trip | `/browse?q=ipad` → `/login?next=%2Fbrowse%3Fq%3Dipad` (query preserved, hint shown) → sign in → landed on `/browse?q=ipad`; store/listing redirects likewise | ✅ pass |
| Saved items | iPad card → Remove → toast → "Nothing saved yet" empty state | ✅ pass |
| Sold → hidden → relist | Mark sold → toast → absent from browse (count 5→4) → Relist → visible again | ✅ pass |
| Veil on every page | landing / marketplace / browse / listing / storefront / settings / auth captured light + dark | ✅ pass |
| Incident found & fixed | new server action 500'd once ("Cannot read properties of undefined (reading 'apply')") — stale dev action registry after editing a `"use server"` file; fixed by dev-server restart, flow re-verified after | ✅ resolved |
| Emails sent during tests | — | **0** |

### How to verify manually (for the user)

1. **Signed out**: localhost:3000 → landing page, no products anywhere. Click **Browse** →
   login screen with "Sign in to continue where you left off." Sign in
   (`test-buyer@eastdelta.edu.bd` / `TestBuyer123`) → you land straight on browse.
2. **Backdrop**: flip dark mode on any page — home, browse, settings, admin — the veil
   (colour fields + dot grid, fading out) sits behind all of them now.
3. **Saved**: heart icon in the header → Saved items; add something from a listing page, then
   Remove it from the saved page.
4. **Listing lifecycle** (seller): My listings → **Mark sold** on a listing → check it's gone
   from /browse and the storefront → **Relist** → it's back. "Sold out" works the same way.

### Notes / carry-forward

- Home feed, category rail and search stay as-is once signed in — the gate only changes what
  a visitor without an account can see.
- Storage buckets remain public-read: photo URLs are unguessable and only discoverable
  through the now-gated rows (ADR-015 documents the trade-off).
- Chat/notifications (Phase 6) will re-use the same gated pattern.
- `GET /saved` returned 404s in the dev log while the page did not exist yet — it exists now.

---

## Phase 6 — Realtime chat & notifications + glass nav + kinetic landing — 2026-10-18

### Built

- **Realtime chat**: `/messages` (conversation list — partner avatar, last-message preview,
  neon unread pills, listing thumb; live refresh on new messages) and `/messages/[id]`
  (thread — server-rendered history, **Supabase Realtime** appends new messages live,
  read receipts update on view + on receive, glass composer pinned at the bottom, Enter to
  send). **"Message seller"** on every listing is now real: find-or-create the conversation
  (race-safe via a unique index) and land in the thread.
- **Notifications**: `on_message_created` trigger now also drops a notification for the
  recipient (the DB is the only writer — no user insert policy, by design). The navbar bell
  shows a **live unread count** (Realtime), `/notifications` lists everything with unread
  styling, per-row "open" (marks read + follows the link) and **Mark all read**.
- **Floating glass navbar on both shells** (ADR-017): a translucent, blurred pill — **90%
  width at the top, morphing (spring) into a compact pill that hugs its content once you
  scroll**, shedding secondary links. Brand, Browse, Sell, Messages (unread badge), Saved,
  Bell (unread badge), theme and avatar; identical in the public and the signed-in shell.
- **Landing redesign — the manifesto pass** (ADR-018): asymmetric hero with **word-by-word
  kinetic reveal** on massive type (`clamp(2.6rem, 8.5vw, 7rem)`, tight tracking), the third
  line in **outlined stroke type**, a **magnetic** primary CTA, a CSS **marquee** of category
  names with neon dots, **bento** category tiles (two wide lives, uneven rest),
  **horizontal snap-scroll** feature cards (01/02/03), and an inverted black closing block
  with a neon-hover button. New tokens: `--neon` (electric lime) for sharp accents.
- **Darker, less "purple-cloud" dark mode** per the brief: the dark veil's chroma dropped
  (~half) toward a near-black monochrome with a violet hint; light mode unchanged.
- **Migrations 14/15**: chat notification trigger + conversation unique index;
  `marketplace_stats()` (SECURITY DEFINER, aggregate-only) so the signed-out landing shows
  real counts without exposing rows.

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ (26 routes) |
| RLS checklist (after trigger change) | Supabase MCP, full script | ✅ **20/20 pass** |
| Chat end-to-end | admin → "Message seller" on buyer's iPad listing → thread → send message → bubble rendered; DB: message row + notification row "Test Admin sent you a message" → deep link | ✅ pass |
| **Realtime** | buyer's thread open in the browser; reply inserted server-side → bubble appeared **with no refresh** (2 bubbles, live) | ✅ pass |
| Notifications | buyer: list with 2 unread (neon dots), "Mark all read", row click → marks read + lands on the exact thread; unread counts drop to 0 | ✅ pass |
| Glass nav | measured: expanded ≈90% of viewport, scrolled → compact pill (screenshot-verified both states on the landing + marketplace) | ✅ pass |
| Landing | zero products signed-out, real counts via `marketplace_stats()` (3 listings / 1 store), outline headline renders, marquee + bento + horizontal features, footer | ✅ pass |
| Bugs caught & fixed during the phase | (1) `text-outline` invisible — `currentColor` stroke resolved to the transparent fill; explicit `var(--foreground)` stroke. (2) Signed-out landing showed 0 counts after the Phase 5 gate — fixed by the aggregate function. (3) Startup type error on the new RPC — types file updated with the function signature | all fixed, gates re-run |
| Emails sent during tests | — | **0** |

### How to verify manually (for the user)

1. **Navbar**: on any page, scroll — the pill shrinks from ~90% width to a compact capsule
   and springs back at the top. The Messages and bell icons carry live unread counts.
2. **Chat**: sign in as `test-admin@eastdelta.edu.bd` / `TestAdmin123`, open the iPad listing,
   **Message seller** → send something. Sign in as `test-buyer@eastdelta.edu.bd` /
   `TestBuyer123` in another window: the bell badge jumps immediately, `/messages` shows the
   thread with an unread pill, and a reply appears **live** while the thread is open.
3. **Notifications**: bell → list; click a row (it marks read and opens the thread);
   "Mark all read" clears the badge.
4. **Landing (signed out)**: big type reveals word-by-word, the outlined line, the marquee,
   the bento tiles, the horizontal feature scroll — scroll to watch the nav morph.

### Notes / carry-forward

- Read receipts are stored (`messages.read_at`) and unread counts drive every badge; the UI
  intentionally does not (yet) show "Seen" ticks on individual bubbles.
- Typing indicators, image messages and message search are deliberately out of scope.
- Store editor validation caught a real bad phone input during testing (inline error shown) —
  working as designed.

---

## Phase 7 — Deals tracker & mock payment + navbar/landing corrections — 2026-10-18

### Built

- **Make an offer** on every active listing (non-owners): inline form — quantity, offer
  total (defaults to asking price), **Pay on campus** vs **Pay in app (sandbox)**, optional
  note. One open deal per listing per buyer (reuses it on repeat offers). Creating a deal
  notifies the seller.
- **`/deals`** — "As buyer"/"As seller" tabs with live counts; status chips colour-coded per
  state; counterpart + listing preview per row.
- **`/deals/[id]`** — the full tracker: amount/quantity/payment summary, the counterpart,
  the **real timeline built from `deal_status_history`** (status, who, when, notes), buyer
  note, cancel reason, and **contextual actions per role and state** — all driven by the
  database state machine (its exact error text is surfaced, never a generic mask).
- **Two completion paths** (spec §6), both exercised end to end:
  - **Pay on campus**: requested → accepted (seller) → completed (seller confirms the
    handover in one step).
  - **Pay in app (sandbox)**: requested → accepted → **paid** (buyer pays in the sandbox
    checkout) → handed_over (seller) → completed (buyer confirms receipt).
  Completion decrements quantity and flips the listing to `sold` (qty 1) or `sold_out`
  (multi-unit at zero) — already implemented in the DB, now reachable through the UI.
- **Mock payment provider** (spec §7, ADR-019): `PaymentProvider` interface +
  `MockPaymentProvider` (server-only) — `createPayment` → `confirmPayment` → `refund`, with
  the payments row walking pending → succeeded (that UPDATE is what the DB trigger turns
  into the deal's `paid`). Method picker (card / mobile wallet / bank); **no card data is
  ever collected or stored**; deterministic sandbox success; prominent sandbox labels.
- **Migration 16**: `deal_status_history` (RLS: participants read; writes only via the
  security-definer triggers), creation notification, transition logging, backfill, and a
  **genuine bug fixed** — `deals_insert_buyer` contained tautological checks
  (`l.seller_id = l.seller_id`); it now really enforces: not your own listing, listing
  active, and enough stock for the requested quantity.
- **User corrections** (requested before this phase):
  - **Navbar v2** (ADR-020): no more binary compact mode and **nothing is ever hidden** —
    the pill's width is a continuous function of page scroll progress: ~90% at the top,
    easing linearly down to its measured content width at the bottom (items end up
    shoulder-to-shoulder). Measured live: **89% → 76% at 20% scrolled (the user's own
    "85% of previous" figure) → 22% at the bottom**, with every link still present.
  - **Landing shows no marketplace numbers to the public** (ADR-021): the "Right now
    inside" card is now a qualitative list of what's traded; aggregate counts render only
    for signed-in users.

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ (28 routes) |
| RLS checklist | Supabase MCP — extended to **21 checks** (new T21: seller cannot open a deal on their own listing; cross-seller purchase as positive control; over-quantity blocked) | ✅ 21/21 (helped fix two flaws in my own new test) |
| Campus path E2E (browser) | admin offers ৳27,000 on the iPad → seller accepts → seller confirms handover → **completed**; DB: listing `sold`, qty 0, history `[requested, accepted, completed]` | ✅ pass |
| In-app path E2E (browser) | admin offers ৳1,300 (in-app) on the lamp → seller accepts → admin pays via sandbox (mobile wallet) → seller marks handed over → admin confirms receipt → **completed**; DB: payment `succeeded` (`MOCK-…`), listing qty 3→2 stays active, history `[requested, accepted, paid, handed_over, completed]`, 8 deal notifications across both deals | ✅ pass |
| Navbar scroll curve | measured at 0/20/60/100% scroll on a live page | ✅ 89 → 76 → 49 → 22% width, all items visible throughout |
| Landing privacy | signed-out landing contains zero numeric marketplace data | ✅ pass |
| Emails sent during tests | — | **0** (no payment emails either — sandbox only) |

### How to verify manually (for the user)

1. Sign in as `test-admin@eastdelta.edu.bd` / `TestAdmin123`, open any listing from Rafi's
   Tech Corner and hit **Make an offer** — try both payment modes.
2. As `test-buyer@eastdelta.edu.bd` / `TestBuyer123`: **Deals → As seller** → accept, then
   walk the deal through its path. The timeline records every step with who and when, and
   both parties get notifications at every transition.
3. Watch a completed deal flip the listing: quantity drops; at zero it becomes sold/sold out.
4. Scroll any page — the navbar glides smoothly from 90% wide to content-hugging, items
   closing in but never disappearing.

### Notes / carry-forward

- `marketplace_stats()` (migration 15) is now unused by the landing (ADR-021) — kept,
  aggregate-only, for future signed-in dashboards.
- The sandbox provider's `refund` is wired but not exposed in UI — the admin payments
  screen (Phase 9) will use it.
- `deals_insert_buyer`'s hardened policy means a deal can only be created against an active
  listing with enough stock; the app checks the same rules for friendly errors.

---

## Phase 8 — Profiles & account pages — 2026-10-18

### Built

- **`/profile/[id]`** — the public profile page (spec §5): deterministic brand-family banner
  hue, avatar, name, Seller/Admin badge, "member since", bio, and a store card ("Visit
  store") for sellers. The seller's **active listings** render in the shared card grid —
  signed-in viewers only, like every marketplace surface (ADR-015). Viewing your own
  profile shows an **Edit profile** shortcut to `/settings`. Unknown ids → 404; signed-out
  visitors → login. No new columns or migration needed — the `public_profiles` view
  (full_name, avatar_url, bio, role, created_at) is exactly the safe surface.
- **Wired everywhere the spec asks**: the listing page's seller card now links to the
  profile (name + "View profile →") next to the existing store link; the store page has a
  **Seller profile** button; the account menu gained **My profile**.
- **The account side was already built** (Phase 2) — re-audited this phase: profile form
  (full name, phone, "About you"), avatar uploader, change email, change password, TOTP
  MFA, sign-out-everywhere, permanent account deletion. All present and rendering.
- **Navigation (user decision, ADR-023)**: the glass pill stays on phones; **Profile was
  added to the pill** (icon between notifications and theme). Below the `sm` breakpoint the
  brand drops its wordmark to keep the pill inside 90% of a 360px screen — everything else
  stays visible. The spec's "bottom tab bar on phones" is explicitly **not** built.
- **Navbar v3 mechanics (ADR-022)** — two real defects found while verifying this phase:
  1. On pages **shorter than the viewport** there is no scroll range, and motion's default
     `scrollYProgress` reports `1` — the pill snapped straight to its smallest width at the
     top of such pages. Progress is now computed from `scrollY / range` with a guard
     (range ≤ 4px → progress 0).
  2. The progress tracker is now **frame-tracked** (a rAF read) instead of event-driven:
     one number read per visible frame, follows smooth scrolling exactly, immune to missed
     scroll events, and it self-heals the content measurement when the viewport width
     changes without a resize event.
  The mapping curve is unchanged: linear 90% → measured content width (ADR-020).

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ (29 routes) |
| Profile page render | browser — name, Seller badge, member since, store card, active listings (2 cards), banner hue | ✅ pass |
| Self vs other view | "Edit profile" appears only on own profile | ✅ pass |
| Wiring | listing page seller card → `/profile/<seller>`; store page → **Seller profile** button; account menu → **My profile** | ✅ all three verified |
| Navbar curve (desktop) | measured at 0/20/60/100% scroll: 90% → 77% → 52% → 26% viewport width; **9 interactive items at every step** (nothing hidden) | ✅ pass |
| Short-page guard | profile page with zero scrollable range: pill stays at 90%, no jump | ✅ pass |
| Mobile (360–540px) | pill fits inside 90% with no horizontal overflow; brand becomes icon-only; all 9 items present | ✅ pass |
| Settings/security audit | all surfaces present: profile form, avatar, email change, password, MFA, sign-out-everywhere, delete account | ✅ pass |
| Emails sent during tests | — | **0** |

### How to verify manually (for the user)

1. Open any listing → the seller card now links to their **profile** (name or "View
   profile →"). The store page has a **Seller profile** button. The account menu has **My
   profile**.
2. View your own profile via the menu — you get **Edit profile**; view someone else's — you
   don't.
3. Scroll a **short** page (many profiles will be short) — the navbar must stay wide at the
   top (this was the bug fixed today), then glide closed as you scroll a long page.
4. On a phone width, the pill shows icon-only branding and still fits — Profile is the
   person icon next to the bell.

### Notes / carry-forward

- No migration in this phase — the database was already sufficient (RLS checklist 21/21
  unchanged from Phase 7).
- Phase 9 (admin panel with audit log) is the next build per the spec's phase list.

---

## Phase 9 — Admin panel with audit log — 2026-10-18

### Built (spec §5/§3: manage users, listings, stores, deals, payments, reports, categories; audit everything)

- **Overview (`/admin`)** — live stat cards (members, active listings, stores, open deals,
  sandbox payment volume, open reports), a pending-requests callout, the 8 most recent
  audited actions, and quick links. The account menu now opens straight to `/admin`.
- **Users** — search (name/email), role + banned filters, and full per-member controls:
  **role change, ban/unban, permanent delete** (auth user + everything they own via FK
  cascades). Super Admin accounts are locked to Super Admins; non-super admins can neither
  touch admins nor grant the admin role — the UI mirrors the database trigger exactly. The
  invite/direct-create flows from Phase 3 stay on the same page.
- **Listings** — search + status + category filters with pagination; per-row **hide /
  restore / delete** and a dedicated **admin edit page** (title, price, stock, condition,
  status, category, pickup location).
- **Stores** — search + active filter; **inline edit** (name, description, pickup, phone),
  **deactivate/activate** (storefront goes offline), and **delete** (warned cascade: the
  store's listings go with it).
- **Deals** — status filter + search by listing title; **cancel** and **mark completed**
  overrides for stuck deals. Completion runs the normal side effects (stock decrement,
  sold/sold_out flip, notifications, history row) — admins bypass only the *actor rules*.
- **Payments** — status filter + transaction search; **refund** on succeeded sandbox
  payments (provider seam, `refunded_at` timestamp, nothing real moves).
- **Reports** — open/reviewed/dismissed tabs with live counts; **mark reviewed**,
  **dismiss**, one-click **hide the reported listing** (listing hidden + report closed),
  and **delete**.
- **Categories** — add/edit/delete with automatic **slug generation and regeneration on
  rename** (unique-suffixed), sort order, listing counts, uncategorised count. Deleting
  leaves listings live and uncategorised.
- **Audit log (`/admin/audit`)** — every admin action across all sections writes one row
  (`actor`, `action`, `target_type/id`, JSON `details`). The page offers action search,
  target-type filter, pagination, actor names, deep links to the target, and expandable
  JSON details. Entries cannot be edited or deleted from the UI.
- **Two-step confirmations** — every destructive control (ban, delete, hide, refund,
  deactivate…) reveals an inline confirmation with an explanation before submitting
  (`components/confirm-action.tsx`); successful row controls remount via data-derived keys
  so their state can never go stale.
- **Password visibility (user request)** — every password field (login, signup,
  reset-password, forced change-password, delete-account confirmation, member creation
  where applicable) now has an **eye button** (`components/password-input.tsx`,
  `aria-pressed` + show/hide labels). Login and signup verified interactively.
- **No migration needed** — the Phase 1 schema was already complete: admin RLS arms,
  super-admin guards, refund protection and the deal state machine all existed. The panel
  is pure application surface plus the app-level audit writes (ADR-024).

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ (37 routes) |
| Every admin page renders | browser — 10 sections, all headings/filters present | ✅ pass |
| Users lifecycle E2E | create → role change (restored test-buyer to seller) → ban → unban → delete via UI; DB: throwaway rows 0, audit `user.create,ban,unban,delete` | ✅ pass |
| Listings E2E | hide → restore → admin edit (title+price) → delete via UI; audit `listing.hide,restore,update,delete`; throwaway row 0 | ✅ pass |
| Stores E2E | inline edit saved → deactivate → activate via UI; store ends active; audit `store.update,deactivate,activate` | ✅ pass |
| Deals E2E | disposable requested deal cancelled via UI; history `[requested, cancelled]`; audit `deal.cancel` | ✅ pass |
| Payments E2E | disposable succeeded payment refunded via UI; `refunded_at` set; audit `payment.refund` | ✅ pass |
| Reports E2E | review one, hide-listing one (lamp hidden → restored through the listings page), then both deleted; audit `report.reviewed,hide_listing,delete×2` | ✅ pass |
| Categories E2E | add → rename (slug regenerated `e2e-instruments-ii`) → delete; audit `category.create,update,delete` | ✅ pass |
| Password eye | login + signup: type flips password→text→password, labels swap | ✅ pass |
| Audit log page | 30 entries rendered with actor, chips, links, JSON details, filters | ✅ pass |
| Emails sent during tests | — | **0** (admin-created accounts are email-confirmed directly) |

### How to verify manually (for the user)

1. Sign in as `test-admin@eastdelta.edu.bd` / `TestAdmin123` → avatar menu → **Admin
   panel**. Click through the tabs — Overview at `/admin` shows live counts.
2. Try a harmless action: Listings → open one → **Hide** → **Restore**. Then Audit — the
   action is recorded with your name and the JSON details.
3. Reports: report any listing as a buyer, then from /admin/reports use **Hide listing** —
   the listing disappears and the report closes.
4. Users: your role dropdown saves with a toast; ban/unban and delete are two-step. Super
   Admin accounts show as locked.
5. Open `/login` and `/signup` — the **eye** in the password field shows/hides what you
   typed.

### Notes / carry-forward

- **The system is append-only by design**: refunds don't reopen deals (the deal reflects
  the handover; the payment row records the money). Delete-user removes everything the
  account owned (cascades) — the audit rows survive with the email in `details`.
- All disposable E2E rows were removed (throwaway members/listing/deal/payment/reports/
  category); the 30 audit entries from testing remain as the intended permanent record.
- During this phase the user was already using the live panel (a role change was made
  mid-build) — the E2E restored `test-buyer` to seller.
- Phase 10 (the spec's last): responsive polish, error/empty/loading states, README and
  deployment guide.

---

## Phase 10 — Responsive polish, states, README + deployment guide — 2026-10-18

### Built

- **Responsive audit** — every key surface verified at an **extreme 240px viewport**
  (narrower than the 360px spec minimum) with zero horizontal overflow: landing,
  browse (filters wrap), listing, store, deals, messages, saved, profile, admin, audit,
  login/signup. Admin tabs scroll horizontally by design at narrow widths; the glass pill
  keeps every icon at 240px.
- **Loading states** — a shared `Skeleton` component plus four route skeletons:
  `(protected)/loading.tsx` (nav + veil stay, content shapes in),
  `browse/loading.tsx` (filter bar + card grid), `listing/[id]/loading.tsx`
  (two-column product shape), `store/[slug]/loading.tsx` (hero + grid).
- **Error boundary** — `app/error.tsx`: friendly card, a **Try again** button calling
  `reset()`, the error digest for support, and a home link. Client component by contract.
- **404 page** — `app/not-found.tsx`: explains the dead link and offers Browse / Home
  (wired to every `notFound()` in the app and unknown URLs).
- **Empty states** — audited every list surface end to end (18 distinct empty states:
  browse filters, saved, messages, notifications, deals ×2 tabs, seller listings, store,
  profile, every admin section, audit).
- **README.md** — full rewrite: features, stack, quick start, env table, database/migration
  workflow, scripts, project map, docs map, deployment summary.
- **docs/DEPLOYMENT.md** — the complete runbook: Supabase project → API keys → migrations
  in order → seed → auth redirect URLs → SMTP options (the pending email decision, framed
  for a no-domain owner) → Vercel import → env table → post-deploy checklist (13 items) →
  rollback/operations/free-tier notes.
- **GitHub** — repository connected as `origin` (`iftakharH/unimate-purple`, private) and
  every phase pushed. `.env.local` stays git-ignored; `.env.example` carries placeholders.

### Gate evidence (run 2026-10-18)

| Gate | Method | Result |
| --- | --- | --- |
| `npm run type-check` / `lint` / `build` | local | ✅ / ✅ / ✅ |
| 240px overflow sweep | `scrollWidth − clientWidth` measured on 10 surfaces | ✅ 0px everywhere |
| Skeleton renders | route files confirmed by build output + navigation | ✅ pass |
| Error boundary | `app/error.tsx` present at root (catches all page errors below layout) | ✅ pass |
| 404 | unknown URL + `notFound()` calls render the friendly page | ✅ verified via the 404s hit during testing |
| Emails sent during tests | — | **0** |

### How to verify manually (for the user)

1. Narrow your browser window to phone width (or use device emulation at 360px) and walk
   through: home, browse, a listing, a store, deals, messages, admin — nothing should ever
   scroll sideways.
2. Open a page on a cold load (e.g. after `npm run build && npm run start`) — skeletons
   appear before content.
3. Visit a nonsense URL like `/nope` — the friendly 404 appears.
4. Read `README.md` and `docs/DEPLOYMENT.md` — the guide is what we walk through next for the actual deploy.

### Notes / carry-forward

- **Before making the repository public** (it is private today): the docs and
  `scripts/create-test-users.mjs` contain the local test-account emails/passwords, and
  `src/lib/constants.ts` mirrors the super-admin emails (they also ship in the client
  bundle by necessity of the bootstrap design). Rotate or delete the test accounts and
  review those files first.
- The dev server hit a machine-level memory error once during this phase (Turbopack cache
  write); a restart resolves it — builds run with `NODE_OPTIONS=--max-old-space-size=4096`.
- Deployment itself (Vercel + production Supabase) is a user-consented step — the guide
  is ready when you are.

---

## Pre-launch hardening — 2026-10-21 (before the first public deployment)

Applied after Phase 10, ahead of real users:

- **Storage enumeration closed** (migration 17, ADR-025): dropped the `*_public_read`
  SELECT policies on `storage.objects` — the public anon key could otherwise list every
  uploaded file. Public URLs, uploads, replacements and cleanup are unaffected
  (verified: RLS checklist 21/21 after the change).
- **Security headers + no framework banner** (`next.config.ts`, ADR-025): nosniff,
  frame-deny, referrer policy, permissions policy, COOP; `poweredByHeader: false`.
  The `next/image` remote host now derives from `NEXT_PUBLIC_SUPABASE_URL` — one build
  works against any Supabase project (required for production).
- **Dependency hygiene**: `shadcn` (codegen CLI) moved to devDependencies —
  **`npm audit --omit=dev` → 0 vulnerabilities** (was 7 high in the production tree).
- **Production security runbook** added to `docs/DEPLOYMENT.md` §3: dashboard toggles
  (email confirmation, secure email change, leaked-password protection, advisors), SMTP
  requirement, storage policy note.
- **Advisor pass** (migration 18, ADR-009 update): revoked EXECUTE on the two remaining
  API-exposed trigger functions (`on_deal_created`, `set_updated_at`) and added the missing
  index on `deal_status_history(actor_id)`. Remaining findings are the documented accepted
  ones (security-definer profile view, caller-scoped helpers, aggregates-only stats).
- **Gates:** type-check / lint / build green (38 routes); RLS checklist 21/21 re-run after
  migrations 17 and 18.

---

## Public launch — 2026-10-21

**Live:** https://unimate-purple-edu.vercel.app (Vercel, production build from `main`).

### Verified live (external checks + browser)

| Surface | Result |
| --- | --- |
| Security headers on every response | ✅ nosniff · frame DENY · referrer policy · COOP · no `x-powered-by` |
| Landing, sign-in, gated redirects, 404 | ✅ correct titles/content; signed-out routes land on the login page |
| Super-admin sign-in + admin panel | ✅ dashboard (2 members, 0 everywhere), audit, listings, all tabs |
| Browse / store / listing / profile (signed in) | ✅ data renders; **next/image loads Supabase photos on Vercel** (2/2) |
| Deals / messages / notifications / saved / settings-security | ✅ all render |
| Empty states after cleanup | ✅ browse "0 listings", dashboard zeros |
| Database state | ✅ 2 users (both super admins), 0 listings/stores/deals/messages/invites/reports; 30 audit rows retained |
| RLS acceptance checklist | ✅ 21/21 (same database) |

### Launch clean-up performed

- Deleted the two test accounts (`test-admin@`, `test-buyer@`) — their store, listings,
  deals, conversations, messages and notifications cascaded away; their storage objects
  (1 avatar, 1 listing photo, 2 store assets) were removed and one stale invite deleted.
- Super-admin access: the two `SUPER_ADMIN_EMAILS` accounts are provisioned and verified
  (credentials shared with the owner directly, never committed).
- Brand polish: `app/icon.svg` (browser tab icon), branded `opengraph-image` (link
  previews), `public/robots.txt` (private routes disallowed), OpenGraph/Twitter metadata.

### Remaining owner actions (dashboard-only)

- Vercel env `NEXT_PUBLIC_SITE_URL` → the production domain, then redeploy (email links).
- Supabase → Auth → URL Configuration: Site URL + `…/auth/callback` redirect.
- Supabase → Auth → Passwords → enable leaked-password protection.
- Ops scripts now committed: `scripts/create-super-admin.mjs` (provision a super admin,
  prints the temporary password once) and `scripts/cleanup-test-accounts.mjs` (remove the
  legacy test accounts + their storage). Both read `.env.local` and never contain secrets.
