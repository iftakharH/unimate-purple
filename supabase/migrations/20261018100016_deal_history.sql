-- =============================================================================
-- Migration 16 — deals: real status history, creation notification, and a
-- correct buyer-insert policy.
--
-- 1. deal_status_history — every transition is logged (actor + optional note),
--    so the deal page shows a true timeline, not a guess.
-- 2. on_deal_created — the seller is notified the moment a request arrives.
-- 3. deals_insert_buyer hardening: the original policy contained tautological
--    checks (l.seller_id = l.seller_id, l.quantity >= l.quantity). It now
--    really requires an ACTIVE listing that is not the buyer's own and has
--    enough stock for the requested quantity.
-- =============================================================================

create table if not exists public.deal_status_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  status public.deal_status not null,
  actor_id uuid references auth.users (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists deal_status_history_deal_idx
  on public.deal_status_history (deal_id, created_at);

alter table public.deal_status_history enable row level security;

drop policy if exists deal_history_select_participants on public.deal_status_history;
create policy deal_history_select_participants on public.deal_status_history
  for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1
      from public.deals d
      where d.id = deal_status_history.deal_id
        and (d.buyer_id = (select auth.uid()) or d.seller_id = (select auth.uid()))
    )
  );

-- Log creation + notify the seller.
create or replace function public.on_deal_created()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.deal_status_history (deal_id, status, actor_id)
  values (new.id, new.status, new.buyer_id);

  perform public.notify(
    new.seller_id,
    'deal_status',
    'New deal request',
    'A buyer wants to make a deal — review it in Deals.',
    '/deals/' || new.id::text
  );
  return new;
end;
$function$;

drop trigger if exists deals_on_created on public.deals;
create trigger deals_on_created
  after insert on public.deals
  for each row execute function public.on_deal_created();

-- Extend the status-change side effects with history logging.
create or replace function public.on_deal_status_change()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  actor uuid := (select auth.uid());
  remaining int;
  previous_qty int;
begin
  if new.status is distinct from old.status then
    insert into public.deal_status_history (deal_id, status, actor_id, note)
    values (new.id, new.status, actor, new.cancel_reason);

    if new.buyer_id <> coalesce(actor, '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify(new.buyer_id, 'deal_status', 'Deal update',
        'Your deal is now: ' || new.status::text, '/deals/' || new.id::text);
    end if;
    if new.seller_id <> coalesce(actor, '00000000-0000-0000-0000-000000000000'::uuid) then
      perform public.notify(new.seller_id, 'deal_status', 'Deal update',
        'Your deal is now: ' || new.status::text, '/deals/' || new.id::text);
    end if;

    if new.status = 'completed' then
      select quantity into previous_qty from public.listings where id = new.listing_id for update;
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
$function$;

-- Backfill history for deals that predate this migration.
insert into public.deal_status_history (deal_id, status, created_at)
select d.id, d.status, d.updated_at
  from public.deals d
 where not exists (
   select 1 from public.deal_status_history h where h.deal_id = d.id
 );

-- Correct the buyer-insert policy (the original checks were no-ops).
drop policy if exists deals_insert_buyer on public.deals;

create policy deals_insert_buyer on public.deals
  for insert
  to authenticated
  with check (
    (buyer_id = (select auth.uid()))
    and not is_banned()
    and exists (
      select 1
      from public.listings l
      where l.id = deals.listing_id
        and l.status = 'active'::public.listing_status
        and l.seller_id <> (select auth.uid())
        and l.quantity >= deals.quantity
    )
  );
