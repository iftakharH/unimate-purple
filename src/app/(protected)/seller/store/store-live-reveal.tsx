"use client";

import { m } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EASE_OUT, spring } from "@/lib/motion";

/**
 * THE signature moment (docs/DESIGN.md): the seller's store going live,
 * seen on their first visit after approval. Three beats —
 *   1. anticipation: the scene fades in (~180ms)
 *   2. action: the checkmark draws, the name settles, the LIVE badge stamps
 *   3. settle: spring with slight overshoot on the card
 *
 * Rules honoured: under ~800ms of choreography, skippable (Esc / click /
 * Skip / auto after ~3.6s), never blocking (the store already exists and the
 * page behind shows a static success alert), and `MotionConfig
 * reducedMotion="user"` degrades every beat to an instant state change.
 * Rendering is server-truth only (the `?welcome=1` navigation) — no client
 * storage checks, which would break hydration.
 */
export function StoreLiveReveal({
  businessName,
  slug,
}: {
  businessName: string;
  slug: string;
}) {
  const router = useRouter();
  const [visible, setVisible] = useState(true);

  const dismiss = useCallback(() => {
    setVisible(false);
    router.replace("/seller/store");
  }, [router]);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(dismiss, 3600);
    return () => clearTimeout(timer);
  }, [visible, dismiss]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, dismiss]);

  if (!visible) return null;

  return (
    <m.div
      role="dialog"
      aria-label="Your store is live"
      className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18, ease: EASE_OUT }}
      onClick={dismiss}
    >
      <m.div
        className="elev-3 relative w-full max-w-md rounded-3xl border bg-card p-8 text-center"
        initial={{ opacity: 0, y: 18, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ ...spring.gentle, delay: 0.08 }}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 text-xs text-muted-foreground transition-colors duration-fast hover:text-foreground"
        >
          Skip
        </button>

        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-success/12">
          <svg
            viewBox="0 0 24 24"
            className="size-8 text-success"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <m.path
              d="M4 12.5 9.5 18 20 6.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, ease: EASE_OUT, delay: 0.28 }}
            />
          </svg>
        </div>

        <m.p
          className="mt-5 text-sm font-medium text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.34 }}
        >
          Your store is live
        </m.p>

        <m.h2
          className="mt-1 text-3xl font-semibold tracking-tight"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...spring.gentle, delay: 0.42 }}
        >
          {businessName}
        </m.h2>

        <m.div
          className="mt-4"
          initial={{ opacity: 0, scale: 1.6, rotate: -6 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ ...spring.bouncy, delay: 0.62 }}
        >
          <Badge className="gap-1.5 py-1">
            <span className="live-dot size-1.5 rounded-full bg-primary-foreground" aria-hidden />
            LIVE
          </Badge>
        </m.div>

        <m.div
          className="mt-7 flex flex-wrap justify-center gap-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: EASE_OUT, delay: 0.7 }}
        >
          <Button render={<Link href={`/store/${slug}`} />} nativeButton={false} size="sm">
            View your store page
          </Button>
          <Button variant="ghost" size="sm" onClick={dismiss}>
            Start adding details
          </Button>
        </m.div>
      </m.div>
    </m.div>
  );
}
