/**
 * Shared app constants.
 *
 * ⚠️ The three mirrors — this file, `.env.local` and the SQL functions
 * `public.allowed_email_domain()` / `public.super_admin_emails()` — MUST stay
 * in sync (documented in docs/DECISIONS.md ADR-007). The values here are used
 * for UI-level validation and messaging only; the database is the security
 * boundary.
 */

export const APP_NAME = "Unimate";

export const ALLOWED_EMAIL_DOMAIN = "eastdelta.edu.bd";

export const SUPER_ADMIN_EMAILS = [
  "ihrafi02ctg@gmail.com",
  "242016312@eastdelta.edu.bd",
] as const;

export const CURRENCY_CODE = "BDT";
export const CURRENCY_SYMBOL = "৳";

/** Sign-up rule for the UI: campus domain, or a hardcoded Super Admin email. */
export function isAllowedSignupEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`) ||
    (SUPER_ADMIN_EMAILS as readonly string[]).includes(normalized)
  );
}
