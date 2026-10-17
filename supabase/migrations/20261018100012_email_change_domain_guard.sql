-- =============================================================================
-- Unimate · Phase 2 · Migration 12 — Email-change domain guard
--
-- Self-signup is already locked to the campus domain by the auth.users INSERT
-- trigger; this closes the matching hole on email CHANGES (a user could
-- otherwise swap their campus email for any address after signing up).
-- Super-admin addresses stay allowed. Mirrors `allowed_email_domain()`.
-- =============================================================================

create or replace function public.enforce_email_change_domain()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email
     and not public.is_super_admin_email(new.email)
     and lower(new.email) not like ('%@' || public.allowed_email_domain())
  then
    raise exception 'Account emails must be @% addresses.', public.allowed_email_domain()
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_email_change_domain() from public, anon, authenticated;

create trigger enforce_email_change_domain
  before update of email on auth.users
  for each row execute function public.enforce_email_change_domain();
