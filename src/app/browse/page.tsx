import type { Metadata } from "next";
import { PackageSearch } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AmbientBackdrop } from "@/components/ambient-backdrop";
import { CategoryRail } from "@/components/category-rail";
import { ListingCard, type CardListing } from "@/components/listing-card";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { getAuthContext } from "@/lib/auth";
import { BRAND_HUE, PARTNER_HUES } from "@/lib/colors";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { FiltersBar } from "./filters-bar";

export const metadata: Metadata = { title: "Browse listings" };

const PAGE_SIZE = 24;

const SORTS = {
  newest: { column: "created_at", ascending: false },
  "price-asc": { column: "price_bdt", ascending: true },
  "price-desc": { column: "price_bdt", ascending: false },
} as const;

type SortKey = keyof typeof SORTS;
type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function sanitizeQuery(value: string): string {
  return value.trim().slice(0, 80).replace(/[,%()]/g, " ");
}

function parsePrice(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1_000_000) return null;
  return parsed;
}

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  // Marketplace access requires sign-in (ADR-015) — products are students-only.
  const { user } = await getAuthContext();
  if (!user) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(sp)) {
      if (typeof value === "string" && value !== "") params.set(key, value);
    }
    const query = params.toString();
    redirect(`/login?next=${encodeURIComponent(query ? `/browse?${query}` : "/browse")}`);
  }

  const q = sanitizeQuery(single(sp.q));
  const categorySlug = single(sp.category);
  const conditionRaw = single(sp.condition);
  const condition: "" | "new" | "used" =
    conditionRaw === "new" || conditionRaw === "used" ? conditionRaw : "";
  const minRaw = single(sp.min);
  const maxRaw = single(sp.max);
  const min = parsePrice(minRaw);
  const max = parsePrice(maxRaw);
  const sortKey: SortKey = (
    ["newest", "price-asc", "price-desc"] as const
  ).includes(single(sp.sort) as SortKey)
    ? (single(sp.sort) as SortKey)
    : "newest";
  const page = Math.min(Math.max(Math.trunc(Number(single(sp.page))) || 1, 1), 500);
  const storeSlug = single(sp.store);

  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, icon")
    .order("sort_order", { ascending: true });
  const categoryList = categories ?? [];
  const categoryId =
    categoryList.find((category) => category.slug === categorySlug)?.id ?? null;

  let storeId: string | null = null;
  let storeName: string | null = null;
  if (storeSlug) {
    const { data: store } = await supabase
      .from("stores")
      .select("id, business_name")
      .eq("slug", storeSlug)
      .maybeSingle();
    storeId = store?.id ?? null;
    storeName = store?.business_name ?? null;
  }

  let query = supabase
    .from("listings")
    .select(
      "id, title, price_bdt, condition, quantity, listing_images(url, position), stores(business_name)",
      { count: "exact" },
    )
    .eq("status", "active");

  if (categoryId) query = query.eq("category_id", categoryId);
  if (condition) query = query.eq("condition", condition);
  if (storeId) query = query.eq("store_id", storeId);
  if (min !== null) query = query.gte("price_bdt", min);
  if (max !== null) query = query.lte("price_bdt", max);
  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);

  const sort = SORTS[sortKey];
  const from = (page - 1) * PAGE_SIZE;
  const { data: listings, count } = await query
    .order(sort.column, { ascending: sort.ascending })
    .range(from, from + PAGE_SIZE - 1);

  const results = (listings ?? []) as (CardListing & {
    stores: { business_name: string } | null;
  })[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categorySlug) params.set("category", categorySlug);
    if (condition) params.set("condition", condition);
    if (minRaw) params.set("min", minRaw);
    if (maxRaw) params.set("max", maxRaw);
    if (sortKey !== "newest") params.set("sort", sortKey);
    if (storeSlug) params.set("store", storeSlug);
    if (target > 1) params.set("page", String(target));
    return `/browse${params.size ? `?${params.toString()}` : ""}`;
  }

  return (
    <div className="relative flex min-h-svh flex-col">
      <AmbientBackdrop hueA={PARTNER_HUES[1]} hueB={BRAND_HUE} height="480px" />
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 pb-16 pt-24 sm:pt-28">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
          <p className="tabular text-sm text-muted-foreground">
            {total.toLocaleString()} {total === 1 ? "listing" : "listings"}
            {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
          </p>
        </div>

        <CategoryRail categories={categoryList} activeSlug={categoryId ? categorySlug : null} />

        <FiltersBar
          categories={categoryList}
          current={{
            q,
            category: categorySlug,
            condition,
            min: minRaw,
            max: maxRaw,
            sort: sortKey,
          }}
        />

        {storeName && (
          <p className="text-sm text-muted-foreground">
            Showing listings from{" "}
            <Link
              href={`/store/${storeSlug}`}
              className="font-medium text-primary hover:underline"
            >
              {storeName}
            </Link>
          </p>
        )}

        {results.length === 0 ? (
          <div className="elev-1 grid place-items-center rounded-3xl border bg-card px-6 py-20 text-center">
            <PackageSearch className="size-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">Nothing matches those filters</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Try a broader search, or clear the filters to see everything on campus.
            </p>
            <Button
              render={<Link href="/browse" />}
              nativeButton={false}
              variant="outline"
              size="sm"
              className="mt-5"
            >
              Clear filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                storeName={listing.stores?.business_name ?? null}
                className="scroll-reveal"
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="flex items-center justify-center gap-3 pt-4"
          >
            <Button
              render={<Link href={pageHref(Math.max(1, page - 1))} />}
              nativeButton={false}
              variant="outline"
              size="sm"
              disabled={page <= 1}
              aria-disabled={page <= 1}
              className={cn(page <= 1 && "pointer-events-none opacity-50")}
            >
              ← Previous
            </Button>
            <span className="tabular text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button
              render={<Link href={pageHref(Math.min(totalPages, page + 1))} />}
              nativeButton={false}
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              aria-disabled={page >= totalPages}
              className={cn(page >= totalPages && "pointer-events-none opacity-50")}
            >
              Next →
            </Button>
          </nav>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
