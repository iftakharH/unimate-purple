-- =============================================================================
-- Unimate · RLS acceptance checklist (re-runnable, zero residue)
--
-- Proves the security rules from the spec by creating throwaway users,
-- switching to `authenticated`/`anon` roles with forged JWT claims, and
-- attempting the exact operations that must be blocked (and the positive
-- controls that must succeed). Everything runs inside one DO block that ends
-- with RAISE EXCEPTION (the summary), so the whole transaction — including
-- the test users — rolls back. Nothing is left behind.
--
-- Run via Supabase MCP `execute_sql` or psql as the postgres role.
-- Expected output: a single error message starting with "RLS CHECKLIST".
--
-- NOTE: tests 16/17 replace public.super_admin_emails() to exercise the
-- bootstrap paths. That only works because the helpers are STABLE, not
-- IMMUTABLE (see ADR-008) — immutable values constant-fold into cached plans.
-- If a session cached plans before a helper change, run `discard plans;` first.
-- =============================================================================

do $rls_checklist$
declare
  buyer_a  uuid := '10000000-0000-0000-0000-000000000001';
  seller_a uuid := '10000000-0000-0000-0000-000000000002';
  buyer_b  uuid := '10000000-0000-0000-0000-000000000003';
  seller_c uuid := '10000000-0000-0000-0000-000000000004';
  admin_t  uuid := '10000000-0000-0000-0000-000000000005';
  invited  uuid := '10000000-0000-0000-0000-000000000006';

  v_store_a uuid;
  v_store_c uuid;
  v_listing_a uuid;
  v_listing_c uuid;
  v_conv_a uuid;
  v_conv_c uuid;
  v_count int;
  v_rows int;

  results text := '';
  failures int := 0;
