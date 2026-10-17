-- =============================================================================
-- Unimate · Phase 1 · Migration 2/7 — Stores & seller requests
-- Store pages with unique slugs, the "request seller access" workflow, and
-- the admin-approval trigger that promotes the user and opens their store.
-- =============================================================================

-- ---------- helpers ------------------------------------------------------------

create or replace function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.is_banned
  );
$$;

-- ---------- stores ---------------------------------------------------------------

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text not null,
  slug text not null unique,
  logo_url text,
  banner_url text,
  description text,
  contact_phone text,
  pickup_location text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

create or replace function public.unique_store_slug(base text)
returns text
language plpgsql
stable
as $$
declare
  candidate text;
  i int := 0;
  base_slug text := public.slugify(base);
begin
  if base_slug = '' then
    base_slug := 'store';
  end if;

  candidate := base_slug;
  loop
    exit when not exists (select 1 from public.stores s where s.slug = candidate);
    i := i + 1;
    candidate := base_slug || '-' || i::text;
    if i > 100 then
      candidate := base_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
      exit;
    end if;
  end loop;

  return candidate;
end;
$$;

-- Auto-slug on insert. Slugs stay stable when the business name changes later
-- (shareable URLs), and the unique constraint is the final backstop.
create or replace function public.set_store_slug()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.slug is null or trim(new.slug) = '' then
    new.slug := public.unique_store_slug(new.business_name);
  end if;
  return new;
end;
$$;

create trigger stores_set_slug
  before insert on public.stores
  for each row execute function public.set_store_slug();

-- ---------- seller requests -------------------------------------------------------

create type public.seller_request_status as enum ('pending', 'approved', 'rejected');

create table public.seller_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  business_name text not null,
  description text,
  contact_phone text,
  status public.seller_request_status not null default 'pending',
  admin_note text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger seller_requests_set_updated_at
  before update on public.seller_requests
  for each row execute function public.set_updated_at();

create index seller_requests_user_idx
  on public.seller_requests (user_id, created_at desc);

create index seller_requests_status_idx
  on public.seller_requests (status, created_at);

-- One open request per user at a time.
create unique index seller_requests_one_pending_idx
  on public.seller_requests (user_id)
  where (status = 'pending');

-- ---------- approval side effects --------------------------------------------------

-- Runs as the table owner (security definer), so it can promote the role and
-- create the store atomically without giving anyone elevated RLS access.
create or replace function public.on_seller_request_reviewed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_at := coalesce(new.reviewed_at, now());
    new.reviewed_by := coalesce(new.reviewed_by, (select auth.uid()));

    if new.status = 'approved' then
      update public.profiles
         set role = 'seller'
       where id = new.user_id
         and role = 'buyer';

      insert into public.stores (owner_id, business_name, slug, description, contact_phone)
      values (
        new.user_id,
        new.business_name,
        public.unique_store_slug(new.business_name),
        new.description,
        new.contact_phone
      )
      on conflict (owner_id) do update
        set business_name = excluded.business_name,
            is_active = true;

      perform public.notify(
        new.user_id,
        'seller_request_approved',
        'Seller request approved',
        'Your store is live. Add your first listing from the seller dashboard.',
        '/seller/store'
      );
    elsif new.status = 'rejected' then
      perform public.notify(
        new.user_id,
        'seller_request_rejected',
        'Seller request rejected',
        coalesce(new.admin_note, 'Your seller request was not approved.'),
        '/become-seller'
      );
    end if;
  end if;

  return new;
end;
$$;

create trigger seller_requests_reviewed
  before update on public.seller_requests
  for each row execute function public.on_seller_request_reviewed();

-- ---------- Row Level Security ------------------------------------------------------

alter table public.stores enable row level security;
alter table public.seller_requests enable row level security;

-- stores: publicly readable when active; owner always sees their own; admins all.
create policy "stores_select_public_active"
  on public.stores for select
  using (is_active or owner_id = (select auth.uid()) or public.is_admin());

create policy "stores_insert_own_seller"
  on public.stores for insert
  with check (
    owner_id = (select auth.uid())
    and not public.is_banned()
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'seller'
    )
  );

create policy "stores_update_own_or_admin"
  on public.stores for update
  using (owner_id = (select auth.uid()) or public.is_admin())
  with check (owner_id = (select auth.uid()) or public.is_admin());

create policy "stores_delete_admin"
  on public.stores for delete
  using (public.is_admin());

-- seller_requests: users create and track their own; admins review everything.
create policy "seller_requests_insert_own"
  on public.seller_requests for insert
  with check (user_id = (select auth.uid()) and not public.is_banned());

create policy "seller_requests_select_own_or_admin"
  on public.seller_requests for select
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "seller_requests_update_admin"
  on public.seller_requests for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "seller_requests_delete_admin"
  on public.seller_requests for delete
  using (public.is_admin());
