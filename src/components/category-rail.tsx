import {
  BedDouble,
  BookOpen,
  Dumbbell,
  GraduationCap,
  Laptop,
  Package,
  PenLine,
  Shirt,
  Smartphone,
  Ticket,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { categoryHues } from "@/lib/colors";
import { cn } from "@/lib/utils";

/** DB stores lucide component names; map them explicitly (no dynamic imports). */
const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  Smartphone,
  Laptop,
  PenLine,
  BedDouble,
  Shirt,
  Dumbbell,
  UtensilsCrossed,
  GraduationCap,
  Ticket,
  Package,
};

export type RailCategory = { id: string; name: string; slug: string; icon: string | null };

/**
 * Colourful category tiles — each category owns a deterministic duotone from
 * src/lib/colors.ts, so the rail is vivid yet always brand-adjacent.
 */
export function CategoryRail({
  categories,
  activeSlug,
  className,
}: {
  categories: RailCategory[];
  activeSlug?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6",
        className,
      )}
    >
      {categories.map((category) => {
        const { a, b } = categoryHues(category.slug);
        const Icon = ICONS[category.icon ?? ""] ?? Package;
        const active = category.slug === activeSlug;

        return (
          <Link
            key={category.id}
            href={`/browse?category=${category.slug}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group elev-1 relative overflow-hidden rounded-2xl border bg-card p-3 outline-none transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2 focus-visible:ring-2 focus-visible:ring-ring",
              active && "ring-2 ring-primary",
            )}
          >
            <div
              className="grid size-9 place-items-center rounded-xl text-foreground/70"
              style={{
                backgroundImage: `linear-gradient(135deg, oklch(0.83 0.11 ${a} / 0.55), oklch(0.85 0.1 ${b} / 0.5))`,
              }}
            >
              <Icon className="size-4" aria-hidden />
            </div>
            <p className="mt-2 text-sm font-medium leading-tight">{category.name}</p>
          </Link>
        );
      })}
    </div>
  );
}
