# Unimate — architecture & technology reference

> The complete technical description of the platform as launched.
> Product scope: [unimate-agent-prompt.md](../unimate-agent-prompt.md) ·
> Phase history: [PROGRESS.md](PROGRESS.md) · Decisions: [DECISIONS.md](DECISIONS.md) ·
> Deployment runbook: [DEPLOYMENT.md](DEPLOYMENT.md)

**Live:** https://unimate-purple-edu.vercel.app
**Repository:** `iftakharH/unimate-purple` (private) · `main` deploys automatically

---

## 1. Product summary

Unimate is a **campus marketplace for East Delta University students**. Everyone joins as a
**Buyer**; approved **Sellers** run a store page; **Admins** run the platform. Deals are
negotiated in-app, paid **on campus** or through a clearly-labelled **sandbox checkout**,
and completed with a handover both parties confirm. Currency: **BDT (৳)**.

| Role | Capabilities |
| --- | --- |
| Buyer | Browse (sign-in gated), save, message, make offers, pay, confirm receipt |
| Seller | Everything a buyer, plus store editor and listing CRUD (approval required) |
| Admin | Users (roles/bans/delete), listings, stores, deals, payments/refunds, reports, categories, audit log |
| Super Admin | Two hardcoded emails; only they can grant/revoke the admin role; immune to demotion/deletion |

## 2. Technology stack

### Application

| Layer | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router, RSC, Server Actions, Turbopack) | 16.4.2 |
| UI runtime | React / React DOM | 19.3.0 |
| Language | TypeScript (strict) | 5.x |
| Styling | Tailwind CSS v4 (Turbopack loader) | 4.x |
| Component system | shadcn/ui on Base UI | `@base-ui/react` 1.9 |
| Icons | lucide-react | 1.59 |
| Motion | Motion (LazyMotion, `m.*` primitives) | 14.3 |
| Forms | React Hook Form + Zod resolvers | 7.90 / 5.9 |
| Validation | Zod (v4) | 4.6.7 |
| Data fetching/mutations | Next.js Server Components + Server Actions; TanStack Query | 5.104 |
| Toasts | Sonner | 2.0.8 |
| Theming | next-themes (light/dark) | 0.4.6 |

### Backend & data (Supabase)

| Concern | Implementation |
| --- | --- |
| Database | PostgreSQL 17 (Supabase, `ap-southeast-1`) |
| API | PostgREST (auto REST) + RPC for whitelisted functions |
| Auth | Supabase Auth (email/password, TOTP MFA, sessions via `@supabase/ssr` 0.12) |
| Authorization | Row Level Security as the security boundary + `SECURITY DEFINER` helpers |
| Storage | Supabase Storage — buckets `avatars`, `listing-images`, `store-assets` (public serving, owner-only writes) |
| Realtime | Supabase Realtime (chat + live notification badge) |
| Server SDK | `@supabase/supabase-js` 2.118 (browser, server, service-role clients) |

### Platform & operations

| Concern | Tool |
| --- | --- |
| Hosting | Vercel (Next.js production builds, per-push deploys) |
| DNS/TLS | Vercel-managed (`*.vercel.app`), HSTS on custom domains |
| Headers | `next.config.ts` — nosniff, frame-deny, referrer policy, permissions policy, COOP |
| Images | `next/image` + Supabase storage host derived from `NEXT_PUBLIC_SUPABASE_URL` |
| Lint / types | ESLint 9 flat config, `tsc --noEmit` |
| Testing proof | `supabase/tests/rls_checklist.sql` — 21 checks, transactional rollback |
| Advisors | Supabase Security & Performance advisors; accepted findings in ADR-009 |

## 3. System architecture

```
                ┌──────────────────────────────────────────────┐
  Browser ──────►  Vercel  ·  Next.js 16 (App Router)          │
  (HTTPS)        │   RSC pages · Server Actions · Proxy (tokens)│
                └───────────────┬──────────────────────────────┘
                                │ supabase-js (3 typed clients)
                                ▼
                ┌──────────────────────────────────────────────┐
                │  Supabase                                    │
                │  Postgres 17 ── RLS policies ── triggers     │
                │  Auth (email, MFA, sessions)                 │
                │  Storage (3 buckets, owner-folder writes)    │
                │  Realtime (chat, notification badge)         │
                └──────────────────────────────────────────────┘
```

