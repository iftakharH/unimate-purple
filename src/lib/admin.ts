import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthContext } from "@/lib/auth";
import { errorState } from "@/lib/validation/helpers";
import type { Database, Json } from "@/types/database";

type AdminSupabase = SupabaseClient<Database>;

/**
 * Shared admin guard for Server Actions / admin pages — the page guard alone
 * is never enough, every action re-checks the caller (a banned admin is not
 * an admin: is_admin() in SQL agrees).
 */
export async function requireAdminContext() {
  const ctx = await getAuthContext();
  const { user, profile } = ctx;
  if (!user || profile?.role !== "admin" || profile.is_banned) {
    return { ok: false as const, state: errorState("Admins only.") };
  }
  return { ok: true as const, supabase: ctx.supabase, user, profile };
}

/**
 * Every admin action writes one row to public.admin_audit_log. The audit
 * insert never blocks the action itself — a failure is logged for the
 * developer instead (the policy only allows admins to insert, so a failure
 * here would mean a bug, not user error).
 */
export async function logAdminAction(
  supabase: AdminSupabase,
  entry: {
    action: string;
    targetType: string;
    targetId?: string | null;
    details?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("admin_audit_log").insert({
    action: entry.action,
    target_type: entry.targetType,
    target_id: entry.targetId ?? null,
    details: (entry.details ?? {}) as Json,
  });
  if (error) {
    console.error("[admin-audit]", entry.action, error.message);
  }
}
