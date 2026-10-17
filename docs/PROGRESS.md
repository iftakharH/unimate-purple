# Unimate — Build progress

> Living document. Updated at the END of every phase, before the user is asked to test.
> A phase is **DONE** only when all three gates are green and the user confirms the manual
> test. Current phase: **awaiting user test of Phase 2**.

## Phase overview

| # | Phase | Status | Gate evidence |
| --- | --- | --- | --- |
| 0 | Pre-flight, scaffold, Supabase wiring, docs | **DONE** | ✅ type-check / lint / build |
| 1 | Database schema, RLS, storage buckets, seed | **DONE — user proceeded** | 17/17 RLS checks, advisors clean |
| 2 | Auth: domain restriction, super-admin bootstrap, invite/direct-create, password flows | **Awaiting user test** | See Phase 2 section |
| 3 | Roles, seller requests, stores, store pages | Not started | — |
| 4 | Listings: create/edit with photos, browse, search, filters, product page | Not started | — |
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
