import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireAdmin } from "@/lib/auth";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Audit log — Admin" };

const PAGE_SIZE = 30;

const TARGET_TYPES = [
  "user",
  "listing",
  "store",
  "deal",
  "payment",
  "report",
  "category",
  "message",
] as const;

const selectClasses =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

const TARGET_STYLES: Record<string, string> = {
  user: "border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  listing: "border-primary/40 bg-primary/10 text-primary",
  store: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  deal: "border-indigo-500/40 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300",
  payment: "border-success/40 bg-success/10 text-success",
  report: "border-destructive/40 bg-destructive/10 text-destructive",
  category: "border-border bg-muted text-muted-foreground",
  message: "border-border bg-muted text-muted-foreground",
};

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function targetHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  if (type === "user") return `/profile/${id}`;
  if (type === "listing") return `/listing/${id}`;
  if (type === "deal") return `/deals/${id}`;
  return null;
}

function pageHref(params: { target: string; q: string; page: number }): string {
  const sp = new URLSearchParams();
  if (params.target) sp.set("target", params.target);
  if (params.q) sp.set("q", params.q);
  if (params.page > 1) sp.set("page", String(params.page));
  const s = sp.toString();
  return `/admin/audit${s ? `?${s}` : ""}`;
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const target = TARGET_TYPES.includes(sp.target as (typeof TARGET_TYPES)[number])
    ? String(sp.target)
    : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const page = Math.max(1, Number(sp.page) || 1);

  const { supabase } = await requireAdmin();

  let query = supabase
    .from("admin_audit_log")
    .select("id, action, target_type, target_id, details, created_at, actor_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (target) query = query.eq("target_type", target);
  if (q) query = query.ilike("action", `%${q}%`);

  const { data: entries, count } = await query;
  const rows = entries ?? [];
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter(Boolean))] as string[];
  const { data: profiles } = actorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", actorIds)
    : { data: [] };
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name ?? "Admin"]));

  return (
    <Card className="elev-1">
      <CardHeader>
        <CardTitle className="text-base">
          Audit log <span className="text-muted-foreground">({total})</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Every admin action, oldest first at the bottom. Entries are written by
          the actions themselves and cannot be edited or deleted from the UI.
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
              placeholder="Search action (e.g. listing.)"
              aria-label="Search actions"
              className="pl-8"
            />
          </div>
          <select
            name="target"
            defaultValue={target}
            aria-label="Filter target type"
            className={selectClasses}
          >
            <option value="">All targets</option>
            {TARGET_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
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
          {rows.map((entry) => {
            const href = targetHref(entry.target_type, entry.target_id);
            const hasDetails =
              entry.details &&
              typeof entry.details === "object" &&
              Object.keys(entry.details).length > 0;
            return (
              <li key={entry.id} className="space-y-1.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="tabular text-xs text-muted-foreground">
                    {formatDateTime(entry.created_at)}
                  </span>
                  <span className="font-medium">
                    {entry.actor_id
                      ? (nameById.get(entry.actor_id) ?? "Admin")
                      : "System"}
                  </span>
                  <span className="rounded-full border bg-muted/60 px-2.5 py-0.5 font-mono text-xs">
                    {entry.action}
                  </span>
                  {entry.target_type ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        TARGET_STYLES[entry.target_type] ?? "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.target_type}
                    </span>
                  ) : null}
                  {href && entry.target_id ? (
                    <Link href={href} className="text-xs font-medium text-primary hover:underline">
                      open →
                    </Link>
                  ) : null}
                </div>
                {hasDetails ? (
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer select-none hover:text-foreground">
                      Details
                    </summary>
                    <pre className="mt-1.5 overflow-x-auto rounded-xl border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                      {JSON.stringify(entry.details, null, 2)}
                    </pre>
                  </details>
                ) : null}
              </li>
            );
          })}
          {rows.length === 0 && (
            <li className="px-4 py-10 text-center text-sm text-muted-foreground">
              No audit entries match this filter.
            </li>
          )}
        </ul>

        {pages > 1 ? (
          <div className="flex items-center justify-between">
            <Button
              render={<Link href={pageHref({ target, q, page: Math.max(1, page - 1) })} />}
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
              render={<Link href={pageHref({ target, q, page: Math.min(pages, page + 1) })} />}
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