- **Server Components** render every page with data fetched under the viewer's JWT.
- **Server Actions** perform all writes; each re-checks authorization itself
  (page guards are never trusted as the only check).
- **The service-role client** exists only server-side (`server-only` import guard) and only
  for flows that truly need elevation: inviting/creating members, deleting accounts,
  reading auth-email lookups. Every call site checks "caller is admin" first.
- **Session refresh** runs in `src/proxy.ts` (Next 16 Proxy, formerly middleware) via
  `@supabase/ssr` cookie rotation.

## 4. Data model

16 tables, 9 enums, 18 ordered migrations (append-only; ADR-007).

| Table | Purpose | Access rule (summary) |
| --- | --- | --- |
| `profiles` | Member rows (name, avatar, bio, role, ban, forced password flag) | own row + admins |
| `invited_emails` | Invite gate + role for non-campus addresses | admins |
| `seller_requests` | Seller applications with review outcome | own + admins |
| `stores` | One store per seller (unique owner, slug, assets, pickup) | active stores to signed-in; owner + admins write |
| `categories` | Seeded taxonomy (11 categories) | public read; admins write |
| `listings` | Products (price BDT, condition, qty, status) | active or own; admins see all |
| `listing_images` | Ordered photos (position) | via listing visibility |
| `saved_items` | Buyer saves | own only |
| `conversations` | One thread per (listing, buyer) | participants only |
| `messages` | Chat messages (immutable body) | participants only |
| `deals` | Negotiated deals + state machine | participants + admins |
| `deal_status_history` | Immutable transition log (actor, note) | participants + admins |
| `payments` | Sandbox payment records (immutable fields) | payer + admins; refund admin-only |
| `notifications` | In-app notifications with deep links | own only |
| `reports` | Listing/member/store/deal reports | reporter + admins |
| `admin_audit_log` | Every admin action (actor, action, target, JSON) | admins |

**Key enums:** `user_role(buyer,seller,admin)` · `listing_status(active,sold,sold_out,hidden)`
· `deal_status(requested,accepted,rejected,paid,handed_over,completed,cancelled)` ·
`payment_status(pending,succeeded,failed,refunded)` · `report_status(open,reviewed,dismissed)`.

**Database-enforced business rules (triggers):** signup domain gate + super-admin
bootstrap; role/ban protection; deal state machine (actor-checked transitions, completion
decrements stock and flips `sold`/`sold_out`); deal history + notifications on every
transition; payment immutability and admin-only refunds; message immutability; listing
image limit; audit stamping; `updated_at` maintenance.

## 5. Security model

- **RLS everywhere**: every table has policies; the anon key can read only what the product
  displays publicly (categories; aggregates via `marketplace_stats`).
- **Marketplace gating (ADR-015)**: listings, photos, stores and profiles are readable only
  by signed-in users — enforced at the database, not just the UI.
- **Three clients, one boundary**: browser/anon, server (user JWT), service-role
  (server-only). The service key never ships to the client.
- **Super admins** are two hardcoded emails (`SUPER_ADMIN_EMAILS`); only they can promote or
  demote admins, and their accounts cannot be banned or deleted.
- **Storage**: public buckets serve images by URL; object policies allow only owner-folder
  INSERT/UPDATE/DELETE. Read policies were removed (migration 17) so the anon key cannot
  enumerate uploads (ADR-025).
- **Audit**: every admin action writes an append-only row with actor, action, target and
  JSON details; the UI offers no edit/delete path.
- **Transport/app headers**: Vercel TLS + security headers; no framework banner
  (`poweredByHeader: false`).
- **Dependencies**: `npm audit --omit=dev` → 0 vulnerabilities (ADR-025).
- **Proof**: 21-check RLS acceptance suite (`supabase/tests/rls_checklist.sql`) — 21/21 on
  the production database after every schema change.

## 6. Feature inventory

