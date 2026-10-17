<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Unimate — developer & AI agent guide

> Read this file first, then `docs/PROGRESS.md` for the current build state.
> The product spec (`unimate-agent-prompt.md`, repo root) is the source of truth for scope.

## What this is

Unimate is a marketplace for East Delta University students. Everyone starts as a **Buyer**;
approved **Sellers** get a store page; **Admins** manage the platform. Currency is **BDT (৳)**.
Two hardcoded Super Admins (`SUPER_ADMIN_EMAILS`) can never be demoted.

## Stack (locked by the user — do not change without asking)

- Next.js 16 App Router + TypeScript strict + Tailwind CSS v4 + shadcn/ui (Base UI) + lucide-react
- Supabase: Postgres, Auth, Storage, Realtime, RLS via `@supabase/ssr`
- Zod v4, React Hook Form, TanStack Query, next-themes
- Deploy target: Vercel (frontend) + Supabase cloud

## Working agreement (important)

1. Build **one phase at a time** (see `docs/PROGRESS.md`). After a phase: update the docs,
   run all three gates, start the dev server, then **stop** and wait for the user's explicit
   "continue" before the next phase.
2. Gates for every phase: `npm run type-check`, `npm run lint`, `npm run build` — all green.
3. Never claim a gate you did not actually run. Report results honestly.
4. Ask before: deploying to production, enabling any paid service, creating public repos,
   sending real email, or any destructive database action.
5. Secrets: never commit, never log, never print. `.env.local` is git-ignored.

## Repository layout

```
src/
  app/                      Next.js App Router routes (pages, layouts, route handlers)
    layout.tsx              Root layout (fonts, metadata)
    page.tsx                Home (placeholder until Phase 4)
  components/ui/            shadcn/ui components (Base UI based — do NOT assume Radix APIs)
  lib/
    env.ts                  Public env (NEXT_PUBLIC_*) validated with Zod — client-safe
    env.server.ts           Server-only env (service role key, super admin emails)
    supabase/
      client.ts             Browser client (Client Components)
      server.ts             Server client (Server Components / Actions / Route Handlers)
      admin.ts              Service-role client — BYPASSES RLS, server-only, guard every use
      proxy.ts              Session refresh helper (getAll/setAll cookie pattern)
  proxy.ts                  Next 16 Proxy (formerly middleware.ts) — session refresh only
supabase/
  migrations/               Ordered SQL migrations — schema lives HERE, never ad-hoc dashboard
                            edits. Phase-1 freeze ended at migration 10; append-only from now on.
  seed.sql                  Idempotent seed (categories). Demo listings arrive in Phase 4.
  tests/rls_checklist.sql   Canonical 17-check RLS proof. Re-run after ANY schema/policy change.
                            Safe: creates throwaway users and rolls everything back.
docs/
  PROGRESS.md               Phase status, gate evidence, manual test steps
  DECISIONS.md              Architecture decisions with reasoning (ADR-style)
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server (Turbopack) → http://localhost:3000 |
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config) |
| `npm run build` | Production build (Turbopack) |

## Next.js 16 conventions you MUST follow (differ from older training data)

- `src/proxy.ts` replaces `middleware.ts`; export a function named `proxy`. Runtime is Node.js.
- `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` are **async** — always `await`.
- No `next lint`; ESLint runs directly (`npm run lint`).
- `revalidateTag(tag, profile)` requires the second argument; `updateTag()`/`refresh()` exist for
  Server Actions.
- Turbopack is the default bundler for dev AND build.
- `LayoutProps<"/">` / `PageProps<"/route">` global type helpers come from `next typegen`
  (auto-generated). Full docs: `node_modules/next/dist/docs/` — consult before writing code.

## Supabase conventions

- Three clients only, from `src/lib/supabase/*` — never construct ad-hoc clients.
- `getUser()` / `getClaims()` in server code — never trust `getSession()` server-side.
- RLS is the security boundary. Every table gets RLS + policies. Admin access flows through the
  `is_admin()` security-definer SQL function, never through client-side role checks.
- The service-role key is used ONLY in server actions/route handlers via `createAdminClient()`,
  and every call site checks authorization first.
- Schema changes = new file in `supabase/migrations/`, applied in order. No dashboard edits.
- After any schema/policy change: re-run `supabase/tests/rls_checklist.sql` and the Supabase
  advisors. Accepted advisor findings are listed in docs/DECISIONS.md ADR-009 — do not
  "fix" the accepted items without reading that first.

## Environment variables

| Name | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | server | Never exposed; needed from Phase 2 |
| `SUPER_ADMIN_EMAILS` | server | Auto-admin emails, comma-separated |
| `ALLOWED_EMAIL_DOMAIN` | server | Self-signup domain restriction |
| `NEXT_PUBLIC_SITE_URL` | public | Base URL for email redirects |
| `NEXT_PUBLIC_SHOW_SANDBOX_BADGE` | public | Mock-checkout sandbox badge |
| `NEXT_PUBLIC_CURRENCY` | public | `BDT` |

## Known toolchain notes

- `.npmrc` sets `legacy-peer-deps=true` — required for the `@hookform/resolvers` ↔ zod-v4 peer
  graph (see ADR-005). Keep it; Vercel reads it too.
- `npm audit` reports high advisories in `braces`/`fast-glob` — dev tooling only, no runtime
  exposure; the fix would downgrade the shadcn CLI (see ADR-006). Do not run `audit fix --force`.

