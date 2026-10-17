-- =============================================================================
-- Unimate · Phase 1 · Migration 5/7 — Deals & payments
-- The deal state machine (requested → accepted → paid? → handed_over →
-- completed, + rejected/cancelled), side effects (notifications, listing
-- sold/sold-out), and payment records. NO card data is ever stored.
-- =============================================================================

create type public.deal_status as enum (
  'requested', 'accepted', 'rejected', 'paid', 'handed_over', 'completed', 'cancelled'
);
create type public.payment_mode as enum ('pay_on_campus', 'pay_in_app');
create type public.payment_method as enum ('card', 'mobile_wallet', 'bank');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');

-- ---------- deals ------------------------------------------------------------------

create table public.deals (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  status public.deal_status not null default 'requested',
  payment_mode public.payment_mode not null,
  quantity int not null default 1 check (quantity >= 1),
  amount_bdt numeric(12, 2) not null check (amount_bdt >= 0),
  buyer_note text,
  cancel_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint deals_participants_differ check (buyer_id <> seller_id)
);

create trigger deals_set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

create index deals_buyer_idx on public.deals (buyer_id, updated_at desc);
create index deals_seller_idx on public.deals (seller_id, updated_at desc);
create index deals_listing_idx on public.deals (listing_id);
create index deals_status_idx on public.deals (status, created_at desc);

-- ---------- deal state machine ---------------------------------------------------------

create or replace function public.enforce_deal_transitions()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
begin
  if new.status is distinct from old.status then
    -- Admins are trusted to correct any deal manually.
    if public.is_admin() then
      return new;
    end if;

    if actor is null then
      return new;  -- service-role / system (payment trigger)
    end if;

    -- requested -----------------------------------------------------------------
    if old.status = 'requested' and new.status = 'accepted' and actor <> old.seller_id then
      raise exception 'Only the seller can accept a deal';
    elsif old.status = 'requested' and new.status = 'rejected' and actor <> old.seller_id then
      raise exception 'Only the seller can reject a deal';
    elsif old.status = 'requested' and new.status not in ('accepted', 'rejected', 'cancelled') then
      raise exception 'Invalid transition % -> %', old.status, new.status;

    -- accepted ------------------------------------------------------------------
    elsif old.status = 'accepted' and new.status = 'paid' then
      if actor <> old.buyer_id then
        raise exception 'Only the buyer can pay';
      end if;
      if old.payment_mode <> 'pay_in_app' then
        raise exception 'This deal is pay-on-campus; there is nothing to pay in the app';
      end if;
    elsif old.status = 'accepted' and new.status = 'completed' then
      if actor <> old.seller_id then
        raise exception 'Only the seller can confirm a campus handover';
      end if;
      if old.payment_mode <> 'pay_on_campus' then
        raise exception 'In-app payment deals must be handed over before completion';
      end if;
    elsif old.status = 'accepted' and new.status not in ('paid', 'completed', 'cancelled') then
      raise exception 'Invalid transition % -> %', old.status, new.status;

    -- paid ------------------------------------------------------------------------
    elsif old.status = 'paid' and new.status = 'handed_over' and actor <> old.seller_id then
      raise exception 'Only the seller can confirm the handover';
    elsif old.status = 'paid' and new.status <> 'handed_over' then
      raise exception 'Invalid transition % -> %', old.status, new.status;

    -- handed_over --------------------------------------------------------------------
    elsif old.status = 'handed_over' and new.status = 'completed' and actor <> old.buyer_id then
      raise exception 'Only the buyer can confirm receipt';
    elsif old.status = 'handed_over' and new.status <> 'completed' then
      raise exception 'Invalid transition % -> %', old.status, new.status;

    -- terminal states -------------------------------------------------------------------
    elsif old.status in ('rejected', 'completed') then
      raise exception 'A % deal cannot change status', old.status;
    elsif old.status = 'cancelled' then
      raise exception 'A cancelled deal cannot change status';
    end if;
  end if;

  return new;
end;
$$;

create trigger deals_enforce_transitions
  before update on public.deals
  for each row execute function public.enforce_deal_transitions();

-- ---------- deal side effects -------------------------------------------------------------

-- Notify both parties (except whoever made the change). On completion, the
-- listing is marked sold / decremented to sold_out exactly per spec.
create or replace function public.on_deal_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  remaining int;
  previous_qty int;
