import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Per-request cached auth context. `getUser()` verifies the JWT with the
 * Auth server — never trust `getSession()` on the server.
 */
export const getAuthContext = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null as User | null, profile: null as Profile | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return { supabase, user, profile };
});

/** For protected pages: redirects to login when signed out. */
export async function requireUser() {
  const ctx = await getAuthContext();
  if (!ctx.user) {
    redirect("/login");
  }
  return { supabase: ctx.supabase, user: ctx.user, profile: ctx.profile };
}

/** For admin-only pages: non-admins are sent home. */
export async function requireAdmin() {
  const ctx = await requireUser();
  if (ctx.profile?.role !== "admin") {
    redirect("/");
  }
  return ctx;
}
