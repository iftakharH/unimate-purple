"use client";

import { domAnimation, LazyMotion, MotionConfig } from "motion/react";

/**
 * Lazy-loaded motion (≈15–20 KB instead of the full bundle — ADR-010 /
 * DESIGN.md budget). `strict` enforces `m.*` components only, so nothing
 * accidentally pulls in the eager bundle.
 *
 * `reducedMotion="user"` makes every m.* animation collapse to an instant,
 * dignified state change when the OS asks for reduced motion.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
