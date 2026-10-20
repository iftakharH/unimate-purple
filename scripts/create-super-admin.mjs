import { readFileSync } from "node:fs";
import { randomInt } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => /^[A-Z][A-Z0-9_]*=/.test(line))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
let password = "";
for (let i = 0; i < 16; i += 1) password += alphabet[randomInt(0, alphabet.length)];
password += `!${randomInt(10, 100)}`;

const email = "ihrafi02ctg@gmail.com";

let userId = null;
const { data: created, error: createError } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Iftakhar Hossain" },
});

if (createError) {
  if (!/registered|exists/i.test(createError.message)) {
    console.log(JSON.stringify({ ok: false, step: "create", error: createError.message }));
    process.exit(1);
  }
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!existing) {
    console.log(JSON.stringify({ ok: false, step: "lookup" }));
    process.exit(1);
  }
  userId = existing.id;
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
  });
  if (updateError) {
    console.log(JSON.stringify({ ok: false, step: "update", error: updateError.message }));
    process.exit(1);
  }
} else {
  userId = created.user.id;
}

const { data: profile, error: profileError } = await admin
  .from("profiles")
  .update({ role: "admin", must_change_password: false, is_banned: false, full_name: "Iftakhar Hossain" })
  .eq("id", userId)
  .select("id, full_name, role, must_change_password")
  .single();

console.log(
  JSON.stringify({
    ok: !profileError,
    email,
    password,
    userId,
    profile,
    profileError: profileError?.message ?? null,
  }),
);
