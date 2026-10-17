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

## Space, radius, depth

- Spacing: 4-based scale — 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Radius: cards 16px, controls 10px; nested radii shrink by the padding amount.
- Depth: **two-part shadows** (tight contact + wide ambient), max 3 elevation levels. Hairline borders.
- Glass (backdrop-filter) only on overlays — never inside scrolling lists.

## Motion

- Duration tokens: 120 / 180 / 240 ms; springs for anything movable and interruptible.
- Product UI: nothing animates on page load. Landing page: at most one orchestrated entrance.
- One signature moment later, at the marketplace core action (deal completion) — under 800 ms,
  skippable, replaced by an instant dignified change under `prefers-reduced-motion`.
- All motion goes through the shared primitives (created with the first animated feature);
  `prefers-reduced-motion` is honoured for CSS *and* JS motion.

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
