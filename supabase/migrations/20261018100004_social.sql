-- =============================================================================
-- Unimate · Phase 1 · Migration 4/7 — Social
-- Saved items, per-listing conversations, messages (immutable, participants
-- only) and the realtime publication used for live chat in Phase 6.
-- =============================================================================

-- ---------- saved items ---------------------------------------------------------

create table public.saved_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create index saved_items_user_idx
  on public.saved_items (user_id, created_at desc);

-- ---------- conversations ---------------------------------------------------------

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  seller_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversations_participants_differ check (buyer_id <> seller_id),
  constraint conversations_one_thread_per_listing unique (listing_id, buyer_id)
);

create trigger conversations_set_updated_at
  before update on public.conversations
  for each row execute function public.set_updated_at();

create index conversations_buyer_idx
  on public.conversations (buyer_id, updated_at desc);
create index conversations_seller_idx
  on public.conversations (seller_id, updated_at desc);

-- ---------- messages ---------------------------------------------------------------

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index messages_conversation_created_idx
  on public.messages (conversation_id, created_at);
create index messages_unread_idx
  on public.messages (conversation_id)
  where read_at is null;

-- Bump the conversation so the chat list sorts by latest activity.
create or replace function public.on_message_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_on_created
  after insert on public.messages
  for each row execute function public.on_message_created();

-- Messages are immutable: only read_at may change (no edits, no resends).
create or replace function public.protect_message_fields()
returns trigger
language plpgsql
as $$
begin
  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.conversation_id is distinct from old.conversation_id then
    raise exception 'Messages are immutable; only read_at can be updated';
  end if;
  return new;
end;
$$;

create trigger messages_protect_fields
  before update on public.messages
  for each row execute function public.protect_message_fields();

-- ---------- Row Level Security -------------------------------------------------------

alter table public.saved_items enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- saved_items: strictly personal.
create policy "saved_items_own_all"
  on public.saved_items for all
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and not public.is_banned());

-- conversations: only the two participants (or an admin) can see a thread.
create policy "conversations_select_participants"
  on public.conversations for select
  using (
    public.is_admin()
    or buyer_id = (select auth.uid())
    or seller_id = (select auth.uid())
  );

-- Threads are opened by the buyer from an active listing (one per listing).
create policy "conversations_insert_buyer"
  on public.conversations for insert
  with check (
    buyer_id = (select auth.uid())
    and buyer_id <> seller_id
    and not public.is_banned()
    and exists (
      select 1 from public.listings l
      where l.id = listing_id
        and l.seller_id = seller_id
        and l.status = 'active'
    )
  );

create policy "conversations_update_admin"
  on public.conversations for update
  using (public.is_admin())
  with check (public.is_admin());

create policy "conversations_delete_admin"
  on public.conversations for delete
  using (public.is_admin());

-- messages: participants read and write; THE acceptance test — a user can
-- never read someone else's thread.
create policy "messages_select_participants"
  on public.messages for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    )
  );

create policy "messages_insert_participants"
  on public.messages for insert
  with check (
    sender_id = (select auth.uid())
    and not public.is_banned()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    )
  );

-- Only the recipient marks a message read (sender cannot fake it).
create policy "messages_update_recipient_read"
  on public.messages for update
  using (
    read_at is null
    and sender_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    )
  )
  with check (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.buyer_id = (select auth.uid()) or c.seller_id = (select auth.uid()))
    )
  );

create policy "messages_delete_admin"
  on public.messages for delete
  using (public.is_admin());

-- ---------- realtime -------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;
end $$;
