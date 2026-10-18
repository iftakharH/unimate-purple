import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";

import { requireAdmin } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AdminUserForm } from "./admin-user-form";
import { UserActions } from "./user-actions";

export const metadata: Metadata = { title: "Users — Admin" };

const selectClasses =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none transition-[color,box-shadow] duration-base focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

function initialsOf(name: string, email: string): string {
  const source = name.trim() || email;
  const words = source.split(/[\s@._-]+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";
  const roleFilter =
    typeof sp.role === "string" && ["buyer", "seller", "admin"].includes(sp.role)
      ? sp.role
      : "";
  const bannedOnly = sp.banned === "1";

  const { supabase, user: currentUser } = await requireAdmin();
  const isSuper = isSuperAdminEmail(currentUser.email ?? "");

  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUsers = authData?.users ?? [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, is_banned, created_at");

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  let rows = authUsers
    .map((u) => {
      const profile = profileById.get(u.id);
      return {
        id: u.id,
        email: u.email ?? "",
        fullName: profile?.full_name ?? "",
        avatarUrl: profile?.avatar_url ?? null,
        role: profile?.role ?? "buyer",
        isBanned: profile?.is_banned ?? false,
        joined: profile?.created_at ?? u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
      };
    })
    .sort((a, b) => (b.joined > a.joined ? 1 : -1));

  if (q) {
    rows = rows.filter((row) =>
      `${row.fullName} ${row.email}`.toLowerCase().includes(q),
    );
  }
  if (roleFilter) rows = rows.filter((row) => row.role === roleFilter);
  if (bannedOnly) rows = rows.filter((row) => row.isBanned);

  const filtered = Boolean(q || roleFilter || bannedOnly);

  return (
    <div className="space-y-6">
      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="text-base">Add a member</CardTitle>
          <CardDescription>
            Invite by email (any address) or create an account directly with a
            temporary password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminUserForm isSuperAdmin={isSuper} />
        </CardContent>
      </Card>

      <Card className="elev-1">
        <CardHeader>
          <CardTitle className="text-base">
            Members <span className="text-muted-foreground">({rows.length})</span>
          </CardTitle>
          <CardDescription>
            Role changes, bans and deletions are recorded in the audit log.
            {isSuper ? " Super Admin accounts stay locked." : " Admins are Super Admin territory."}
          </CardDescription>
          <form method="get" className="flex flex-wrap items-center gap-2 pt-2">
            <div className="relative min-w-52 flex-1">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                name="q"
                defaultValue={typeof sp.q === "string" ? sp.q : ""}
                placeholder="Search name or email"
                aria-label="Search members"
                className="pl-8"
              />
            </div>
            <select
              name="role"
              defaultValue={roleFilter}
              aria-label="Filter by role"
              className={selectClasses}
            >
              <option value="">All roles</option>
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="admin">Admin</option>
            </select>
            <select
              name="banned"
              defaultValue={bannedOnly ? "1" : ""}
              aria-label="Filter banned"
              className={selectClasses}
            >
              <option value="">Everyone</option>
              <option value="1">Banned only</option>
            </select>
            <Button type="submit" variant="outline" size="sm">
              Filter
            </Button>
            {filtered ? (
              <Button
                render={<Link href="/admin/users" />}
                nativeButton={false}
                variant="ghost"
                size="sm"
              >
                Clear
              </Button>
            ) : null}
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {rows.map((row) => (
              <li key={row.id} className="space-y-3 px-4 py-3">
                <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
                  <Avatar size="sm">
                    {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
                    <AvatarFallback>{initialsOf(row.fullName, row.email)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <Link
                        href={`/profile/${row.id}`}
                        className="hover:underline"
                      >
                        {row.fullName || "—"}
                      </Link>
                      {isSuperAdminEmail(row.email) ? (
                        <Badge variant="outline" className="ml-2 align-middle">
                          Super
                        </Badge>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.isBanned ? <Badge variant="destructive">Banned</Badge> : null}
                    <Badge
                      variant={
                        row.role === "admin"
                          ? "default"
                          : row.role === "seller"
                            ? "secondary"
                            : "outline"
                      }
                      className="capitalize"
                    >
                      {row.role}
                    </Badge>
                  </div>
                  <div className="hidden text-right text-xs text-muted-foreground md:block">
                    <p>Joined {formatDate(row.joined)}</p>
                    <p>Last seen {formatDate(row.lastSignIn)}</p>
                  </div>
                </div>
                <UserActions
                  key={`${row.id}-${row.role}-${row.isBanned}`}
                  userId={row.id}
                  email={row.email}
                  role={row.role}
                  isBanned={row.isBanned}
                  viewerIsSuper={isSuper}
                  targetIsSuper={isSuperAdminEmail(row.email)}
                />
              </li>
            ))}
            {rows.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                {filtered
                  ? "No members match this filter."
                  : "No members yet — invite the first one above."}
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
