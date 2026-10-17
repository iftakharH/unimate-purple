# Unimate — Decisions log (ADR)

Reasoning behind every non-obvious choice. Newest entries at the bottom.
Format: decision → why → alternatives → how to reverse.

---

## ADR-001 — Dedicated Supabase project `unimate-purple` (2026-10-18)

**Decision.** A brand-new Supabase project `unimate-purple` was created in the
"Purple Tech" org, region `ap-southeast-1` (Singapore — lowest latency for Bangladesh),
free tier. Project ref: `jleztdtwkctvuogaechh`.

**Why.** An earlier project named "Unimate" (ref `dfkizzmsxwwxkrlsvpdb`) contained 14 empty
tables from a previous attempt that did NOT match this spec (`chats` vs `conversations`,
`seller_verifications` vs `seller_requests`, missing `stores`, `payments`, `notifications`,
`reports`, `admin_audit_log`, `invited_emails`). Schema drift is the most common source of
mid-build failures, so the user chose a clean project over a destructive reset.

**Alternatives.** (a) Drop-and-rebuild inside the old project — rejected by user choice;
(b) keep and align old tables — rejected: silent column drift, higher long-term cost.

**Reversal.** Point `.env.local` at another project ref; migrations are self-contained.

---

## ADR-002 — Email confirmation stays ON; custom SMTP before Phase 2 (2026-10-18)

**Decision.** Supabase Auth email confirmation remains enabled. The user supplies SMTP
credentials (host, port, username, app password, sender) which will be configured in the
Supabase dashboard before Phase 2 (auth flows).

**Why.** Real verification emails from day one; Supabase's built-in sender is rate-limited
(~2–4/hour on free tier) and unsuitable even for development testing of invite flows.

**Reversal.** Dashboard-only change; no code impact.

---

## ADR-003 — Visual direction: purple accent, light default + dark toggle (2026-10-18)

**Decision.** Soft neutral palette with a single purple accent; light mode default, dark mode
via a persisted toggle (`next-themes`). Tokens live in `src/app/globals.css` (Tailwind v4
`@theme` / CSS variables).

**Why.** Confirmed by the user (repo folder `unimate-purple`). Full art direction pass happens
together with the first real UI (Phase 3+).

**Reversal.** Token swap in one file.

---

## ADR-004 — Classic rendering model; Cache Components disabled (2026-10-18)

**Decision.** `cacheComponents: true` and `partialPrefetching: true` (pre-enabled by the
create-next-app template) were REMOVED from `next.config.ts`. The app uses the classic
Next.js rendering model: dynamic rendering where auth/personal data is involved, `<Suspense>`
for streaming where useful.

**Why.** Cache Components is the new Next 16 model but it errors the build on any uncached
dynamic data outside `<Suspense>` — every Supabase-guide pattern and most of this app's pages
(auth state, realtime chat, per-user data) are dynamic. The user's top priority is a
phase-by-phase build with no interruptions; the classic model is the lowest-risk path and
what all Supabase SSR documentation assumes.

**Note.** `partialPrefetching` REQUIRES `cacheComponents` (config validation fails otherwise),
which is why both were removed together.

**Reversal.** Re-enable `cacheComponents: true` (+ `partialPrefetching: true`) and adopt the
Cache Components patterns per `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`.
Do this deliberately as its own phase, never mid-feature.

---

## ADR-005 — `.npmrc` with `legacy-peer-deps=true` (2026-10-18)

**Decision.** The repo pins `legacy-peer-deps=true` in `.npmrc`.

**Why.** `@hookform/resolvers` (v5) declares an *optional* peer chain
`@typeschema/main → @typeschema/zod → zod@^3` that collides with the installed `zod@4`
(pulled in by the shadcn CLI tooling). npm's strict resolver (npm 11) refuses the tree without
this flag. The flag makes installs deterministic on every machine and on Vercel.

**Alternatives.** (a) `--force` per install — non-reproducible, not read by Vercel;
(b) downgrade zod to v3 — loses zod v4; (c) npm `overrides` on a peerOptional — fragile.

**Reversal.** Remove `.npmrc` once `@hookform/resolvers` drops the `@typeschema` chain or
the ecosystem resolves zod v3/v4 coexistence.

---

## ADR-006 — Accepted (documented) audit advisories in dev tooling (2026-10-18)

**Decision.** 9 high-severity `npm audit` findings (single advisory: `braces` stack-exhaustion
DoS, reached via `fast-glob`/`micromatch`) are accepted for now.

**Why.** Every path is dev-time only: `eslint-config-next`, `@shadcn/registry`, the `shadcn`
CLI and `ts-morph`. Nothing ships to users; the app's runtime dependencies are unaffected.
npm's own fix would downgrade `shadcn` to v1.0.0 — a breaking change to the component tooling
for zero runtime benefit.

**Reversal.** Re-run `npm audit` when shadcn/next release patched dependency trees; upgrade
then. Never run `npm audit fix --force`.
