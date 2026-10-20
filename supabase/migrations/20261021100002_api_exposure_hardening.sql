-- =============================================================================
-- Migration 18 — API exposure hardening + missing FK index.
--
-- Supabase Advisor findings actioned:
--   * on_deal_created() was added after the earlier grant-tightening pass and
--     was still executable through PostgREST by anon/authenticated. It is a
--     trigger-only function — revoke it outright. (Calling it directly has no
--     valid effect, but trigger functions should never be API-callable.)
--   * set_updated_at() is the generic trigger helper — same treatment.
--   * deal_status_history.actor_id had no covering index (perf advisor).
--
-- NOT actioned (accepted by design — see docs/DECISIONS.md ADR-009):
--   * public_profiles is a SECURITY DEFINER view on purpose: profiles RLS
--     only exposes the caller's row, and the view is the column-limited
--     public surface (name, avatar, bio, role, joined date).
--   * is_admin()/is_banned() are callable by anon/authenticated because RLS
--     policies evaluate them as the querying role; they only reveal facts
--     about the caller.
--   * marketplace_stats() is anon-callable on purpose: aggregates-only and
--     used by the signed-out landing path (ADR-021 keeps the numbers hidden
--     in the UI while the signed-in hero still reads them).
-- =============================================================================

revoke execute on function public.on_deal_created() from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;

create index if not exists deal_status_history_actor_idx
  on public.deal_status_history (actor_id);
