-- =============================================================================
-- Unimate · Phase 1 · Migration 10/10 — Performance advisor follow-ups
--
-- 1. Indexes for the six foreign keys the advisor flagged
--    (unindexed_foreign_keys).
-- 2. Categories: the `for all` admin policy overlapped the public SELECT
--    policy (multiple_permissive_policies). Split into insert/update/delete
--    so SELECT is evaluated by exactly one policy per role.
-- =============================================================================

create index invited_emails_invited_by_idx
  on public.invited_emails (invited_by);

create index messages_sender_idx
  on public.messages (sender_id);

create index payments_payer_idx
  on public.payments (payer_id);

create index reports_reviewed_by_idx
  on public.reports (reviewed_by);

create index saved_items_listing_idx
  on public.saved_items (listing_id);

create index seller_requests_reviewed_by_idx
  on public.seller_requests (reviewed_by);

-- ---------- categories: one permissive SELECT policy per role ----------------------

drop policy "categories_admin_write" on public.categories;

create policy "categories_admin_insert"
  on public.categories for insert to authenticated
  with check (public.is_admin());

create policy "categories_admin_update"
  on public.categories for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "categories_admin_delete"
  on public.categories for delete to authenticated
  using (public.is_admin());
