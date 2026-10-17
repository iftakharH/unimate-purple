"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth";
import { isSuperAdminEmail } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/urls";
import { createUserSchema, inviteUserSchema } from "@/lib/validation/auth";
import {
  errorState,
  fieldErrorsOf,
  successState,
  type ActionState,
} from "@/lib/validation/helpers";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Both flows re-check the caller here — the page guard alone is never enough
 * (docs/…: always verify authorization inside each Server Action).
 */
async function requireAdminContext() {
  const ctx = await getAuthContext();
  const { user, profile } = ctx;
  if (!user || profile?.role !== "admin") {
    return { ok: false as const, state: errorState("Admins only.") };
  }
  return { ok: true as const, supabase: ctx.supabase, user, profile };
}

// ---------- invite by email --------------------------------------------------------

export async function inviteUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const parsed = inviteUserSchema.safeParse({
    email: stringField(formData, "email"),
    role: stringField(formData, "role"),
    note: stringField(formData, "note") || undefined,
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  // Creating an admin is a Super Admin-only power (mirrors the DB trigger).
  if (parsed.data.role === "admin" && !isSuperAdminEmail(user.email ?? "")) {
    return errorState("Only Super Admins can invite admins.");
  }

  // 1) Register the invite — this is also what unlocks the signup domain gate
  //    for non-campus emails.
  const { error: insertError } = await supabase.from("invited_emails").insert({
    email: parsed.data.email,
    role: parsed.data.role,
    note: parsed.data.note ?? null,
  });
  if (insertError) {
    if (insertError.code === "23505") {
      return errorState("That email is already invited.");
    }
    return errorState("Could not save the invite — please try again.");
  }

  // 2) Send the Supabase invite email (set-password link). If sending fails the
  //    invite row stays — the person can still sign up with that email.
  const admin = createAdminClient();
  const { error: sendError } = await admin.auth.admin.inviteUserByEmail(
    parsed.data.email,
    { redirectTo: `${siteUrl()}/auth/callback` },
  );

  const { error: auditError } = await supabase.from("admin_audit_log").insert({
    action: "user.invite",
    target_type: "user",
    target_id: parsed.data.email,
    details: { email: parsed.data.email, role: parsed.data.role, email_sent: !sendError },
  });
  void auditError;

  revalidatePath("/admin/users");

  if (sendError) {
    return successState(
      `Invite saved for ${parsed.data.email}, but the email could not be sent (${sendError.message}). They can still sign up with this address once SMTP is configured.`,
    );
  }
  return successState(`Invite email sent to ${parsed.data.email}.`);
}

// ---------- direct create with temporary password ------------------------------------

export async function createUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const parsed = createUserSchema.safeParse({
    email: stringField(formData, "email"),
    full_name: stringField(formData, "full_name"),
    role: stringField(formData, "role"),
    password: stringField(formData, "password"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  if (parsed.data.role === "admin" && !isSuperAdminEmail(user.email ?? "")) {
    return errorState("Only Super Admins can create admin accounts.");
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true, // the admin vouches for the address
    user_metadata: { full_name: parsed.data.full_name },
  });

  if (error) {
    const m = error.message.toLowerCase();
    if (m.includes("already")) return errorState("That email already has an account.");
    return errorState("Could not create the account — please try again.");
  }

  // The signup trigger created the profile (role: buyer). Apply the chosen
  // role and force a password change on first sign-in.
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      must_change_password: true,
    })
    .eq("id", data.user.id);

  const { error: auditError } = await supabase.from("admin_audit_log").insert({
    action: "user.create",
    target_type: "user",
    target_id: data.user.id,
    details: { email: parsed.data.email, role: parsed.data.role },
  });
  void auditError;

  revalidatePath("/admin/users");

  if (profileError) {
    return successState(
      `Account created for ${parsed.data.email}, but the role update failed — fix it from the users table.`,
    );
  }
  return successState(
    `Account created for ${parsed.data.email}. Share the temporary password with them securely — they must change it at first sign-in.`,
  );
}
