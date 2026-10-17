# Unimate — Design system

> Confirmed with the user 2026-10-18 (see docs/DECISIONS.md ADR-010). This file is the
> single source of truth for visual and motion decisions. Components consume tokens —
> no raw values in components.

## Direction

**Calm marketplace** — clean and trustworthy with generous whitespace, soft rounded
cards and ONE purple accent. Reference energy: Vinted (marketplace clarity) × Linear
(product polish). Light default; dark mode via a persisted toggle. WCAG AA minimum.

## The three technical answers

| Question | Decision |
| --- | --- |
| 3D scope | **Opt-in WebGL hero** — landing page only, lazy-loaded, non-WebGL fallback tested. Never inside the product UI. |
| Motion library | **`motion` (React)** used through `LazyMotion` + `m` components with the `domAnimation` feature bundle — springs where they count, ~15–20 KB instead of the ~34 KB full bundle. |
| JS budget | Visual-layer JavaScript **≤ ~30 KB gzipped**, verified at each phase end. Target device: mid-tier Android on campus wifi. |

## Type

- One family: **Geist** (already loaded via `next/font`, variable `--font-geist-sans`).
- Scale (rem): `0.75 / 0.875 / 1 / 1.125 / 1.4 / 1.75 / 2.2` — hierarchy comes from contrast, not more sizes.
- Body line-height 1.6; measure capped at ~70ch; tracking tightens as size grows (`-0.02em` from 1.75rem up).
- Tabular numerals for prices and counts.

## Colour

- Tokens defined once in `src/app/globals.css` (Tailwind v4 `@theme` / CSS variables), built in **OKLCH**.
- Primary: purple ramp; exactly ONE primary action colour. Neutral surfaces carry the UI.
- Semantic tokens: success / warning / destructive / info — never colour alone to convey state.
- Dark mode: designed, not inverted — lower chroma, elevate with surface lightness plus a 1px lit top edge (shadows do not read on dark).

### Generated colour (ADR-012)

Anything colourful beyond the tokens is **generated, never hand-picked** — one rule set in
`src/lib/colors.ts`:

- **Curated partner hues** `[262, 240, 210, 330, 165, 45]` — cyan/blue/rose/green/amber chosen
  against brand violet (292). No component invents a hue.
- **Deterministic per entity**: `hueForStore(slug)` (252–319° only), `categoryHues(slug)`,
  `listingHues(id)` — same input → same colour, so nothing shifts between renders.
- **AmbientBackdrop** (`.ambient-backdrop` + drift + grain, `src/components/ambient-backdrop.tsx`):
  three layered radial fields behind public pages; hue pair passed per page; dark mode has its own
  (lower lightness/chroma) values. Intensity raised once on user feedback (2026-10-18).
- **Placeholder tinting**: duotone gradients use alpha over the theme background — soft on light,
  muted on dark, from one definition.
- The listing grid therefore glows with per-item variety while every hue stays brand-adjacent.

## Space, radius, depth

- Spacing: 4-based scale — 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Radius: cards 16px, controls 10px; nested radii shrink by the padding amount.
- Depth: **two-part shadows** (tight contact + wide ambient), max 3 elevation levels. Hairline borders.
- Glass (backdrop-filter) only on overlays — never inside scrolling lists.

## Motion

- Duration tokens: 120 / 180 / 240 ms; springs for anything movable and interruptible.
- Product UI: nothing animates on page load. Landing page: at most one orchestrated entrance.
- One signature moment: **the store-going-live reveal** on a seller's first visit after
  approval (`store-live-reveal.tsx`) — three beats, under ~800 ms, skippable, degraded to an
  instant state under `prefers-reduced-motion`.
- Motion intensity upgraded by the user 2026-10-18 (ADR-011): *lively at crafted moments,
  restrained everywhere else*. Concretely: orchestrated entrances on store pages, CSS
  scroll-driven reveals, ambient banner drift (26 s, transform-only), hover/press micro-
  interactions. Still zero animation-on-load in the working product UI.
- All JS motion goes through `motion`'s `m.*` components under `LazyMotion strict`
  (`src/components/motion-provider.tsx`); `MotionConfig reducedMotion="user"` handles the
  OS preference for every JS animation. Named spring presets live in `src/lib/motion.ts`.
- Scroll reveals use the CSS `animation-timeline: view()` API — zero bytes, `@supports`-
  gated, and browsers without it render the final state (never a stuck animation).

## Store banners

Deterministic hue per store slug, constrained to **252–319°** (violet→indigo) so every store
is visually distinct while staying inside the brand family. Overlaid with the shared grain
utility and a slow transform-only drift; real uploaded banners replace the gradient entirely.

## States

Empty, loading, error and success states are designed per screen from the start —
they are most of the screen and they are where products look unfinished.

## Verification checklist (run at phase ends)

- [ ] Contrast AA: 4.5:1 body, 3:1 large text and UI borders
- [ ] Focus-visible ring on every focusable element; keyboard navigable end to end
- [ ] Responsive at 375 / 768 / 1280 with no horizontal scroll; touch targets ≥ 44px
- [ ] No layout shift on load (fonts declared, images sized)
- [ ] `prefers-reduced-motion` respected for CSS and JS motion
- [ ] No raw colour/size values in components — tokens only
