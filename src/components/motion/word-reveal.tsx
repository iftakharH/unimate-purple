"use client";

import { m } from "motion/react";

import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Word-by-word display reveal for big headlines (the landing's kinetic type).
 * Words rise + fade on a stagger; reduced motion collapses it to a plain fade
 * via the global MotionConfig. Screen readers get the whole string once.
 */
export function WordReveal({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const words = text.split(" ");

  return (
    <m.span
      className={cn("inline-block", className)}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { delayChildren: delay, staggerChildren: 0.055 } },
      }}
      aria-label={text}
    >
      {words.map((word, index) => (
        <m.span
          key={`${word}-${index}`}
          aria-hidden
          className="inline-block will-change-transform"
          variants={{
            hidden: { opacity: 0, y: "0.55em" },
            show: {
              opacity: 1,
              y: 0,
              transition: { duration: 0.55, ease: EASE_OUT },
            },
          }}
        >
          {word}
          {index < words.length - 1 ? "\u00A0" : ""}
        </m.span>
      ))}
    </m.span>
  );
}
