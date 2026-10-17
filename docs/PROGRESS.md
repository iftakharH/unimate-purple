# Unimate — Build progress

> Living document. Updated at the END of every phase, before the user is asked to test.
> A phase is **DONE** only when all three gates are green and the user confirms the manual
> test. Current phase: **awaiting user test of Phase 0**.

## Phase overview

| # | Phase | Status | Gate evidence |
| --- | --- | --- | --- |
| 0 | Pre-flight, scaffold, Supabase wiring, docs | **Awaiting user test** | See below |
| 1 | Database schema, RLS, storage buckets, seed | Not started | — |
| 2 | Auth: domain restriction, super-admin bootstrap, invite/direct-create, password flows | Not started | — |
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
