import { env } from "@/lib/env";

/** Public base URL with no trailing slash — used in email redirect links. */
export function siteUrl(): string {
  return env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
}

/**
 * Open-redirect guard: only same-origin absolute paths are allowed as
 * `next` targets (e.g. "/settings", never "//evil.com" or "https://…").
 */
export function sanitizeNextPath(raw: string | null | undefined, fallback = "/"): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//")) return fallback;
  return raw;
}
