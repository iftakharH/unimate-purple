import { readFileSync } from "node:fs";
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

// Test accounts to remove (profiles + owned data cascade from auth.users).
const TEST_EMAILS = ["test-admin@eastdelta.edu.bd", "test-buyer@eastdelta.edu.bd"];
const TEST_USER_IDS = [
  "5da0a920-17ea-4b00-91cd-675f4cbd8fb0",
  "1cc5996a-94d5-4cc8-99e9-bb3a088ca1f6",
];

const report = { storageRemoved: {}, usersDeleted: {}, invitesRemoved: 0 };

// 1) Storage objects owned by the test accounts (paths are namespaced by user id).
for (const bucket of ["avatars", "listing-images", "store-assets"]) {
  let removed = 0;
  for (const userId of TEST_USER_IDS) {
    const { data: files } = await admin.storage.from(bucket).list(userId, { limit: 1000 });
    if (!files?.length) continue;
    const paths = files.filter((f) => f.id).map((f) => `${userId}/${f.name}`);
    if (!paths.length) continue;
    const { error } = await admin.storage.from(bucket).remove(paths);
    if (!error) removed += paths.length;
  }
  report.storageRemoved[bucket] = removed;
}

// 2) Delete the auth users (profile + every owned row cascades).
for (const email of TEST_EMAILS) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = list?.users?.find((u) => u.email?.toLowerCase() === email);
  if (!user) {
    report.usersDeleted[email] = "not found";
    continue;
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  report.usersDeleted[email] = error ? `error: ${error.message}` : "deleted";
}

// 3) Remove leftover test invites (existing accounts already consumed theirs).
const { data: invites } = await admin
  .from("invited_emails")
  .select("email")
  .in("email", TEST_EMAILS);
if (invites?.length) {
  const { count } = await admin
    .from("invited_emails")
    .delete({ count: "exact" })
    .in("email", TEST_EMAILS);
  report.invitesRemoved = count ?? 0;
}

console.log(JSON.stringify(report));
