"use client";

import { Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type BrowseFilters = {
  q: string;
  category: string;
  condition: string;
  min: string;
  max: string;
  sort: string;
};

const selectClasses =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 dark:bg-input/30";

/**
 * URL-synced filter bar (docs: browse filters live in searchParams, so every
 * filtered view is shareable and back-button friendly). No useSearchParams —
 * the current values come from the server page as props.
 */
export function FiltersBar({
  categories,
  current,
}: {
  categories: { id: string; name: string; slug: string }[];
  current: BrowseFilters;
}) {
  const router = useRouter();
  const [q, setQ] = useState(current.q);
  const minRef = useRef<HTMLInputElement>(null);
  const maxRef = useRef<HTMLInputElement>(null);

  function apply(next: Partial<BrowseFilters>) {
    const merged = { ...current, ...next };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    params.delete("page");
    router.replace(`/browse${params.size ? `?${params.toString()}` : ""}`, {
      scroll: false,
    });
  }

  // Debounced search — the only effect here calls the router (no setState).
  useEffect(() => {
    if (q === current.q) return;
    const timer = setTimeout(() => apply({ q }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters = Boolean(
    current.q || current.category || current.condition || current.min || current.max,
  );

  return (
    <div className="elev-1 space-y-3 rounded-2xl border bg-card p-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search listings — “calculator”, “laptop”…"
            aria-label="Search listings"
            className="pl-9"
          />
        </div>

        <select
          aria-label="Category"
          className={cn(selectClasses, "w-auto min-w-40")}
          value={current.category}
          onChange={(event) => apply({ category: event.target.value })}
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort"
          className={cn(selectClasses, "w-auto min-w-36")}
          value={current.sort}
          onChange={(event) => apply({ sort: event.target.value })}
        >
          <option value="newest">Newest first</option>
          <option value="price-asc">Price: low → high</option>
          <option value="price-desc">Price: high → low</option>
        </select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label="Condition"
          className="flex items-center rounded-lg border p-0.5"
        >
          {(
            [
              ["", "All"],
              ["new", "New"],
              ["used", "Used"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={current.condition === value}
              onClick={() => apply({ condition: value })}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors duration-fast",
                current.condition === value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply({ min: minRef.current?.value ?? "", max: maxRef.current?.value ?? "" });
          }}
        >
          <span className="text-sm text-muted-foreground">৳</span>
          <Input
            ref={minRef}
            inputMode="numeric"
            defaultValue={current.min}
            placeholder="min"
            aria-label="Minimum price"
            className="tabular w-24"
          />
          <span aria-hidden className="text-muted-foreground">
            –
          </span>
          <Input
            ref={maxRef}
            inputMode="numeric"
            defaultValue={current.max}
            placeholder="max"
            aria-label="Maximum price"
            className="tabular w-24"
          />
          <Button type="submit" variant="outline" size="sm">
            Apply
          </Button>
        </form>

        {hasFilters && (
          <Link
            href="/browse"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-3.5" aria-hidden /> Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
