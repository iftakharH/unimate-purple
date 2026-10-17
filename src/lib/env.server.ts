import "server-only";

import { z } from "zod";

/**
 * Server-only environment.
 *
 * The `server-only` import makes the build fail if this module is ever
 * imported from a client component — a hard guarantee that the
 * service-role key can never leak into the browser bundle.
 *
 * Parsing is lazy (on first call) so that:
 *  - `next build` succeeds before every secret is configured, and
 *  - missing values produce a clear, actionable error at the moment a
 *    server action actually needs them.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, "SUPABASE_SERVICE_ROLE_KEY is required for admin actions. Get it from Supabase Dashboard -> Project Settings -> API."),
  SUPER_ADMIN_EMAILS: z
    .string()
    .default("ihrafi02ctg@gmail.com,242016312@eastdelta.edu.bd")
    .transform((value) =>
      value
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ALLOWED_EMAIL_DOMAIN: z.string().default("eastdelta.edu.bd"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (!cached) {
    cached = serverEnvSchema.parse({
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPER_ADMIN_EMAILS: process.env.SUPER_ADMIN_EMAILS,
      ALLOWED_EMAIL_DOMAIN: process.env.ALLOWED_EMAIL_DOMAIN,
    });
  }
  return cached;
}

/** True when `email` is one of the hardcoded Super Admins from `SUPER_ADMIN_EMAILS`. */
export function isSuperAdminEmail(email: string): boolean {
  return serverEnv().SUPER_ADMIN_EMAILS.includes(email.trim().toLowerCase());
}
