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

---

## ADR-007 — Migration policy + the two security bugs the RLS checklist caught (2026-10-18)

**Decision.**
1. **Migration policy.** From Phase 1 completion onward, migration files are strict
   append-only history; corrections ship as new files. During the Phase 1 build-up
   (pre-freeze) three corrective migrations were folded back into the numbered files so a
   fresh `supabase db reset` produces the final shape directly; the live database's
   applied history is that superset. Applied chain: `core_platform` → `seller_requests_stores`
   → `catalog_listings` → `social_messaging` → `deals_payments` → `reports_audit_storage`
   → `seed_categories` → `harden_super_admin` → `fix_trigger_guard_self_bootstrap` →
   `mark_super_admin_helpers_stable` → `advisor_hardening` → `advisor_indexes_policies`.
2. **Canonical security proof.** `supabase/tests/rls_checklist.sql` — 17 checks that create
   throwaway users, assume `authenticated`/`anon` roles with forged JWT claims, attempt the
   forbidden operations, and roll everything back. **Re-run after any schema/policy change.**

**Bugs it caught (both fixed before any UI existed):**
- `ensure_super_admin(p_emails)` accepted the super-admin list as a caller argument — any
  authenticated user could promote themselves via RPC. Fixed: no-arg function; the SQL list
  is the only source of truth.
- A protection-trigger bypass keyed on `current_user = 'postgres'` silently disabled the
  role guard for everyone — inside a SECURITY DEFINER function, `current_user` is always
  the function owner. Fixed: one narrowly-scoped self-bootstrap rule evaluated purely from
  JWT claims + stored email; identical behaviour in tests and production, no hidden context
  detection.

---

## ADR-008 — Config helpers are STABLE, never IMMUTABLE (2026-10-18)

**Decision.** `super_admin_emails()`, `is_super_admin_email()` and `allowed_email_domain()`
are `STABLE`.

**Why.** PostgreSQL constant-folds `IMMUTABLE` results into the cached plans of calling
functions. With pooled connections, editing the super-admin list (a migration away) could
stay invisible to sessions holding pre-change plans — reproduced in testing when an
in-transaction helper swap was ignored by an already-cached plan. `STABLE` evaluates per
execution and cannot be folded.

**Scope.** `slugify()` stays `IMMUTABLE` — it is a pure text function with no config input.

---

## ADR-009 — Accepted Supabase advisor findings (2026-10-18)

**Accepted, with reasons:**
- `security_definer_view` ERROR on `public.public_profiles`: the view exists precisely to
  expose the safe column subset (`id, full_name, avatar_url, bio, role, created_at`) of
  every profile to everyone while the table keeps phone/bans/`must_change_password` private
  via RLS. Switching it to `security_invoker` would make it useless for public pages.
- RPC-executable `is_admin()` / `is_banned()` (anon + authenticated): required by RLS policy
  expressions; they return only booleans about the calling user.
- RPC-executable `ensure_super_admin()` (authenticated): the single intentional RPC — it can
  only ever promote the caller and only when the caller's own email is on the hardcoded list.
- `unused_index` INFO ×21: expected on an empty database.

**Fixed instead of accepted:** 7× missing `search_path` pins; ~20 internal trigger functions
exposed at `/rest/v1/rpc/*` (EXECUTE revoked from anon/authenticated); 6× missing foreign-key
indexes; the categories and payments double-policy overlaps (migrations 10–11).

**Final advisor state (verified):** security = only the accepted findings above; performance =
only `unused_index` INFO, expected on an empty database. Never blindly "fix" the accepted
items above — read this ADR first.

---

## ADR-010 — Design direction & the three technical answers (2026-10-18)

**Decision** (user-confirmed; system documented in `docs/DESIGN.md`):

- **Art direction:** *Calm marketplace* — clean and trustworthy, generous whitespace, soft
  rounded cards, ONE purple accent. Reference energy: Vinted × Linear. This supersedes the
  ad-hoc styling of the scaffold.
- **Dark mode:** light default, persisted toggle.
- **3D scope:** opt-in WebGL hero — landing page only, lazy-loaded with a tested non-WebGL
  fallback; never inside the logged-in product UI.
