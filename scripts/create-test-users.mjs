/**
 * Dev utility: create (or reset) throwaway accounts for manual/browser testing.
 *
 * Uses the Auth admin API with `email_confirm: true` — NO emails are sent.
 * Accounts are ordinary users; promote one via SQL afterwards if you need an
 * admin (the hardcoded Super Admin list only matches real people).
 *
 * Usage:  node scripts/create-test-users.mjs [--delete]
 *
 * ⚠️ Test accounts only. Never point this at real people's addresses.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const raw = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2];
  }
  return env;
}

const env = loadEnv();
const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const USERS = [
  {
    email: "test-admin@eastdelta.edu.bd",
    password: "TestAdmin123",
    full_name: "Test Admin",
  },
  {
    email: "test-buyer@eastdelta.edu.bd",
    password: "TestBuyer123",
    full_name: "Test Buyer",
  },
];

const deleting = process.argv.includes("--delete");

for (const u of USERS) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users.find((x) => x.email === u.email);

  if (deleting) {
    if (existing) {
      await admin.auth.admin.deleteUser(existing.id);
      console.log(`deleted  ${u.email}`);
    } else {
      console.log(`skipped  ${u.email} (not found)`);
    }
    continue;
  }

  if (existing) {
    // Reset the password so tests are deterministic.
    await admin.auth.admin.updateUserById(existing.id, { password: u.password });
    console.log(`reset    ${u.email} -> ${u.password}`);
    continue;
  }

  const { error } = await admin.auth.admin.createUser({
    email: u.email,
    password: u.password,
    email_confirm: true,
    user_metadata: { full_name: u.full_name },
  });
  if (error) {
    console.error(`failed   ${u.email}: ${error.message}`);
    process.exitCode = 1;
  } else {
    console.log(`created  ${u.email} -> ${u.password}`);
  }
}

console.log(deleting ? "\nCleanup done." : "\nTest users ready.");
