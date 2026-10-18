import type { Metadata } from "next";
import Link from "next/link";

import { ConfirmAction } from "@/components/confirm-action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  decideReportAction,
  deleteReportAction,
  hideReportedListingAction,
} from "./actions";

export const metadata: Metadata = { title: "Reports — Admin" };

const TARGET_STYLES: Record<string, string> = {
  listing: "border-primary/40 bg-primary/10 text-primary",
  user: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  store: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  message: "border-border bg-muted text-muted-foreground",
  deal: "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
};

const TABS = [
  { value: "open", label: "Open" },
  { value: "reviewed", label: "Reviewed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
] as const;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.value === sp.tab) ? String(sp.tab) : "open";

  const { supabase } = await requireAdmin();

  const base = supabase.from("reports").select("*").order("created_at", { ascending: false });
  const { data: reports } =
    tab === "all"
      ? await base.limit(100)
      : await base.eq("status", tab as "open" | "reviewed" | "dismissed").limit(100);

  const rows = reports ?? [];

  const [{ count: openCount }, { count: reviewedCount }, { count: dismissedCount }] =
    await Promise.all([
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "reviewed"),
      supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "dismissed"),
    ]);

  const counts: Record<string, number | null> = {
    open: openCount,
    reviewed: reviewedCount,
    dismissed: dismissedCount,
    all: (openCount ?? 0) + (reviewedCount ?? 0) + (dismissedCount ?? 0),
  };

  const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];
  const storeIds = [...new Set(rows.filter((r) => r.target_type === "store").map((r) => r.target_id))];

  const [{ data: profiles }, { data: stores }] = await Promise.all([
    reporterIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", reporterIds)
      : Promise.resolve({ data: [] }),
    storeIds.length
      ? supabase.from("stores").select("id, slug, business_name").in("id", storeIds)
      : Promise.resolve({ data: [] }),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Member"]));
  const storeById = new Map((stores ?? []).map((s) => [s.id, s]));

  function targetHref(type: string, id: string): string | null {
    if (type === "listing") return `/listing/${id}`;
    if (type === "user") return `/profile/${id}`;
    if (type === "deal") return `/deals/${id}`;
    if (type === "store") {
      const store = storeById.get(id);
      return store ? `/store/${store.slug}` : null;
    }
    return null;
  }

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="text-base">Reports</CardTitle>
        <div className="flex flex-wrap gap-1 rounded-full border p-1">
          {TABS.map((t) => (
            <Link
              key={t.value}
              href={t.value === "open" ? "/admin/reports" : `/admin/reports?tab=${t.value}`}
              aria-current={tab === t.value ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors duration-fast",
                tab === t.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className="tabular ml-1.5 opacity-70">{counts[t.value] ?? 0}</span>
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <ul className="divide-y rounded-2xl border">
          {rows.map((report) => {
            const href = targetHref(report.target_type, report.target_id);
            return (
              <li key={report.id} className="space-y-2.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                      TARGET_STYLES[report.target_type] ?? "",
                    )}
                  >
                    {report.target_type}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{report.reason}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nameById.get(report.reporter_id) ?? "Member"} ·{" "}
                      {formatDate(report.created_at)}
                      {href ? (
                        <>
                          {" · "}
                          <Link href={href} className="text-primary hover:underline">
                            open {report.target_type}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
                      report.status === "open"
                        ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                        : report.status === "reviewed"
                          ? "border-success/40 bg-success/10 text-success"
                          : "border-border bg-muted text-muted-foreground",
                    )}
                  >
                    {report.status}
                  </span>
                </div>

                {report.details ? (
                  <p className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
                    {report.details}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  {report.status === "open" ? (
                    <>
                      {report.target_type === "listing" ? (
                        <ConfirmAction
                          action={hideReportedListingAction}
                          fields={{ report_id: report.id, listing_id: report.target_id }}
                          label="Hide listing"
                          confirmLabel="Yes, hide it"
                          pendingText="Hiding…"
                          description="Takes the listing off the marketplace and closes this report."
                        />
                      ) : null}
                      <ConfirmAction
                        action={decideReportAction}
                        fields={{ report_id: report.id, decision: "reviewed" }}
                        label="Reviewed"
                        confirmLabel="Mark reviewed"
                        pendingText="Saving…"
                        description="No listing touched — the report is marked handled."
                        variant="outline"
                      />
                      <ConfirmAction
                        action={decideReportAction}
                        fields={{ report_id: report.id, decision: "dismissed" }}
                        label="Dismiss"
                        confirmLabel="Dismiss it"
                        pendingText="Saving…"
                        variant="secondary"
                      />
                    </>
                  ) : null}
                  <ConfirmAction
                    action={deleteReportAction}
                    fields={{ report_id: report.id }}
                    label="Delete"
                    confirmLabel="Delete report"
                    pendingText="Deleting…"
                  />
                </div>
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              {tab === "open" ? "No open reports — all clear." : "Nothing here."}
            </li>
          )}
        </ul>
      </CardContent>
    </Card>
  );
}
