import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pencil, Search } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { formatBdt, formatDate, initialsOf } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ListingRowActions } from "./listing-row-actions";

export const metadata: Metadata = { title: "Listings — Admin" };

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  active: "border-success/40 bg-success/10 text-success",
  hidden: "border-border bg-muted text-muted-foreground",
  sold: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  sold_out: "border-primary/40 bg-primary/10 text-primary",
};

const selectClasses =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function pageHref(params: {
  q: string;
  status: string;
  category: string;
  page: number;
}): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.category) sp.set("category", params.category);
  if (params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/admin/listings${s ? `?${s}` : ""}`;
}

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = ["active", "hidden", "sold", "sold_out"].includes(String(sp.status))
    ? String(sp.status)
    : "";
  const category = typeof sp.category === "string" ? sp.category : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("listings")
    .select(
      "id, title, price_bdt, quantity, status, created_at, stores(business_name, slug), categories(name), listing_images(url, position)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.ilike("title", `%${q}%`);
  if (status) query = query.eq("status", status as "active" | "hidden" | "sold" | "sold_out");
  if (category) query = query.eq("category_id", category);

  const [{ data: listings, count }, { data: categories }] = await Promise.all([
    query,
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  const rows = listings ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="text-base">
          Listings <span className="text-muted-foreground">({total})</span>
        </CardTitle>
        <form method="get" className="flex flex-wrap items-center gap-2 pt-2">
          <div className="relative min-w-52 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search title"
              aria-label="Search listings"
              className="pl-8"
            />
          </div>
          <select name="status" defaultValue={status} aria-label="Filter status" className={selectClasses}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="sold">Sold</option>
            <option value="sold_out">Sold out</option>
          </select>
          <select
            name="category"
            defaultValue={category}
            aria-label="Filter category"
            className={selectClasses}
          >
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-2xl border">
          {rows.map((row) => {
            const cover = [...row.listing_images].sort(
              (a, b) => a.position - b.position,
            )[0];
            return (
              <li key={row.id} className="space-y-2.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border bg-muted/50">
                    {cover ? (
                      <Image src={cover.url} alt="" fill sizes="44px" className="object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-xs font-semibold text-muted-foreground">
                        {initialsOf(row.title)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <Link href={`/listing/${row.id}`} className="hover:underline">
                        {row.title}
                      </Link>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.stores?.business_name ?? "—"} ·{" "}
                      {row.categories?.name ?? "Uncategorised"} ·{" "}
                      {formatDate(row.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-sm font-medium">
                      {formatBdt(row.price_bdt)}
                    </span>
                    <span className="tabular text-xs text-muted-foreground">
                      ×{row.quantity}
                    </span>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                        STATUS_STYLES[row.status] ?? "",
                      )}
                    >
                      {row.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    render={<Link href={`/admin/listings/${row.id}`} />}
                    nativeButton={false}
                    variant="outline"
                    size="sm"
                  >
                    <Pencil aria-hidden /> Edit
                  </Button>
                  <ListingRowActions
                    key={`${row.id}-${row.status}`}
                    listingId={row.id}
                    title={row.title}
                    status={row.status}
                  />
                </div>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              No listings match this filter.
            </li>
          )}
        </ul>

        {pages > 1 ? (
          <div className="flex items-center justify-between">
            <Button
              render={
                <Link href={pageHref({ q, status, category, page: Math.max(1, page - 1) })} />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              disabled={page <= 1}
            >
              Previous
            </Button>
            <span className="tabular text-sm text-muted-foreground">
              Page {page} of {pages}
            </span>
            <Button
              render={
                <Link href={pageHref({ q, status, category, page: Math.min(pages, page + 1) })} />
              }
              nativeButton={false}
              variant="outline"
              size="sm"
              disabled={page >= pages}
            >
              Next
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
