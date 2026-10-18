import type { Metadata } from "next";
import Link from "next/link";
import {
  BadgeCheck,
  Banknote,
  Flag,
  Handshake,
  Inbox,
  ListTodo,
  ScrollText,
  Store,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { formatBdt, timeAgo } from "@/lib/format";

export const metadata: Metadata = { title: "Overview — Admin" };

export default async function AdminOverviewPage() {
  const { supabase } = await requireAdmin();

  const [
    membersRes,
    bannedRes,
    sellersRes,
    listingsActiveRes,
    listingsHiddenRes,
    storesActiveRes,
    storesTotalRes,
    dealsOpenRes,
    dealsCompletedRes,
    paymentsRes,
    reportsOpenRes,
    requestsPendingRes,
    auditRes,
    profilesRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("is_banned", true),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "seller"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "hidden"),
    supabase.from("stores").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("stores").select("id", { count: "exact", head: true }),
    supabase
      .from("deals")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "accepted", "paid", "handed_over"]),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("status", "completed"),
    supabase.from("payments").select("amount_bdt").eq("status", "succeeded"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("seller_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    supabase
      .from("admin_audit_log")
      .select("id, action, target_type, target_id, created_at, actor_id")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const payments = paymentsRes.data ?? [];
  const paymentsTotal = payments.reduce((sum, p) => sum + p.amount_bdt, 0);
  const nameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name ?? "Admin"]));

  const stats = [
    {
      label: "Members",
      value: membersRes.count ?? 0,
      sub: `${sellersRes.count ?? 0} sellers · ${bannedRes.count ?? 0} banned`,
      href: "/admin/users",
      icon: Users,
    },
    {
      label: "Active listings",
      value: listingsActiveRes.count ?? 0,
      sub: `${listingsHiddenRes.count ?? 0} hidden`,
      href: "/admin/listings",
      icon: ListTodo,
    },
    {
      label: "Stores",
      value: storesActiveRes.count ?? 0,
      sub: `${storesTotalRes.count ?? 0} total`,
      href: "/admin/stores",
      icon: Store,
    },
    {
      label: "Open deals",
      value: dealsOpenRes.count ?? 0,
      sub: `${dealsCompletedRes.count ?? 0} completed`,
      href: "/admin/deals",
      icon: Handshake,
    },
    {
      label: "Payments (sandbox)",
      value: formatBdt(paymentsTotal),
      sub: `${payments.length} succeeded`,
      href: "/admin/payments",
      icon: Banknote,
    },
    {
      label: "Open reports",
      value: reportsOpenRes.count ?? 0,
      sub: "awaiting review",
      href: "/admin/reports",
      icon: Flag,
    },
  ];

  return (
    <div className="space-y-6">
      {(requestsPendingRes.count ?? 0) > 0 ? (
        <Link
          href="/admin/requests"
          className="elev-1 flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/5 px-4 py-3 transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2"
        >
          <Inbox className="size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm">
            <span className="tabular font-semibold">{requestsPendingRes.count}</span>{" "}
            seller request{(requestsPendingRes.count ?? 0) === 1 ? "" : "s"} waiting
            for a decision — review the queue →
          </p>
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="elev-1 rounded-2xl border bg-card p-4 transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2"
          >
            <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <stat.icon className="size-3.5" aria-hidden />
              {stat.label}
            </p>
            <p className="tabular mt-2 text-2xl font-semibold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{stat.sub}</p>
          </Link>
        ))}
      </div>

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="size-4" aria-hidden />
            Recent admin activity
          </CardTitle>
          <CardDescription>
            The last 8 recorded actions —{" "}
            <Link href="/admin/audit" className="text-primary hover:underline">
              view the full audit log
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {(auditRes.data ?? []).map((entry) => (
              <li key={entry.id} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                <span className="tabular text-xs text-muted-foreground">
                  {timeAgo(entry.created_at)}
                </span>
                <span className="font-medium">
                  {entry.actor_id ? (nameById.get(entry.actor_id) ?? "Admin") : "System"}
                </span>
                <span className="rounded-full border bg-muted/60 px-2.5 py-0.5 font-mono text-xs">
                  {entry.action}
                </span>
                {entry.target_type ? (
                  <span className="text-xs text-muted-foreground">
                    {entry.target_type}
                  </span>
                ) : null}
              </li>
            ))}
            {(auditRes.data ?? []).length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nothing recorded yet — approve a request or manage a member and
                it shows up here.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/admin/requests", label: "Seller requests", icon: Inbox },
          { href: "/admin/categories", label: "Categories", icon: BadgeCheck },
          { href: "/admin/audit", label: "Audit log", icon: ScrollText },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="elev-1 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 text-sm font-medium transition-[transform,box-shadow] duration-base ease-out-soft hover:-translate-y-0.5 hover:elev-2"
          >
            <item.icon className="size-4 text-primary" aria-hidden />
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
