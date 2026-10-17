-- =============================================================================
-- Unimate · Phase 1 · Migration 9/9 — Advisor hardening
-- Response to the Supabase security advisor run after the initial schema:
--
-- 1. Pin `search_path` on the remaining helper functions (advisor:
--    function_search_path_mutable).
-- 2. Revoke EXECUTE from public/anon/authenticated on every internal
--    function that is only meant to run as a TRIGGER or from other
--    security-definer code (advisor: *_security_definer_function_executable).
--    Trigger execution does not check EXECUTE grants, but PostgREST would
--    happily list them at /rest/v1/rpc/* — no reason to expose them.
--
-- Intentionally LEFT executable and documented as accepted:
--   - is_admin() / is_banned()   — used inside RLS policies (the invoking
--     role needs EXECUTE) and harmless booleans.
--   - ensure_super_admin()       — the one intentional RPC (authenticated).
--   - public_profiles view       — flagged as `security_definer_view`; the
--     view exists precisely to expose the safe subset of columns
--     (id, full_name, avatar_url, bio, role, created_at) to everyone.
--     See docs/DECISIONS.md ADR-009.
-- =============================================================================

-- ---------- 1. search_path pinning ----------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text
language sql
stable
set search_path = public
as $$
  select trim(both '-' from lower(regexp_replace(coalesce(input, ''), '[^a-zA-Z0-9]+', '-', 'g')));
$$;

create or replace function public.super_admin_emails()
returns text[]
language sql
stable
set search_path = public
as $$
  select array['ihrafi02ctg@gmail.com', '242016312@eastdelta.edu.bd']::text[];
$$;

create or replace function public.is_super_admin_email(email text)
returns boolean
language sql
stable
set search_path = public
as $$
  select lower(coalesce(email, '')) = any (public.super_admin_emails());
$$;

create or replace function public.allowed_email_domain()
returns text
language sql
stable
set search_path = public
as $$
  select 'eastdelta.edu.bd';
$$;

create or replace function public.unique_store_slug(base text)
returns text
language plpgsql
stable
set search_path = public
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

create or replace function public.protect_message_fields()
returns trigger
language plpgsql
set search_path = public
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

-- ---------- 2. revoke API execution on internal functions --------------------------

revoke execute on function public.enforce_deal_transitions() from public, anon, authenticated;
revoke execute on function public.enforce_listing_image_limit() from public, anon, authenticated;
revoke execute on function public.enforce_signup_email_domain() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify(uuid, text, text, text, text) from public, anon, authenticated;
revoke execute on function public.on_deal_status_change() from public, anon, authenticated;
revoke execute on function public.on_message_created() from public, anon, authenticated;
revoke execute on function public.on_payment_status_change() from public, anon, authenticated;
revoke execute on function public.on_seller_request_reviewed() from public, anon, authenticated;
revoke execute on function public.protect_message_fields() from public, anon, authenticated;
revoke execute on function public.protect_payment_fields() from public, anon, authenticated;
revoke execute on function public.protect_profile_fields() from public, anon, authenticated;
revoke execute on function public.protect_super_admin_delete() from public, anon, authenticated;
revoke execute on function public.set_store_slug() from public, anon, authenticated;
revoke execute on function public.stamp_audit_actor() from public, anon, authenticated;
revoke execute on function public.super_admin_emails() from public, anon, authenticated;
revoke execute on function public.is_super_admin_email(text) from public, anon, authenticated;
revoke execute on function public.allowed_email_domain() from public, anon, authenticated;
revoke execute on function public.slugify(text) from public, anon, authenticated;
revoke execute on function public.unique_store_slug(text) from public, anon, authenticated;

-- ensure_super_admin stays callable by signed-in users (bootstrap RPC).
revoke execute on function public.ensure_super_admin() from public, anon;
grant execute on function public.ensure_super_admin() to authenticated;
