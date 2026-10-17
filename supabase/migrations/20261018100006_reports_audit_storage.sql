-- =============================================================================
-- Unimate · Phase 1 · Migration 6/7 — Moderation, audit log & storage
-- Reports queue, append-only admin audit log, and the three storage buckets
-- (listing images, avatars, store assets) with owner-scoped write policies.
-- =============================================================================

create type public.report_status as enum ('open', 'reviewed', 'dismissed');
create type public.report_target as enum ('listing', 'user', 'message', 'store', 'deal');

-- ---------- reports ---------------------------------------------------------------

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  target_type public.report_target not null,
  target_id uuid not null,
  reason text not null,
  details text,
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index reports_status_idx on public.reports (status, created_at desc);
create index reports_reporter_idx on public.reports (reporter_id, created_at desc);

alter table public.reports enable row level security;

create policy "reports_insert_own"
  on public.reports for insert
  with check (reporter_id = (select auth.uid()) and not public.is_banned());

create policy "reports_select_own_or_admin"
  on public.reports for select
  using (reporter_id = (select auth.uid()) or public.is_admin());

create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "reports_delete_admin"
  on public.reports for delete
  using (public.is_admin());

-- ---------- admin audit log ----------------------------------------------------------

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target_type text,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);

-- Stamp the actor automatically when the app does not pass one.
create or replace function public.stamp_audit_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.actor_id is null then
    new.actor_id := (select auth.uid());
  end if;
  return new;
end;
$$;

create trigger admin_audit_log_stamp
  before insert on public.admin_audit_log
  for each row execute function public.stamp_audit_actor();

alter table public.admin_audit_log enable row level security;

create policy "admin_audit_log_select_admin"
  on public.admin_audit_log for select
  using (public.is_admin());

create policy "admin_audit_log_insert_admin"
  on public.admin_audit_log for insert
  with check (public.is_admin());

-- Intentionally NO update/delete policies: the audit trail is append-only,
-- even for admins. (Service-role corrections remain possible and leave no
-- trace in this table, which is the accepted trade-off for course projects.)

-- ---------- storage buckets ------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('listing-images', 'listing-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('avatars', 'avatars', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('store-assets', 'store-assets', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Object path convention: {bucket}/{auth.uid()}/{filename}
-- The first path segment is the owner's uid, which is what the write policies
-- check — users can only write inside their own folder.

-- listing-images -----------------------------------------------------------------
create policy "listing_images_public_read"
  on storage.objects for select
  using (bucket_id = 'listing-images');

create policy "listing_images_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "listing_images_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "listing_images_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- avatars --------------------------------------------------------------------------
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- store-assets -----------------------------------------------------------------------
create policy "store_assets_public_read"
  on storage.objects for select
  using (bucket_id = 'store-assets');

create policy "store_assets_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "store_assets_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "store_assets_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'store-assets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
