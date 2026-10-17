# Unimate

A clean, modern marketplace for **East Delta University** students — browse and buy campus
listings, message sellers in real time, and deal in **BDT (৳)**. Sellers get their own store
page; admins run the platform from a full control panel.

**Status:** 🚧 Under construction — Phase 0 of 11 complete (`docs/PROGRESS.md`).
**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Supabase
(Postgres, Auth, Storage, Realtime, RLS) · Zod · React Hook Form · TanStack Query.

---

## Quick start (local)

```bash
# 1. Node 20.9+ required (tested on 22)
node -v

# 2. Install dependencies (.npmrc pins legacy-peer-deps — see docs/DECISIONS.md ADR-005)
npm install

# 3. Configure environment
#    Copy the template and fill in the values, then run the dev server.
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with Turbopack → http://localhost:3000 |
| `npm run type-check` | TypeScript strict check (`tsc --noEmit`) |
| `npm run lint` | ESLint (flat config) |
| `npm run build` | Production build |

## Documentation map

| Doc | Audience | Content |
| --- | --- | --- |
| `unimate-agent-prompt.md` | Everyone | The full product spec — source of truth for scope |
| `docs/PROGRESS.md` | Everyone | Phase-by-phase build status, gate evidence, manual test steps |
| `docs/DECISIONS.md` | Everyone | Why things are the way they are (ADR-style) |
| `AGENTS.md` | Developers & AI agents | Repo layout, conventions, Next 16 gotchas, working agreement |

## Full setup & deployment guide

The complete step-by-step guide (Supabase project setup, running migrations, creating storage
buckets, configuring Auth with SMTP, deploying to Vercel, first Super Admin signup) is written
in **Phase 10** once every feature it documents exists. Until then, `docs/PROGRESS.md` records
exactly which parts are live.
