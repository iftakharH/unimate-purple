import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { DealStatusChip } from "@/app/(protected)/deals/deal-status";
import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { formatBdt, timeAgo } from "@/lib/format";
import { adminDealAction } from "./actions";

export const metadata: Metadata = { title: "Deals — Admin" };

const PAGE_SIZE = 20;

const selectClasses =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

const OPEN_STATUSES = ["requested", "accepted", "paid", "handed_over"];

function pageHref(params: { q: string; status: string; page: number }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/admin/deals${s ? `?${s}` : ""}`;
}

export default async function AdminDealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = [
    "requested",
    "accepted",
    "paid",
    "handed_over",
    "completed",
    "rejected",
    "cancelled",
  ].includes(String(sp.status))
    ? String(sp.status)
    : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const { supabase } = await requireAdmin();

  // Search by listing title → resolve listing ids first (one extra hop, exact).
  let listingIds: string[] | null = null;
  if (q) {
    const { data: matches } = await supabase
      .from("listings")
      .select("id")
      .ilike("title", `%${q}%`)
      .limit(200);
    listingIds = (matches ?? []).map((m) => m.id);
  }

  let query = supabase
    .from("deals")
    .select(
      "id, status, payment_mode, quantity, amount_bdt, created_at, updated_at, listing_id, buyer_id, seller_id, listings(title)",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) {
    query = query.eq("status", status as "requested" | "accepted" | "paid" | "handed_over" | "completed" | "rejected" | "cancelled");
  }
  if (listingIds) query = query.in("listing_id", listingIds);

  const { data: deals, count } = listingIds && listingIds.length === 0
    ? { data: [], count: 0 }
    : await query;

  const rows = deals ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const partyIds = [...new Set(rows.flatMap((d) => [d.buyer_id, d.seller_id]))];
  const { data: profiles } = partyIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", partyIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Member"]));

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="text-base">
          Deals <span className="text-muted-foreground">({total})</span>
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
              placeholder="Search by listing title"
              aria-label="Search deals"
              className="pl-8"
            />
          </div>
          <select name="status" defaultValue={status} aria-label="Filter status" className={selectClasses}>
            <option value="">All statuses</option>
            <option value="requested">Requested</option>
            <option value="accepted">Accepted</option>
            <option value="paid">Paid</option>
            <option value="handed_over">Handed over</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-2xl border">
          {rows.map((deal) => {
            const isOpen = OPEN_STATUSES.includes(deal.status);
            const canComplete = ["accepted", "paid", "handed_over"].includes(deal.status);
            return (
              <li key={deal.id} className="space-y-2.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <Link href={`/deals/${deal.id}`} className="hover:underline">
                        {deal.listings?.title ?? "Listing removed"}
                      </Link>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nameById.get(deal.buyer_id) ?? "Buyer"} →{" "}
                      {nameById.get(deal.seller_id) ?? "Seller"} ·{" "}
                      {deal.payment_mode === "pay_in_app" ? "In app" : "On campus"} · updated{" "}
                      {timeAgo(deal.updated_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="tabular text-sm font-medium">
                      {formatBdt(deal.amount_bdt)}
                    </span>
                    <span className="tabular text-xs text-muted-foreground">
                      ×{deal.quantity}
                    </span>
                    <DealStatusChip status={deal.status} />
                  </div>
                </div>
                {(isOpen || canComplete) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {canComplete ? (
                      <ConfirmAction
                        action={adminDealAction}
                        fields={{ deal_id: deal.id, target: "completed" }}
                        label="Mark completed"
                        confirmLabel="Yes, complete it"
                        pendingText="Completing…"
                        description="Runs the normal completion: stock decreases and the listing may flip to sold. Both parties are notified."
                        variant="outline"
                      />
                    ) : null}
                    {isOpen ? (
                      <ConfirmAction
                        action={adminDealAction}
                        fields={{ deal_id: deal.id, target: "cancelled" }}
                        label="Cancel deal"
                        confirmLabel="Yes, cancel it"
                        pendingText="Cancelling…"
                        description="Both parties are notified; the listing is untouched."
                      />
                    ) : null}
                  </div>
                )}
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              No deals match this filter.
            </li>
          )}
        </ul>

        {pages > 1 ? (
          <div className="flex items-center justify-between">
            <Button
              render={<Link href={pageHref({ q, status, page: Math.max(1, page - 1) })} />}
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
              render={<Link href={pageHref({ q, status, page: Math.min(pages, page + 1) })} />}
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
