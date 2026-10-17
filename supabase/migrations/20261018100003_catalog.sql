-- =============================================================================
-- Unimate · Phase 1 · Migration 3/7 — Catalog
-- Categories, listings (new/used, quantity, pickup spot) and listing photos,
-- including the database-enforced 8-photo limit and search indexes.
-- =============================================================================

create type public.listing_condition as enum ('new', 'used');
create type public.listing_status as enum ('active', 'sold', 'sold_out', 'hidden');

-- ---------- categories ---------------------------------------------------------

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  icon text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- listings -------------------------------------------------------------

create table public.listings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  price_bdt numeric(12, 2) not null check (price_bdt >= 0),
  category_id uuid references public.categories (id) on delete set null,
  condition public.listing_condition not null default 'used',
  status public.listing_status not null default 'active',
  quantity int not null default 1 check (quantity >= 0),
  pickup_location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger listings_set_updated_at
  before update on public.listings
  for each row execute function public.set_updated_at();

create index listings_status_created_idx on public.listings (status, created_at desc);
create index listings_category_status_idx on public.listings (category_id, status);
create index listings_price_idx on public.listings (price_bdt);
create index listings_seller_idx on public.listings (seller_id, created_at desc);
create index listings_store_idx on public.listings (store_id, created_at desc);

-- Fuzzy title search for /browse (ILIKE '%term%' via trigram index).
create extension if not exists pg_trgm with schema extensions;
create index listings_title_trgm_idx
  on public.listings using gin (title extensions.gin_trgm_ops);

-- ---------- listing images ---------------------------------------------------------

create table public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index listing_images_listing_idx
  on public.listing_images (listing_id, position);

-- Max 8 photos per listing — enforced in the database, not only in the UI.
create or replace function public.enforce_listing_image_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(*) from public.listing_images li
    where li.listing_id = new.listing_id
  ) >= 8 then
    raise exception 'A listing can have at most 8 photos'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger listing_images_limit
  before insert on public.listing_images
  for each row execute function public.enforce_listing_image_limit();

-- ---------- Row Level Security ---------------------------------------------------

alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;

-- categories: everyone reads; admins manage.
create policy "categories_select_all"
  on public.categories for select
  using (true);

create policy "categories_admin_write"
  on public.categories for all
  using (public.is_admin())
  with check (public.is_admin());

-- listings: publicly readable only while active; seller sees own; admin all.
create policy "listings_select_public_active"
  on public.listings for select
  using (
    status = 'active'
    or seller_id = (select auth.uid())
    or public.is_admin()
  );

-- The core acceptance rule: a buyer CANNOT create a listing. Only a
-- non-banned seller who owns the target store can.
create policy "listings_insert_own_seller"
  on public.listings for insert
  with check (
    seller_id = (select auth.uid())
    and not public.is_banned()
    and exists (
      select 1 from public.stores s
      where s.id = store_id
        and s.owner_id = (select auth.uid())
        and s.is_active
    )
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'seller'
    )
  );

create policy "listings_update_own_or_admin"
  on public.listings for update
  using (seller_id = (select auth.uid()) or public.is_admin())
  with check (seller_id = (select auth.uid()) or public.is_admin());

create policy "listings_delete_own_or_admin"
  on public.listings for delete
  using (seller_id = (select auth.uid()) or public.is_admin());

-- listing_images: visibility follows the parent listing; only the owning
-- seller (or an admin) can add/reorder/remove photos.
create policy "listing_images_select"
  on public.listing_images for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'active' or l.seller_id = (select auth.uid()))
    )
  );

create policy "listing_images_insert_own"
  on public.listing_images for insert
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );

create policy "listing_images_update_own"
  on public.listing_images for update
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );

create policy "listing_images_delete_own"
  on public.listing_images for delete
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.seller_id = (select auth.uid())
    )
  );
