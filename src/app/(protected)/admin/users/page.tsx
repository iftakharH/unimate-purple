import type { Metadata } from "next";

import { requireAdmin } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminUserForm } from "./admin-user-form";

export const metadata: Metadata = { title: "Users — Admin" };

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

export default async function AdminUsersPage() {
  const { supabase, user: currentUser } = await requireAdmin();
  const isSuper = isSuperAdminEmail(currentUser.email ?? "");

  const admin = createAdminClient();
  const { data: authData } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  const authUsers = authData?.users ?? [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, is_banned, created_at");

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const rows = authUsers
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
            Role changes, bans and the full audit log arrive with the admin panel
            phase.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap"
              >
                <Avatar size="sm">
                  {row.avatarUrl ? <AvatarImage src={row.avatarUrl} alt="" /> : null}
                  <AvatarFallback>{initialsOf(row.fullName, row.email)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {row.fullName || "—"}
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
                <div className="hidden text-right text-xs text-muted-foreground sm:block">
                  <p>Joined {formatDate(row.joined)}</p>
                  <p>Last seen {formatDate(row.lastSignIn)}</p>
                </div>
              </li>
            ))}
            {rows.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-muted-foreground">
                No members yet — invite the first one above.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
