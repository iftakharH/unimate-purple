-- =============================================================================
-- Unimate · Phase 1 · Migration 1/7 — Core platform
-- Roles, profiles, notifications, invite registry, auth guards (email domain,
-- profile bootstrap, super-admin protection) and shared helper functions.
-- =============================================================================

-- ---------- enums ------------------------------------------------------------

create type public.user_role as enum ('buyer', 'seller', 'admin');

-- ---------- helper functions -------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from lower(regexp_replace(coalesce(input, ''), '[^a-zA-Z0-9]+', '-', 'g')));
$$;

-- The two hardcoded Super Admins (must mirror SUPER_ADMIN_EMAILS in .env.local).
-- Changing them requires a migration; keep both lists in sync.
-- STABLE, not IMMUTABLE: an immutable return value gets constant-folded into
-- other functions' cached plans, so a later change to the list would be
-- invisible to long-lived (pooled) sessions.
create or replace function public.super_admin_emails()
returns text[]
language sql
stable
as $$
  select array['ihrafi02ctg@gmail.com', '242016312@eastdelta.edu.bd']::text[];
$$;

create or replace function public.is_super_admin_email(email text)
returns boolean
language sql
stable
as $$
  select lower(coalesce(email, '')) = any (public.super_admin_emails());
$$;

create or replace function public.allowed_email_domain()
returns text
language sql
stable
as $$
  select 'eastdelta.edu.bd';
$$;

-- ---------- tables -----------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  phone text,
  bio text,
  role public.user_role not null default 'buyer',
  is_banned boolean not null default false,
  must_change_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Security-definer so RLS policies on other tables (and on profiles itself)
-- can call it without recursive policy evaluation. Created after the profiles
-- table on purpose: SQL-language functions are validated at creation time.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'admin'
      and p.is_banned = false
  );
$$;

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table public.invited_emails (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  role public.user_role not null default 'buyer',
  invited_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

-- ---------- notification helper ----------------------------------------------

create or replace function public.notify(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_body text default null,
  p_link text default null
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
$$;

-- ---------- auth: signup domain gate ------------------------------------------

-- Hard database boundary: self-signup only for the allowed domain, Super Admin
-- emails, or emails previously registered in invited_emails. The UI check alone
-- is NOT a security control.
create or replace function public.enforce_signup_email_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_super_admin_email(new.email)
     or lower(new.email) like ('%@' || public.allowed_email_domain())
     or exists (
       select 1 from public.invited_emails ie
       where lower(ie.email) = lower(new.email)
     )
  then
    return new;
  end if;

  raise exception
    'Sign-up is restricted to @% email addresses. Ask an admin to invite you.',
    public.allowed_email_domain()
    using errcode = 'check_violation';
end;
$$;

create trigger enforce_signup_domain
  before insert on auth.users
  for each row execute function public.enforce_signup_email_domain();

-- ---------- auth: profile bootstrap -------------------------------------------

-- Every new auth user gets a profile. Role resolution:
--   1. Super Admin email        -> admin
--   2. email in invited_emails  -> the invited role
--   3. otherwise                -> buyer (the default for everyone)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role public.user_role := 'buyer';
  invite_role public.user_role;
begin
  if public.is_super_admin_email(new.email) then
    assigned_role := 'admin';
  else
    select ie.role into invite_role
    from public.invited_emails ie
    where lower(ie.email) = lower(new.email)
    limit 1;
    if invite_role is not null then
      assigned_role := invite_role;
    end if;
  end if;

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    assigned_role
  )
  on conflict (id) do nothing;

  update public.invited_emails
     set accepted_at = now()
   where lower(email) = lower(new.email)
     and accepted_at is null;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- auth: login-time super-admin promotion ------------------------------

-- Belt-and-braces for the "admin automatically on first signup/login" rule.
-- Takes NO arguments on purpose: the hardcoded super_admin_emails() list in
-- SQL is the single source of truth. (An earlier draft accepted the list as
-- a parameter — that was a privilege-escalation hole, since any authenticated
-- user can call RPCs with their own arguments. Found by the RLS checklist.)
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

-- ---------- profile field protection --------------------------------------------

-- Users may edit their own profile, but only admins may touch role/ban flags;
-- only Super Admins may promote/demote admins or modify a Super Admin.
-- (auth.uid() is null for service-role/system operations -> allowed.)
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

    -- Whitelisted path: super-admin SELF-bootstrap. A user whose own email is
    -- on the hardcoded super_admin_emails() list may promote themselves — and
    -- only themselves — from buyer to admin. Nobody can promote others, and
    -- no context detection (current_user / GUC flags) is involved: this rule
    -- behaves identically in tests and production.
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

create trigger profiles_protect_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

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

create trigger profiles_protect_delete
  before delete on public.profiles
  for each row execute function public.protect_super_admin_delete();

-- ---------- public profile view ------------------------------------------------

-- The table stays private (own row or admin). Public pages read these safe
-- fields through the view instead; the view is owned by postgres and therefore
-- bypasses RLS by design.
create or replace view public.public_profiles as
  select id, full_name, avatar_url, bio, role, created_at
  from public.profiles;

grant select on public.public_profiles to anon, authenticated;

-- ---------- Row Level Security ---------------------------------------------------

alter table public.profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.invited_emails enable row level security;

-- profiles: read own full row; everyone else goes through public_profiles.
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = (select auth.uid()) or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.is_admin());

-- (no insert policy: profiles are created exclusively by the auth trigger)

-- notifications: users read/mark/delete their own; inserts happen only through
-- security-definer triggers and the notify() helper.
create policy "notifications_select_own"
  on public.notifications for select
  using (user_id = (select auth.uid()));

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notifications_delete_own"
  on public.notifications for delete
  using (user_id = (select auth.uid()));

-- invited_emails: admin-only surface.
create policy "invited_emails_admin_all"
  on public.invited_emails for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------- realtime --------------------------------------------------------------

-- Live badge counts for the notification bell (Phase 6 consumes this).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
