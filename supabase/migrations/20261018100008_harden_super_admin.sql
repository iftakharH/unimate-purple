-- =============================================================================
-- Unimate · Phase 1 · Migration 8/8 — Security hardening
-- (Found by the RLS checklist on its first run; see docs/DECISIONS.md ADR-007.)
--
-- 1. ensure_super_admin() takes NO arguments. An earlier draft accepted the
--    email list as a parameter — any authenticated user can call RPCs, so a
--    caller-supplied list was a privilege-escalation hole. The hardcoded
--    public.super_admin_emails() array is now the only source of truth
--    (mirrors SUPER_ADMIN_EMAILS in .env; changing it needs a migration).
--
-- 2. protect_profile_fields no longer tries to detect "trusted contexts" via
--    current_user — inside a SECURITY DEFINER function current_user is always
--    the function owner, so that check disabled the guard for everyone.
--    Instead the trigger itself carries one narrowly-scoped whitelist rule:
--    a user may promote THEMSELVES to admin if, and only if, the email on
--    their own auth.users row is on the super-admin list. All other role
--    changes keep the full admin / super-admin checks. This behaviour is
--    identical in tests and production — no hidden context flags.
--
-- Also safe to re-run on a database where migration 1 already applied the
-- earlier (pre-hardening) function shapes.
-- =============================================================================

drop function if exists public.ensure_super_admin(text[]);

create or replace function public.ensure_super_admin()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := (select auth.uid());
  my_email text;
begin
  if me is null then
    return;
  end if;

  select u.email into my_email from auth.users u where u.id = me;
  if my_email is null then
    return;
  end if;

  if public.is_super_admin_email(my_email) then
    update public.profiles
       set role = 'admin'
     where id = me
       and role <> 'admin';
  end if;
end;
$$;

revoke execute on function public.ensure_super_admin() from public, anon;
grant execute on function public.ensure_super_admin() to authenticated;

create or replace function public.protect_profile_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text;
  target_email text;
  actor_is_super boolean;
  target_is_super boolean;
begin
  if actor is null then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.is_banned is distinct from old.is_banned then

    -- Super-admin SELF-bootstrap (see header).
    if not (
      new.role = 'admin'
      and old.role <> 'admin'
      and old.id = actor
      and public.is_super_admin_email((select u.email from auth.users u where u.id = old.id))
    ) then
      if not public.is_admin() then
        raise exception 'Only admins can change roles or ban status';
      end if;

      select u.email into actor_email from auth.users u where u.id = actor;
      select u.email into target_email from auth.users u where u.id = old.id;
      actor_is_super := public.is_super_admin_email(actor_email);
      target_is_super := public.is_super_admin_email(target_email);

      if target_is_super and not actor_is_super then
        raise exception 'Super Admin accounts can only be modified by Super Admins';
      end if;

      if not actor_is_super and (old.role = 'admin' or new.role = 'admin') then
        raise exception 'Only Super Admins can promote or demote admins';
      end if;
    end if;
  end if;

  if new.must_change_password is distinct from old.must_change_password
     and actor <> old.id
     and not public.is_admin() then
    raise exception 'Not allowed to change must_change_password for another user';
  end if;

  return new;
end;
$$;

create or replace function public.protect_super_admin_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := (select auth.uid());
  actor_email text;
  target_email text;
begin
  if actor is null then
    return old;
  end if;

  select u.email into target_email from auth.users u where u.id = old.id;
  if public.is_super_admin_email(target_email) then
    select u.email into actor_email from auth.users u where u.id = actor;
    if not public.is_super_admin_email(actor_email) then
      raise exception 'Super Admin accounts cannot be deleted';
    end if;
  end if;

  return old;
end;
$$;
