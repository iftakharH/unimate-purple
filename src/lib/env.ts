import { z } from "zod";

/**
 * Public (client-safe) environment.
 *
 * Only `NEXT_PUBLIC_*` variables live here — they are inlined into the
 * browser bundle at build time. Never add server secrets to this file.
 *
 * Each variable is read with a *static* `process.env.X` access so Next.js
 * can statically inline the values into client bundles. Dynamic access
 * (`process.env[name]`) is NOT inlined and returns undefined in the browser.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
  /** `"true" | "false"` string from the env, normalized to a boolean. */
  NEXT_PUBLIC_SHOW_SANDBOX_BADGE: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  NEXT_PUBLIC_CURRENCY: z.string().default("BDT"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export const env: PublicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SHOW_SANDBOX_BADGE: process.env.NEXT_PUBLIC_SHOW_SANDBOX_BADGE,
  NEXT_PUBLIC_CURRENCY: process.env.NEXT_PUBLIC_CURRENCY,
});
