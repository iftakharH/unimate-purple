-- =============================================================================
-- Migration 13 — gate marketplace reads behind sign-in
--
-- User directive (Phase 5): "can not see any product without login/creating
-- account". Page-level redirects handle the UX; these policy changes make the
-- rule hold at the API layer too, so the public anon key cannot be used to
-- read listings, their photos, or store pages without an authenticated session.
--
-- Scope: SELECT only. Write policies are untouched. Categories stay
-- world-readable (navigation, not products). Storage buckets stay public-read
-- (photo URLs are unguessable and only discoverable through the gated rows) —
-- documented trade-off in ADR-015.
-- =============================================================================

-- listings: authenticated visitors see active listings; owners/admins see all.
drop policy listings_select_public_active on public.listings;

create policy listings_select_authenticated on public.listings
  for select
  to authenticated
  using (
    (status = 'active'::listing_status)
    or (seller_id = (select auth.uid()))
    or is_admin()
  );

-- listing photos follow their listing's visibility rules.
drop policy listing_images_select on public.listing_images;

create policy listing_images_select_authenticated on public.listing_images
  for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1
      from public.listings l
      where l.id = listing_images.listing_id
        and (
          l.status = 'active'::listing_status
          or l.seller_id = (select auth.uid())
        )
    )
  );

-- store pages are part of the gated marketplace too.
drop policy stores_select_public_active on public.stores;

create policy stores_select_authenticated on public.stores
  for select
  to authenticated
  using (
    is_active
    or (owner_id = (select auth.uid()))
    or is_admin()
  );
