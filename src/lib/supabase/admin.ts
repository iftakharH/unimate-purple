import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Privileged Supabase client using the service-role key.
 *
 * ⚠️ BYPASSES Row Level Security. Never import this into a client component
 * (the `server-only` guard above enforces that at build time). Only use it
 * in server actions / route handlers for flows that genuinely require
 * elevated access, e.g.:
 *   - inviting a user or creating one with a temporary password (Admin API)
 *   - writing to `admin_audit_log`
 *
 * Every call site must perform its own authorization check (e.g. "caller is
 * an admin") before using this client.
 */
export function createAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
