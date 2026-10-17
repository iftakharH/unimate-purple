import type { Transition, Variants } from "motion/react";

/**
 * Shared motion tokens (docs/DESIGN.md + design-motion reference).
 * Named presets only — never inline magic numbers in components.
 */

export const spring = {
  /** toggles, checkboxes, small controls */
  snappy: { type: "spring", stiffness: 400, damping: 30 },
  /** panels, cards, sheets — a little overshoot */
  gentle: { type: "spring", stiffness: 260, damping: 26 },
  /** things being thrown / stamped */
  bouncy: { type: "spring", stiffness: 300, damping: 18 },
  /** large surfaces that must not overshoot */
  heavy: { type: "spring", stiffness: 180, damping: 28, mass: 1.2 },
} as const satisfies Record<string, Transition>;

/** Exit faster than entry — slow exits feel broken. */
export const EASE_OUT: [number, number, number, number] = [0.2, 0, 0, 1];

/** Entrance choreography: one parent delay, children stagger off it. */
export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.06, staggerChildren: 0.045 } },
};

export const riseItem: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE_OUT } },
};

export const bannerItem: Variants = {
  hidden: { opacity: 0, scale: 1.03 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE_OUT } },
};
