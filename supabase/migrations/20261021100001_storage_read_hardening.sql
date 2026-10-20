-- =============================================================================
-- Migration 17 — storage read hardening.
--
-- The three buckets are public by design (ADR-013): files are served through
-- the /storage/v1/object/public/ endpoint, which does not consult RLS at all.
-- The *_public_read SELECT policies on storage.objects were therefore only
-- enabling the storage API's list/metadata endpoints for anon callers — i.e.
-- enumerating every uploaded file with the (public) anon key.
--
-- The app never lists or downloads through the storage API: uploads use
-- INSERT (own-folder) policies, replacements use UPDATE (own), cleanup uses
-- DELETE (own), and rendering uses getPublicUrl + next/image. Dropping the
-- SELECT policies removes enumeration while keeping every used flow intact.
-- =============================================================================

drop policy if exists listing_images_public_read on storage.objects;
drop policy if exists avatars_public_read on storage.objects;
drop policy if exists store_assets_public_read on storage.objects;