begin
  if new.status is distinct from old.status then
    if new.buyer_id <> coalesce(actor, '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify(
        new.buyer_id, 'deal_status', 'Deal update',
        'Your deal is now: ' || new.status::text, '/deals/' || new.id::text
      );
    end if;
    if new.seller_id <> coalesce(actor, '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify(
        new.seller_id, 'deal_status', 'Deal update',
        'Your deal is now: ' || new.status::text, '/deals/' || new.id::text
      );
    end if;

    if new.status = 'completed' then
      select quantity into previous_qty
        from public.listings where id = new.listing_id for update;

      if previous_qty is not null then
        remaining := greatest(previous_qty - new.quantity, 0);
        update public.listings
           set quantity = remaining,
               status = case
                          when remaining > 0 then status
                          when previous_qty <= 1 then 'sold'::public.listing_status
                          else 'sold_out'::public.listing_status
                        end
         where id = new.listing_id;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger deals_status_side_effects
  after update on public.deals
  for each row execute function public.on_deal_status_change();

-- ---------- payments -------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  method public.payment_method not null,
  status public.payment_status not null default 'pending',
  amount_bdt numeric(12, 2) not null check (amount_bdt >= 0),
  transaction_id text not null unique,
  failure_reason text,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- PRIVACY RULE: never add card number / CVV / expiry columns. Only the
-- method type, status, amount, transaction reference and timestamps are
-- persisted (mock or real gateway alike).

create trigger payments_set_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

create index payments_deal_idx on public.payments (deal_id, created_at desc);
create index payments_status_idx on public.payments (status, created_at desc);

-- A successful in-app payment moves the deal to `paid`.
create or replace function public.on_payment_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'succeeded' and old.status is distinct from 'succeeded' then
    update public.deals
       set status = 'paid'
     where id = new.deal_id
       and status = 'accepted'
       and payment_mode = 'pay_in_app';
  end if;
  return new;
end;
$$;

create trigger payments_status_side_effects
  after update on public.payments
  for each row execute function public.on_payment_status_change();

-- Payments are immutable apart from status/reason/refund bookkeeping, and
-- only admins may mark a refund.
create or replace function public.protect_payment_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.deal_id is distinct from old.deal_id
     or new.payer_id is distinct from old.payer_id
     or new.method is distinct from old.method
     or new.amount_bdt is distinct from old.amount_bdt
     or new.transaction_id is distinct from old.transaction_id then
    raise exception 'Payment records are immutable; only status can change';
  end if;

  if new.status = 'refunded' and not public.is_admin() then
    raise exception 'Only admins can mark a payment as refunded';
  end if;

  return new;
end;
$$;

create trigger payments_protect_fields
  before update on public.payments
  for each row execute function public.protect_payment_fields();

-- ---------- Row Level Security ---------------------------------------------------------------

alter table public.deals enable row level security;
alter table public.payments enable row level security;

-- deals: participants + admins. Creation is buyer-side from an active listing
-- with enough stock.
create policy "deals_select_participants"
  on public.deals for select
  using (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
  );

create policy "deals_insert_buyer"
  on public.deals for insert
  with check (
    buyer_id = (select auth.uid())
    and not public.is_banned()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = seller_id
        and l.status = 'active'
        and l.quantity >= quantity
    )
  );

create policy "deals_update_participants_or_admin"
  on public.deals for update
  using (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
  )
  with check (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
  );

create policy "deals_delete_admin"
  on public.deals for delete
  using (public.is_admin());

-- payments: visible to the deal participants and admins. Inserted only by the
-- buyer for an accepted pay-in-app deal.
create policy "payments_select_participants"
  on public.payments for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.deals d
      where d.id = deal_id
        and (d.buyer_id = (select auth.uid()) or d.seller_id = (select auth.uid()))
    )
  );

create policy "payments_insert_buyer"
  on public.payments for insert
  with check (
    payer_id = (select auth.uid())
    and exists (
      select 1 from public.deals d
      where d.id = deal_id
        and d.buyer_id = (select auth.uid())
        and d.payment_mode = 'pay_in_app'
        and d.status in ('accepted', 'paid')
    )
  );

create policy "payments_update_buyer_pending"
  on public.payments for update
  using (payer_id = (select auth.uid()) and status = 'pending')
  with check (payer_id = (select auth.uid()));

create policy "payments_update_admin"
  on public.payments for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "payments_delete_admin"
  on public.payments for delete
  using (public.is_admin());
