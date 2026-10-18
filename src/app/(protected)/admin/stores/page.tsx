import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { formatDate, initialsOf } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StoreRowActions } from "./store-row-actions";

export const metadata: Metadata = { title: "Stores — Admin" };

const selectClasses =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

export default async function AdminStoresPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const activeFilter =
    sp.active === "1" ? "active" : sp.active === "0" ? "inactive" : "";

  const { supabase } = await requireAdmin();

  const [{ data: stores }, { data: profiles }, { data: listingRows }] =
    await Promise.all([
      supabase
        .from("stores")
        .select(
          "id, business_name, slug, description, pickup_location, contact_phone, logo_url, is_active, created_at, updated_at, owner_id",
        )
        .order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("listings").select("store_id, status"),
    ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? ""]));
  const counts = new Map<string, { total: number; active: number }>();
  for (const row of listingRows ?? []) {
    const entry = counts.get(row.store_id) ?? { total: 0, active: 0 };
    entry.total += 1;
    if (row.status === "active") entry.active += 1;
    counts.set(row.store_id, entry);
  }

  let rows = stores ?? [];
  if (q) {
    rows = rows.filter((store) => store.business_name.toLowerCase().includes(q));
  }
  if (activeFilter) {
    rows = rows.filter((store) =>
      activeFilter === "active" ? store.is_active : !store.is_active,
    );
  }

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="text-base">
          Stores <span className="text-muted-foreground">({rows.length})</span>
        </CardTitle>
        <form method="get" className="flex flex-wrap items-center gap-2 pt-2">
          <div className="relative min-w-52 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={typeof sp.q === "string" ? sp.q : ""}
              placeholder="Search store name"
              aria-label="Search stores"
              className="pl-8"
            />
          </div>
          <select name="active" defaultValue={sp.active === "0" ? "0" : sp.active === "1" ? "1" : ""} aria-label="Filter state" className={selectClasses}>
            <option value="">All stores</option>
            <option value="1">Active</option>
            <option value="0">Deactivated</option>
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-2xl border">
          {rows.map((store) => {
            const stats = counts.get(store.id) ?? { total: 0, active: 0 };
            return (
              <li key={store.id} className="space-y-2.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border bg-accent">
                    {store.logo_url ? (
                      <Image src={store.logo_url} alt="" fill sizes="44px" className="object-cover" />
                    ) : (
                      <span className="grid size-full place-items-center text-sm font-semibold text-accent-foreground">
                        {initialsOf(store.business_name)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <Link href={`/store/${store.slug}`} className="hover:underline">
                        {store.business_name}
                      </Link>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nameById.get(store.owner_id) ?? "Owner"} · since{" "}
                      {formatDate(store.created_at)} ·{" "}
                      <span className="tabular">{stats.active}</span> active /{" "}
                      <span className="tabular">{stats.total}</span> listings
                    </p>
                  </div>
                  <span
                    className={
                      store.is_active
                        ? "inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success"
                        : "inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground"
                    }
                  >
                    {store.is_active ? "Active" : "Deactivated"}
                  </span>
                </div>
                <StoreRowActions
                  key={`${store.id}-${store.updated_at}`}
                  storeId={store.id}
                  businessName={store.business_name}
                  description={store.description}
                  pickupLocation={store.pickup_location}
                  contactPhone={store.contact_phone}
                  isActive={store.is_active}
                />
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              No stores match this filter.
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
