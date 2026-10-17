"use client";

import { m, useMotionValue, useSpring } from "motion/react";
import type { ReactNode } from "react";

import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Magnetic wrapper — the child leans toward the pointer (bounded, springy)
 * and springs back on leave. Pointer-only; keyboard users are unaffected.
 */
export function Magnetic({
  children,
  className,
  strength = 12,
}: {
  children: ReactNode;
  className?: string;
  strength?: number;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, spring.snappy);
  const springY = useSpring(y, spring.snappy);

  return (
    <m.div
      className={cn("inline-block", className)}
      style={{ x: springX, y: springY }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        x.set(((event.clientX - rect.left) / rect.width - 0.5) * strength);
        y.set(((event.clientY - rect.top) / rect.height - 0.5) * strength);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
