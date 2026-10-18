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

---

## ADR-017 — Floating glass navbar: 90% at rest, compact on scroll (2026-10-18)

**Decision.** Per the user's directive, every page family gets the same floating navbar: a
translucent glass pill (backdrop-blur 20px + saturate, hairline border, layered shadow)
fixed near the top. At the top of the page it spans **~90% of the viewport**; past ~24px of
scroll it **morphs into a compact capsule that hugs its content** and sheds secondary links
(Browse, Sell, Saved, theme; the avatar, bell and messages stay). The morph is a motion
`layout` animation on a shared spring — measured, not guessed at CSS interpolation between
`%` and `fit-content`.

- One component (`glass-nav.tsx`, client) fed by one server wrapper (`site-nav.tsx`) — the
  public and protected shells render the exact same pill, including live unread counts.
- Content pages gained matching top padding since the nav is now an overlay.

**Why.** A floating pill is the modern navbar idiom and it frees the old sticky bar; the
shrink-on-scroll keeps actions reachable without eating vertical space after the hero. One
component means the two shells can never drift apart.

**Reversal.** Delete the scroll effect (or pin `compact = true`) for a static pill; the
glass look is one utility class.

---

## ADR-018 — Design manifesto pass: kinetic landing, neon accent, monochrome dark (2026-10-18)

**Decision.** The user asked for a decisive craft upgrade (their brief: reject the grid,
typography first, kinetic energy, tactile micro-interactions, no purple-gradient dark modes).
Applied where it expresses best, without breaking product usability:

- **Landing page (the showpiece)**: asymmetric hero; display type at
  `clamp(2.6rem, 8.5vw, 7rem)` with tight tracking; word-by-word kinetic reveal; outlined
  stroke line (`-webkit-text-stroke` with an explicit colour — `currentColor` vanishes
  against a transparent fill); magnetic CTA (`pointer-follow`, bounded, spring-back); CSS
  marquee divider; bento category tiles; horizontal snap-scroll features; inverted black
  closing block with neon hover.
- **New accent token `--neon`** (electric lime, `oklch(0.87 0.24 132)`): unread badges,
  marquee dots, live markers — sharp accents over soft surfaces, never fills.
- **Dark mode de-clouded**: the dark veil's chroma halved toward near-black monochrome with
  a violet hint, per the brief's distaste for purple-gradient dark modes. Light mode keeps
  its colourful veil.
- **Product pages stay clarity-first**: grids remain for catalog surfaces (a marketplace
  grid is a tool, not a layout sin); they inherit the navbar, the depth language, tactile
  buttons and the accent. `prefers-reduced-motion` degrades every kinetic piece.

**Why.** The brief's energy belongs to the marketing surface; applying it wholesale to
catalogue and form screens would trade usability for spectacle. This keeps one coherent
brand: loud where it entertains, calm where it works.

**Reversal.** All kinetic pieces are single components (`motion/word-reveal`, `magnetic`,
`marquee`); the accent is one token; the dark veil is one CSS block.

---

## ADR-019 — Mock payments behind a provider seam (2026-10-18)

**Decision.** Spec §7 implemented literally: a `PaymentProvider` interface
(`createPayment` / `confirmPayment` / `refund`) with `MockPaymentProvider` as the only
implementation (`src/lib/payments/provider.ts`, server-only). The checkout walks a payments
row **pending → succeeded** — that UPDATE is deliberately what the existing database trigger
listens for to flip the deal to `paid`. The mock succeeds deterministically (demos
shouldn't flake); failures are simulation territory for the admin payments screen (Phase 9).

- **Guardrails**: only method type, status, amount, transaction id and timestamps are
  persisted (matching the schema); card numbers/CVV/expiry are never collected, so they can
  never be stored or logged. Sandbox labelling is prominent in the UI.
- A real gateway replaces one file.

**Why.** The interface is the spec's own requirement, and routing every UI action through it
now means swapping in a real provider later touches no page code. The two-step row walk
exists because the deal state machine is trigger-driven and insert-time status would bypass
it.

**Reversal.** Implement the interface with a real provider and change one export.

---

## ADR-020 — Navbar v2: width is a continuous function of scroll (2026-10-18)

**Decision.** Supersedes ADR-017's binary toggle. The floating glass pill now maps **page
scroll progress linearly** from ~90% viewport width to **its own measured content width**:
the brand and every action stay visible at all times — spacing and width close in, nothing
is hidden or removed. Measured against the user's own example ("20% scrolled → 85% of the
previous size"): 89% at top → 76% at 20% (≈0.85 × 90%) → 22% at the bottom. The minimum is
measured from the real children (a `w-full` row's `scrollWidth` equals its client width —
taught by the first attempt), smoothed by a heavy spring.

**Why.** The correction was explicit: shrink the contents closer, don't remove them. A
linear progress map matches the user's arithmetic, and measuring the content guarantees the
pill can never clip what it holds.

**Reversal.** One component; tune the transform range or revert to any easing.

---

## ADR-021 — No marketplace numbers to the public (2026-10-18)

**Decision.** The signed-out landing shows **zero numeric marketplace data**. The "Right now
inside" card is qualitative (what's traded + the students-only rule). Aggregate counts
render only for signed-in users. `marketplace_stats()` (migration 15) stays in the database —
aggregate-only, still granted for future signed-in dashboards — but the landing no longer
calls it.

**Why.** User directive. Counts dilute the gate and disclose activity levels that belong
inside the community.

**Reversal.** Re-render the RPC values in the landing's card (one block).

---

## ADR-022 — Navbar v3: frame-tracked progress (2026-10-18)

**Decision.** Supersedes ADR-020's *mechanism*; the mapping curve is unchanged (linear,
90% viewport → measured content width). Two defects found while building Phase 8, both
fixed:

1. **No-scroll-range guard.** On a page shorter than the viewport, motion's default
   `scrollYProgress` divides by a zero range and reports `1` — the pill snapped to its
   minimum immediately. Progress is now `scrollY / (scrollHeight − innerHeight)`, clamped,
   with a `range ≤ 4px → 0` guard.
2. **Frame tracking.** The value is computed in a `requestAnimationFrame` read (one number
   per visible frame) rather than a scroll-event subscription: it follows smooth scrolling
   exactly, cannot miss events, and it also re-measures the content when the viewport width
   changes without a resize event being observed (observed in the automation environment;
   the self-heal costs one integer compare per frame).

**Why.** Both defects were reproducible: the short-page snap on desktop, and drift between
the measured width and reality after viewport changes. The rAF read is the standard
technique for scroll-linked animation and removes every dependency on event delivery.

**Reversal.** One component; the transform range and curve are untouched.

---

## ADR-023 — Mobile keeps the glass pill; Profile lives in it (2026-10-18)

**Decision.** The spec's layout section suggests a phone bottom tab bar (Home, Browse,
Saved, Messages, Profile). **User decision: not built.** The glass pill stays the single
navigation on every viewport, and Profile was added to it directly (person icon beside the
bell), plus **My profile** in the account menu. Below `sm` (640px) the brand renders
icon-only so the pill always fits inside 90% of even a 360px viewport with all items
visible.

**Why.** The pill is the product's navigation identity since Phase 6; a second mobile
navigation would duplicate state, eat vertical space, and dilute the design. Icon-only
branding below `sm` is a static responsive rule (like Browse/Sell hiding) — explicitly not
scroll-driven, per the ADR-020 correction.

**Reversal.** `.text-*` reset on the brand wordmark + remove the pill's profile button;
building the tab bar later would be a new component, not a rewrite.
