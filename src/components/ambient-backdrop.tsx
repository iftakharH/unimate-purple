import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

/**
 * Layered colour-field backdrop for public pages (home, browse, listings).
 *
 * Pure CSS: three soft radial fields over a slow transform-only drift with
 * the shared grain on top. Display-only, behind content, dark-mode aware.
 * Hues come from src/lib/colors.ts — never raw values at call sites.
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
        "pointer-events-none absolute inset-x-0 top-0 -z-10 overflow-hidden",
        className,
      )}
      style={{ height }}
    >
      <div
        className="ambient-backdrop ambient-drift grain absolute -inset-x-[12%] -bottom-[40%] -top-[45%]"
        style={
          {
            "--ab-hue-a": String(hueA),
            "--ab-hue-b": String(hueB),
          } as CSSProperties
        }
      />
    </div>
  );
}
