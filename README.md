# Unimate

A campus marketplace for **East Delta University** students. Everyone joins as a **Buyer**;
approved sellers run their own store page; admins run the platform from a full control
panel. Deals are agreed in-app, paid on campus or through a **sandbox** checkout, and
completed with a handover both sides confirm. Currency: **BDT (৳)**.

**Status:** all 10 spec phases built — see [`docs/PROGRESS.md`](docs/PROGRESS.md) for the
phase-by-phase gate evidence.

## Features

- **Auth & access** — campus-domain sign-up, invite flow, account recovery, forced password
  change, TOTP MFA, sign-out-everywhere, account deletion. Product data is sign-in gated.
- **Stores & listings** — seller requests with admin review, store editor (logo/banner,
  pickup location), listings with photo upload + drag-reorder, sold/sold-out lifecycle.
- **Marketplace** — browse with URL-synced search / filters / sort / pagination, listing
  pages with gallery, saves, reports, and realtime chat with read receipts.
- **Deals & payments** — offers in two modes (pay on campus, pay in app), a state-machine
  tracker with a real timeline, and a mock payment provider behind a swappable interface —
  no real money, no card data ever stored.
- **Notifications** — live bell with unread counts; every deal transition and admin decision
  lands in the feed.
- **Admin panel** — overview dashboard, users (roles, bans, delete), listings, stores, deals,
  payments (sandbox refunds), reports, categories — **every action recorded in an audit log**.

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript (strict) · Tailwind CSS v4 ·
shadcn/ui (Base UI) · Supabase (Postgres, Auth, Storage, Realtime, RLS) ·
Zod v4 · React Hook Form · TanStack Query · Motion · Vercel (deploy target).

## Quick start (local)

```bash
# Node 20.9+ (tested on 22)
npm install            # .npmrc pins legacy-peer-deps — see docs/DECISIONS.md ADR-005

cp .env.example .env.local   # fill in the values (see the table below)
npm run dev                  # http://localhost:3000
```

### Environment variables

| Name | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Publishable / anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Server actions only — never expose |
| `SUPER_ADMIN_EMAILS` | server | Auto-promoted admins, comma-separated |
| `ALLOWED_EMAIL_DOMAIN` | server | Self-signup domain restriction |
| `NEXT_PUBLIC_SITE_URL` | public | Base URL for email redirect links |
| `NEXT_PUBLIC_SHOW_SANDBOX_BADGE` | public | Mock-checkout sandbox badge |
| `NEXT_PUBLIC_CURRENCY` | public | `BDT` |

### Database

The schema lives in [`supabase/migrations/`](supabase/migrations) — **append-only**, applied
in order (ADR-007). Seed data (categories) is in `supabase/seed.sql`. The canonical security
proof is [`supabase/tests/rls_checklist.sql`](supabase/tests/rls_checklist.sql) — 21 checks;
re-run it after **any** schema or policy change.

Apply migrations with the Supabase CLI (`supabase link`, `supabase db push`) or paste each
file into the SQL editor in order. Full walkthrough: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) → http://localhost:3000 |
| `npm run type-check` | TypeScript strict check (`tsc --noEmit`) |
| `npm run lint` | ESLint (flat config) |
| `npm run build` | Production build |
| `node scripts/create-test-users.mjs` | Throwaway local test accounts (`--delete` to remove) |
| `node scripts/create-super-admin.mjs` | Provision a super-admin account (prints a temp password) |
| `node scripts/cleanup-test-accounts.mjs` | Remove the legacy test accounts + their data/storage |

## Project map

```
src/app        routes — (auth) · (protected) · browse · listing · store
src/components shared UI (glass nav, cards, motion, admin controls, password input…)
src/lib        auth guards, admin/audit helpers, colors, motion presets, Supabase clients
supabase/      migrations (schema source of truth), seed, RLS checklist
docs/          PROGRESS (phases + evidence) · DECISIONS (ADRs) · DESIGN · DEPLOYMENT
```

## Documentation

| Document | Contents |
| --- | --- |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Full technical reference — stack, data model, security, routes |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Phase-by-phase status, gate evidence, manual test scripts |
| [`docs/DECISIONS.md`](docs/DECISIONS.md) | Architecture decisions with reasoning (ADR-001…025) |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Design system — palette, motion budget, navbar rules |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Supabase + Vercel production setup, step by step |

## Deployment

Summarised: create the Supabase project → apply migrations + seed → deploy to Vercel with
the env vars above → point `NEXT_PUBLIC_SITE_URL` at the Vercel domain and add it to the
Supabase auth redirect URLs. The full runbook, including the post-deploy checklist and
rollback notes, is in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
