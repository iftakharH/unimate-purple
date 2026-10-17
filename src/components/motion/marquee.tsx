import { cn } from "@/lib/utils";

/**
 * Infinite horizontal marquee (CSS-only, transform, pauses for reduced
 * motion). Duplicate the list once and translate -50%.
 */
export function Marquee({
  items,
  className,
}: {
  items: string[];
  className?: string;
}) {
  const doubled = [...items, ...items];

  return (
    <div
      aria-hidden
      className={cn("relative select-none overflow-hidden border-y", className)}
    >
      <div className="marquee-track flex w-max items-center py-3">
        {doubled.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="flex items-center whitespace-nowrap text-sm font-medium uppercase tracking-[0.32em] text-muted-foreground"
          >
            <span className="px-5 sm:px-7">{item}</span>
            <span className="size-1.5 shrink-0 rounded-full bg-[var(--neon)]" />
          </span>
        ))}
      </div>
    </div>
  );
}
