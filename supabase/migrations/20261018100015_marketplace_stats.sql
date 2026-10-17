-- =============================================================================
-- Migration 15 — public marketplace stats
--
-- The landing's "Right now inside" card counts live listings and stores for
-- signed-out visitors. Since migration 13 the product tables are
-- authenticated-only, so the counts must come from a narrow SECURITY DEFINER
-- function that exposes AGGREGATES ONLY — never rows.
-- =============================================================================

create or replace function public.marketplace_stats()
returns table (active_listings bigint, active_stores bigint)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.listings where status = 'active'),
    (select count(*) from public.stores where is_active);
$$;

grant execute on function public.marketplace_stats() to anon, authenticated;