- **Motion:** `motion` (React) used through `LazyMotion` + `m` with the `domAnimation`
  bundle (≈15–20 KB gz instead of ≈34 KB) — springs where physics belongs, CSS elsewhere.
- **JS budget:** visual layer ≤ ~30 KB gzipped, verified at each phase end; target device is
  a mid-tier Android on campus wifi.
- Accessibility target: WCAG AA.

**Why.** The skill rules require art direction to be the user's choice, not an accumulation of
library defaults — scaffolded-default UI reads as unfinished. The three technical answers
carry real cost (bundle size, fallback testing) and are painful to reverse later, so they are
recorded before the first screen is built.

**Reversal.** Each answer is a token-level or dependency-level change; DESIGN.md is the single
place to update.

---

## ADR-011 — Motion intensity upgraded; signature moment = store-live reveal (2026-10-18)

**Decision.** The user asked for a more animated, "eye-catching" feel (with the explicit
instruction to avoid generic AI-slop design). Interpretation per the design-motion skill:
**lively at crafted moments, restrained everywhere else** — not motion everywhere (the
skill's documented failure mode #2). Concretely:

- One **signature moment**: the seller's store-going-live reveal, three beats
  (anticipation → checkmark draw + name settle → LIVE badge stamp), under ~800 ms,
  skippable, non-blocking, degraded to an instant state under reduced motion.
- Orchestrated storefront hero entrance (parent-driven stagger, ≤6 items, ~650 ms) —
  the single above-the-fold exception to "no animation on load" in product UI.
- CSS scroll-driven reveals (`animation-timeline: view()`, zero JS, `@supports`-gated),
  ambient transform-only banner drift, hover/press micro-interactions.
- Store banner hues constrained to 252–319° (violet→indigo) for on-brand cohesion.

**Why.** The user owns the taste decision (skill rule: ask, never assume). Restraint is what
keeps it from reading as amateur; the moments are what make it memorable.

**Reversal.** Motion intensity dials via `src/lib/motion.ts` presets and the reveal component;
documented in DESIGN.md.

---

## ADR-012 — One colour-generation system; ambient colour fields (2026-10-18)

**Decision.** The user asked for a more colourful, engaging page background. The crafted
answer (not rainbow gradients — that is the slop failure mode): every generated colour in the
product comes from **one rule set**, `src/lib/colors.ts`:

- **Curated partner palette** — six hues (262, 240, 210, 330, 165, 45) chosen as partners of
  the brand violet (292). Components never hand-pick a hue.
- **Deterministic per entity** — store banners, category tiles and listing-card placeholders
  hash from slug/id → same colour every render, no hydration risk, stable identity.
- **`AmbientBackdrop`** — three layered radial colour fields + 26 s transform-only drift +
  grain, hues passed from the page, *dark mode designed separately* (lower lightness/chroma,
  not inverted). Applied to home, browse, listing; the height is per-page.
- **Placeholders** tint with alpha over the theme background so they read soft in light and
  muted in dark without a second colour table.
- Intensity was raised once on user feedback (chroma ↑ ~35 %, alpha ↑ ~15 %) — still a wash,
  not a neon flood.

**Why.** "Colourful" and "premium" pull in opposite directions unless the colour is *systematic*.
A generated-but-curated palette keeps the brand reading as one product while every surface still
glows with variety — and the rule set means Phase 5+ surfaces get colour for free, consistently.

**Reversal.** All of it lives in `src/lib/colors.ts` and the `.ambient-backdrop` block in
`globals.css`; tone down by editing those two places.

---

## ADR-013 — Listing photos upload on pick; orphan files accepted for now (2026-10-18)

**Decision.** Photos are uploaded **browser → Supabase Storage the moment they are chosen**
(`listing-images/{uid}/…`, enforced by storage RLS), shown as preview tiles, and only the final
ordered URL list is persisted with the listing on submit. Abandoning the form can leave orphaned
files in Storage — accepted at campus scale, cleanup job deferred. Edit and delete **do** clean
up: removed/withdrawn URLs are parsed back to storage paths and removed best-effort.

**Why.** The alternatives lose: (a) upload-on-submit needs a listing id first → a two-phase flow
with a half-created listing on any failure; (b) routing file bodies through a Server Action hits
the 1 MB body limit and copies every byte twice; (c) the project convention is already
"browser → Storage directly" (AGENTS.md). Preview-on-pick is also simply better UX.

**Reversal.** A `storage.objects` sweep for files whose URL appears in no `listing_images` row
restores hygiene later without changing any client flow.

---

## ADR-014 — Browse state lives in the URL; classic pagination over infinite scroll (2026-10-18)

**Decision.** Every browse filter (q, category, condition, min, max, sort, store, page) is a
**search param**, read server-side (SSR, no client fetch loop); the filter bar writes the URL
with `router.replace` (debounced search). Pagination is classic 24-per-page Prev/Next with a
total count and "page X of Y" — not infinite scroll.

**Why.** URL state makes every filtered view shareable, bookmarkable, back-button-correct and
works signed-out; the server renders fully, so there is no loading-spinner waterfall and no
extra JS. Classic pagination is honest about totals (useful for a marketplace) and trivial to
verify; infinite scroll adds JS, loses position on Back, and hides the total. Revisit only if
campus listings outgrow a few hundred.

**Reversal.** Swap the grid for a client fetch + sentinel when traffic justifies it; the URL
grammar stays identical.

---

## ADR-015 — Marketplace requires sign-in; products are students-only (2026-10-18)

**Decision.** Per the user's Phase 5 directive ("can not see any product without
login/creating account"): the marketplace is gated end to end.

- **Pages**: `/browse`, `/listing/[id]`, `/store/[slug]` redirect anonymous visitors to
  `/login?next=…` (browse preserves its full query string; the login screen shows a "continue"
  hint). Login returns the visitor to the exact target; the default is the marketplace home.
- **Signed-out home is a landing, not a catalogue**: hero, aggregate stats behind a lock chip,
  category rail, feature cards, footer — **zero products**.
- **API layer (migration 13)**: `listings`, `listing_images` and `stores` SELECT policies now
  require the `authenticated` role — the anon key alone reads nothing. RLS checklist extended
  with T18–T20 proving it (20/20).
- **Storage stays public-read**: photo URLs are unguessable UUID paths and only discoverable
  through the now-gated rows. Making buckets private would force signed-URL plumbing through
  `next/image` for no real security gain at this scale. Revisit if buckets ever hold anything
  sensitive.

**Why.** The user owns this product rule; this is also normal for a campus-only marketplace
(trust + privacy + funnel clarity). The important part is that the rule is enforced at the
data layer, not just by hiding pages — a redirect is UX, RLS is the boundary.

**Reversal.** Re-opening public browsing = drop the page redirects and restore the three
policies in a new migration (append-only). One file, one migration, no app rebuild.

---

## ADR-016 — Ambient veil v2: one backdrop system on every page + site footer (2026-10-18)

**Decision.** The user asked for backgrounds that are "more elegant and effective" on
**every** page. The composition (`.ambient-veil` + `.ambient-dots` + `.ambient-backdrop`,
via one `AmbientBackdrop` component) is now:

1. **Masked** — the whole composition dissolves into the page with a mask gradient instead of
   ending at an arbitrary edge (the single biggest elegance win).
2. **Structured** — a fine dot grid at 1%-ish alpha gives the wash definition; static while
   the colour drifts beneath it.
3. **Richer colour** — larger, better-placed fields (brand hue anchored top-left, partner
   hue top-right, crown glow) and a **separately designed dark mode** (deeper, +chroma) — not
   an inverted light version.
4. Applied to **all page families**: landing/marketplace, browse, listing, storefront, every
   protected screen (subtle, 380 px, 70% opacity) and the auth screens (previously a bespoke
   glow — retired). One system, one file to tune.

A shared `SiteFooter` (brand, Marketplace/Account/Campus columns that adapt to role, legal
line) runs on the marketplace surfaces; the landing page uses it per the user's request.

**Why.** Consistency reads as design; bespoke per-page decoration reads as drift. Subtlety is
enforced by tokens (alpha + mask + opacity), so "everywhere" never becomes "noisy" — protected
work screens keep 70% of an already-soft wash.

**Reversal.** Tone/intensity = two CSS blocks; coverage = remove the component from a shell.
