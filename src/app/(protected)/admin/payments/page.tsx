import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { ConfirmAction } from "@/components/confirm-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { formatBdt, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { refundPaymentAction } from "./actions";

export const metadata: Metadata = { title: "Payments — Admin" };

const PAGE_SIZE = 20;

const STATUS_STYLES: Record<string, string> = {
  succeeded: "border-success/40 bg-success/10 text-success",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  refunded: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
};

const METHOD_LABELS: Record<string, string> = {
  card: "Card",
  mobile_wallet: "Mobile wallet",
  bank: "Bank",
};

const selectClasses =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function pageHref(params: { q: string; status: string; page: number }): string {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.status) sp.set("status", params.status);
  if (params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/admin/payments${s ? `?${s}` : ""}`;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const status = ["pending", "succeeded", "failed", "refunded"].includes(String(sp.status))
    ? String(sp.status)
    : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("payments")
    .select(
      "id, amount_bdt, method, status, transaction_id, created_at, refunded_at, payer_id, deal_id, deals(id, listings(title))",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) query = query.eq("status", status as "pending" | "succeeded" | "failed" | "refunded");
  if (q) query = query.ilike("transaction_id", `%${q}%`);

  const { data: payments, count } = await query;
  const rows = payments ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const payerIds = [...new Set(rows.map((p) => p.payer_id))];
  const { data: profiles } = payerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", payerIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Member"]));

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="text-base">
          Payments <span className="text-muted-foreground">({total})</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Mock checkout records (spec §7) — no real money ever moves. Refunds
          are simulated and recorded here.
        </p>
        <form method="get" className="flex flex-wrap items-center gap-2 pt-2">
          <div className="relative min-w-52 flex-1">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              name="q"
              defaultValue={q}
              placeholder="Search transaction id"
              aria-label="Search payments"
              className="pl-8"
            />
          </div>
          <select name="status" defaultValue={status} aria-label="Filter status" className={selectClasses}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="succeeded">Succeeded</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
          <Button type="submit" variant="outline" size="sm">
            Filter
          </Button>
        </form>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="divide-y rounded-2xl border">
          {rows.map((payment) => (
            <li key={payment.id} className="space-y-2.5 px-4 py-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {payment.transaction_id}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nameById.get(payment.payer_id) ?? "Member"} ·{" "}
                    {METHOD_LABELS[payment.method] ?? payment.method} ·{" "}
                    {formatDate(payment.created_at)}
                    {payment.refunded_at
                      ? ` · refunded ${formatDate(payment.refunded_at)}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular text-sm font-medium">
                    {formatBdt(payment.amount_bdt)}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                      STATUS_STYLES[payment.status] ?? "",
                    )}
                  >
                    {payment.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  render={<Link href={`/deals/${payment.deal_id}`} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  View deal
                </Button>
                {payment.status === "succeeded" ? (
                  <ConfirmAction
                    action={refundPaymentAction}
                    fields={{ payment_id: payment.id }}
                    label="Refund"
                    confirmLabel="Yes, refund it"
                    pendingText="Refunding…"
                    description={`Simulates a ${formatBdt(payment.amount_bdt)} refund through the sandbox provider and marks this record refunded.`}
                    variant="secondary"
                  />
                ) : null}
              </div>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              No payments match this filter.
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
