-- =============================================================================
-- Unimate · Phase 1 · Migration 11/11 — Merge payments UPDATE policies
--
-- The advisor flagged two permissive UPDATE policies on `payments`
-- (payments_update_buyer_pending + payments_update_admin) — both evaluated
-- for every UPDATE. Merged into one exactly-equivalent policy:
--   USING      = (admin) OR (own pending payment)
--   WITH CHECK = (admin) OR (own payment)
-- =============================================================================

drop policy "payments_update_buyer_pending" on public.payments;
drop policy "payments_update_admin" on public.payments;

create policy "payments_update_own_pending_or_admin"
  on public.payments for update
  using (
    public.is_admin()
    or (payer_id = (select auth.uid()) and status = 'pending')
  )
  with check (
    public.is_admin()
    or payer_id = (select auth.uid())
  );