begin
  -- ---------- setup (as postgres, outside RLS) ------------------------------

  insert into public.invited_emails (email, role)
  values ('invited-test@gmail.com', 'seller')
  on conflict (email) do nothing;

  insert into auth.users (id, email, email_confirmed_at) values
    (buyer_a,  'rls-buyer-a@eastdelta.edu.bd',  now()),
    (seller_a, 'rls-seller-a@eastdelta.edu.bd', now()),
    (buyer_b,  'rls-buyer-b@eastdelta.edu.bd',  now()),
    (seller_c, 'rls-seller-c@eastdelta.edu.bd', now()),
    (admin_t,  'rls-admin-t@eastdelta.edu.bd',  now()),
    (invited,  'invited-test@gmail.com',        now());

  update public.profiles set role = 'seller' where id in (seller_a, seller_c);
  update public.profiles set role = 'admin'  where id = admin_t;

  insert into public.stores (owner_id, business_name)
  values (seller_a, 'RLS Test Store A') returning id into v_store_a;
  insert into public.stores (owner_id, business_name)
  values (seller_c, 'RLS Test Store C') returning id into v_store_c;

  insert into public.listings (store_id, seller_id, title, price_bdt, quantity)
  values (v_store_a, seller_a, 'RLS Listing A', 100, 2) returning id into v_listing_a;
  insert into public.listings (store_id, seller_id, title, price_bdt, quantity)
  values (v_store_c, seller_c, 'RLS Listing C', 200, 1) returning id into v_listing_c;

  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (v_listing_a, buyer_a, seller_a) returning id into v_conv_a;
  insert into public.conversations (listing_id, buyer_id, seller_id)
  values (v_listing_c, buyer_b, seller_c) returning id into v_conv_c;

  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv_a, seller_a, 'hello from seller A');
  insert into public.messages (conversation_id, sender_id, body)
  values (v_conv_c, seller_c, 'hello from seller C');

  -- ---------- TEST 1: buyer cannot create a listing -------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', buyer_a, 'role', 'authenticated')::text, true);
  begin
    insert into public.listings (store_id, seller_id, title, price_bdt)
    values (v_store_a, buyer_a, 'sneaky listing', 1);
    results := results || e'\nFAIL  T1 buyer created a listing';
    failures := failures + 1;
  exception when insufficient_privilege then
    results := results || e'\nPASS  T1 buyer cannot create a listing';
  end;

  -- ---------- TEST 2: buyer cannot read another conversation's messages -----
  select count(*) into v_count from public.messages where conversation_id = v_conv_c;
  if v_count = 0 then
    results := results || e'\nPASS  T2 buyer cannot read others'' messages';
  else
    results := results || e'\nFAIL  T2 buyer read ' || v_count || ' foreign messages';
    failures := failures + 1;
  end if;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 3 (control): participant CAN read own thread -------------
  perform set_config('role', 'authenticated', true);
  select count(*) into v_count from public.messages where conversation_id = v_conv_a;
  if v_count >= 1 then
    results := results || e'\nPASS  T3 participant reads own messages (' || v_count || ')';
  else
    results := results || e'\nFAIL  T3 participant cannot read own messages';
    failures := failures + 1;
  end if;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 4: buyer cannot see others' conversations ----------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', buyer_b, 'role', 'authenticated')::text, true);
  select count(*) into v_count from public.conversations where id = v_conv_a;
  if v_count = 0 then
    results := results || e'\nPASS  T4 buyer cannot see foreign conversations';
  else
    results := results || e'\nFAIL  T4 buyer saw a foreign conversation';
    failures := failures + 1;
  end if;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 5: sold/hidden listings disappear from public ------------
  update public.listings set status = 'sold' where id = v_listing_a;
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', buyer_b, 'role', 'authenticated')::text, true);
  select count(*) into v_count from public.listings where id = v_listing_a;
  perform set_config('request.jwt.claims',
    json_build_object('sub', seller_a, 'role', 'authenticated')::text, true);
  select count(*) into v_rows from public.listings where id = v_listing_a;
  perform set_config('role', 'postgres', true);
  update public.listings set status = 'active' where id = v_listing_a;
  if v_count = 0 and v_rows = 1 then
    results := results || e'\nPASS  T5 sold listing hidden from public, visible to owner';
  else
    results := results || e'\nFAIL  T5 sold-listing visibility wrong (public=' || v_count || ', owner=' || v_rows || ')';
    failures := failures + 1;
  end if;

  -- ---------- TEST 6: seller cannot create a listing in another store -------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', seller_c, 'role', 'authenticated')::text, true);
  begin
    insert into public.listings (store_id, seller_id, title, price_bdt)
    values (v_store_a, seller_c, 'cross-store listing', 1);
    results := results || e'\nFAIL  T6 seller wrote into another store';
    failures := failures + 1;
  exception when insufficient_privilege then
    results := results || e'\nPASS  T6 seller cannot write into another store';
  end;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 7: non-owner cannot update a listing ---------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', buyer_a, 'role', 'authenticated')::text, true);
  update public.listings set title = 'hijacked' where id = v_listing_a;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    results := results || e'\nPASS  T7 non-owner cannot update a listing';
  else
    results := results || e'\nFAIL  T7 non-owner updated ' || v_rows || ' listing(s)';
    failures := failures + 1;
  end if;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 8: anonymous visitors cannot create listings -------------
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '', true);
  begin
    insert into public.listings (store_id, seller_id, title, price_bdt)
    values (v_store_a, seller_a, 'anon listing', 1);
    results := results || e'\nFAIL  T8 anon created a listing';
    failures := failures + 1;
  exception when insufficient_privilege then
    results := results || e'\nPASS  T8 anon cannot create listings';
  end;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 9: admin cannot promote to admin (super only) ------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', admin_t, 'role', 'authenticated')::text, true);
  begin
    update public.profiles set role = 'admin' where id = buyer_a;
    results := results || e'\nFAIL  T9 non-super admin promoted someone to admin';
    failures := failures + 1;
  exception when others then
    results := results || e'\nPASS  T9 non-super admin cannot promote admins';
  end;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 10: user cannot promote themselves ------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', buyer_a, 'role', 'authenticated')::text, true);
  begin
    update public.profiles set role = 'admin' where id = buyer_a;
    results := results || e'\nFAIL  T10 user self-promoted';
    failures := failures + 1;
  exception when others then
    results := results || e'\nPASS  T10 user cannot self-promote';
  end;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 11: invited non-campus email got the invited role ---------
  select count(*) into v_count
    from public.profiles p
   where p.id = invited and p.role = 'seller';
  if v_count = 1 then
    results := results || e'\nPASS  T11 invited email joined with invited role';
  else
    results := results || e'\nFAIL  T11 invited user missing or wrong role';
    failures := failures + 1;
  end if;

  -- ---------- TEST 12: non-campus, non-invited signup is rejected ------------
  begin
    insert into auth.users (id, email, email_confirmed_at)
    values ('10000000-0000-0000-0000-0000000000ff', 'outsider@gmail.com', now());
    results := results || e'\nFAIL  T12 outsider signup succeeded';
    failures := failures + 1;
  exception when check_violation then
    results := results || e'\nPASS  T12 outsider signup blocked by domain gate';
  end;

  -- ---------- TEST 13: messages are immutable ---------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', seller_a, 'role', 'authenticated')::text, true);
  begin
    update public.messages set body = 'edited'
     where conversation_id = v_conv_a and sender_id = seller_a;
    get diagnostics v_rows = row_count;
    if v_rows = 0 then
      results := results || e'\nPASS  T13 message body not editable (RLS-filtered)';
    else
      results := results || e'\nFAIL  T13 message body was editable';
      failures := failures + 1;
    end if;
  exception when others then
    results := results || e'\nPASS  T13 message body not editable (trigger-enforced)';
  end;
  perform set_config('role', 'postgres', true);

  -- ---------- TEST 14: ensure_super_admin cannot be used to self-promote ----
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', buyer_b, 'role', 'authenticated')::text, true);
  perform public.ensure_super_admin();
  select count(*) into v_count from public.profiles where id = buyer_b and role = 'admin';
  perform set_config('role', 'postgres', true);
  if v_count = 0 then
    results := results || e'\nPASS  T14 random user cannot self-promote via ensure_super_admin';
  else
    results := results || e'\nFAIL  T14 ensure_super_admin escalated a random user';
    failures := failures + 1;
  end if;

  -- ---------- TEST 15: super-admin list sanity --------------------------------
  select count(*) into v_count
    from unnest(public.super_admin_emails()) e
   where lower(e) in ('ihrafi02ctg@gmail.com', '242016312@eastdelta.edu.bd');
  if v_count = 2 then
    results := results || e'\nPASS  T15 super-admin list matches the configured pair';
  else
    results := results || e'\nFAIL  T15 super-admin list drifted';
    failures := failures + 1;
  end if;

  -- ---------- TEST 16: super-admin email is promoted at signup ----------------
  execute $ddl$ create or replace function public.super_admin_emails()
    returns text[] language sql immutable as $fn$
      select array['rls-super-t@eastdelta.edu.bd']::text[];
    $fn$ $ddl$;

  insert into auth.users (id, email, email_confirmed_at)
  values ('10000000-0000-0000-0000-000000000007', 'rls-super-t@eastdelta.edu.bd', now());

  select count(*) into v_count from public.profiles
   where id = '10000000-0000-0000-0000-000000000007' and role = 'admin';
  if v_count = 1 then
    results := results || e'\nPASS  T16 super-admin email becomes admin at signup';
  else
    results := results || e'\nFAIL  T16 super-admin signup did not become admin';
    failures := failures + 1;
  end if;

  -- ---------- TEST 17: ensure_super_admin promotes a listed caller (self only)
  execute $ddl$ create or replace function public.super_admin_emails()
    returns text[] language sql immutable as $fn$
      select array['rls-buyer-b@eastdelta.edu.bd']::text[];
    $fn$ $ddl$;

  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', buyer_b, 'role', 'authenticated')::text, true);
  perform public.ensure_super_admin();
  select count(*) into v_count from public.profiles where id = buyer_b and role = 'admin';
  perform set_config('role', 'postgres', true);
  if v_count = 1 then
    results := results || e'\nPASS  T17 ensure_super_admin promotes a listed caller (self only)';
  else
    results := results || e'\nFAIL  T17 ensure_super_admin did not promote listed caller';
    failures := failures + 1;
  end if;

  -- ---------- TEST 18: anonymous visitors cannot read any listing (ADR-015) --
  perform set_config('role', 'anon', true);
  perform set_config('request.jwt.claims', '', true);
  select count(*) into v_count from public.listings;
  if v_count = 0 then
    results := results || e'\nPASS  T18 anon sees zero listings (sign-in required)';
  else
    results := results || e'\nFAIL  T18 anon read ' || v_count || ' listing(s)';
    failures := failures + 1;
  end if;

  -- ---------- TEST 19: anonymous visitors cannot read listing photos ---------
  select count(*) into v_count from public.listing_images;
  if v_count = 0 then
    results := results || e'\nPASS  T19 anon sees zero listing photos';
  else
    results := results || e'\nFAIL  T19 anon read ' || v_count || ' photo row(s)';
    failures := failures + 1;
  end if;

  -- ---------- TEST 20: anonymous visitors cannot read store pages -----------
  select count(*) into v_count from public.stores;
  if v_count = 0 then
    results := results || e'\nPASS  T20 anon sees zero stores';
  else
    results := results || e'\nFAIL  T20 anon read ' || v_count || ' store(s)';
    failures := failures + 1;
  end if;
  perform set_config('role', 'postgres', true);

  raise exception e'RLS CHECKLIST — % failure(s)%', failures, results;
end;
$rls_checklist$;