| Area | Included |
| --- | --- |
| Auth | Domain-restricted signup (DB + UI), email verification, recovery, forced password change, TOTP MFA, sign-out everywhere, account deletion, password eye toggle |
| Profiles | Public profiles (banner hue, bio, badges, store card, active listings), account settings |
| Stores | Seller request queue, store editor (logo/banner, contact, pickup), animated storefront |
| Listings | Photo upload + drag reorder, create/edit/delete, sold/sold-out lifecycle, colour-generated placeholders |
| Discovery | URL-synced search/filters/sort/pagination, categories rail, featured home rail |
| Commerce | Saves, reports, real-time chat (read receipts, live badge), offers (campus/in-app), deal tracker with timeline, sandbox payment provider seam, notifications |
| Admin | Dashboard, users, listings (+edit), stores, deals, payments (refunds), reports (one-click hide), categories, audit log |
| Platform | Loading skeletons, error boundary, 404, empty states, dark mode, responsive 240–1440 px, reduced-motion-safe animation |

## 7. Routes

```
Public      /  (landing)   /login /signup /forgot-password /reset-password
            /change-password /verify-email /banned /auth/callback
Gated       /browse  /listing/[id]  /store/[slug]
Signed-in   /saved /deals /deals/[id] /messages /messages/[id] /notifications
            /profile/[id] /settings /settings/security /become-seller
Seller      /seller/store /seller/listings /seller/listings/new
            /seller/listings/[id]/edit
Admin       /admin /admin/users /admin/requests /admin/listings
            /admin/listings/[id] /admin/stores /admin/deals /admin/payments
            /admin/reports /admin/categories /admin/audit
Metadata    /icon.svg /opengraph-image /robots.txt
```

## 8. Design system (summary)

- **Direction:** calm marketplace — soft neutral surfaces, one purple accent (`--primary`),
  a single lime accent token for live badges; deterministic colour generation
  (`src/lib/colors.ts`) for banners, category tiles and photo placeholders.
- **Motion budget:** one signature moment (storefront entrance, ADR-011); micro
  interactions only; every animation reduced-motion-safe; springs are named presets
  (`src/lib/motion.ts`).
- **Navigation:** floating glass pill whose width is a continuous function of scroll
  progress — 90% viewport at the top, content-width at the bottom, nothing hidden
  (ADR-020/022/023).
- **Typography:** Geist Sans / Geist Mono; kinetic word-reveal headlines on the landing.
- **Surfaces:** ambient veil (mask + dot grid + generated colour fields) on every page
  (ADR-016).

## 9. Local development

```bash
npm install                 # .npmrc: legacy-peer-deps (ADR-005)
cp .env.example .env.local  # fill in Supabase values
npm run dev                 # http://localhost:3000
```

| Command | Purpose |
| --- | --- |
| `npm run type-check` | TypeScript strict check |
| `npm run lint` | ESLint flat config |
| `npm run build` | Production build |
| `node scripts/create-test-users.mjs` | Email-free throwaway accounts |
| `node scripts/create-super-admin.mjs` | Provision a super admin (prints temp password) |
| `node scripts/cleanup-test-accounts.mjs` | Remove legacy test accounts + data/storage |

Migrations apply in filename order (`supabase/migrations/`), seed with `supabase/seed.sql`,
prove security with `supabase/tests/rls_checklist.sql`.

## 10. Operations

- **Deploys:** `main` → Vercel build (verified auto-deploy). Preview URLs per PR.
- **Rollback:** Vercel *Promote to Production* on a previous deployment; database changes
  are forward-only migrations.
- **Monitoring:** Vercel runtime logs; Supabase logs + advisors (security/performance).
- **Emails:** Supabase Auth (default sender today; SMTP configurable in-dashboard with no
  code change).
- **Backups:** Supabase free tier daily backups; restore via dashboard.

## 11. Known limitations (deliberate)

1. **Payments are sandbox-only** — the `PaymentProvider` seam is ready for a real gateway;
   no card data is ever collected.
2. **Public storage URLs** — photos are reachable by their (unguessable) public URL; a
   documented trade-off for rendering simplicity and CDN performance (ADR-013/025).
3. **Single Supabase project shared by local and production** — chosen by the owner for
   cost simplicity; a separate dev project can be added later.
4. **Default email sender** is rate-limited until SMTP credentials are configured.
5. **Search** uses Postgres `ilike` + trigram indexes — no external search engine.
6. **Notifications are in-app only** (no email/push fan-out).
7. **Single region** (`ap-southeast-1`) — appropriate for a Bangladesh campus.
