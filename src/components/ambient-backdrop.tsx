import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * The ambient veil — the backdrop composition on every page.
 *
 * Three stacked CSS-only layers (see the .ambient-* block in globals.css):
 * a masking veil so the composition dissolves into the page, a fine dot grid
 * for structure, and drifting colour fields. Hues come from src/lib/colors.ts
 * and are set here as CSS custom properties so both layers inherit them.
 *
 * Display-only, behind content, dark-mode aware. Never place content inside.
 */
export function AmbientBackdrop({
  hueA,
  hueB,
  className,
  height = "620px",
}: {
  hueA: number;
  hueB: number;
  className?: string;
  height?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "ambient-veil pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden",
        className,
      )}
      style={
        {
          height,
          "--ab-hue-a": String(hueA),
          "--ab-hue-b": String(hueB),
        } as CSSProperties
      }
    >
      <div className="ambient-dots absolute inset-0" />
      <div className="ambient-backdrop ambient-drift grain absolute -inset-x-[12%] -bottom-[40%] -top-[45%]" />
    </div>
  );
}
