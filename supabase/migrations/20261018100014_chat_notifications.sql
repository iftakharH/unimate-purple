-- =============================================================================
-- Migration 14 — chat notifications + one-conversation-per-listing guarantee
--
-- 1. A buyer can only ever have ONE conversation per listing (find-or-create
--    in the app is now race-safe at the database level).
-- 2. The existing messages trigger now also drops a notification for the
--    recipient. Notifications have no INSERT policy for users — the DB is the
--    only writer (security-definer), which is exactly the intent.
-- =============================================================================

create unique index if not exists conversations_listing_buyer_unique
  on public.conversations (listing_id, buyer_id);

create or replace function public.on_message_created()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_buyer uuid;
  v_seller uuid;
  v_recipient uuid;
  v_sender_name text;
begin
  update public.conversations
     set updated_at = now()
   where id = new.conversation_id
   returning buyer_id, seller_id into v_buyer, v_seller;

  v_recipient := case when new.sender_id = v_buyer then v_seller else v_buyer end;

  select full_name into v_sender_name
    from public.profiles
   where id = new.sender_id;

  insert into public.notifications (user_id, type, title, body, link)
  values (
    v_recipient,
    'message',
    coalesce(v_sender_name, 'Someone') || ' sent you a message',
    left(new.body, 140),
    '/messages/' || new.conversation_id
  );

  return new;
end;
$function$;
