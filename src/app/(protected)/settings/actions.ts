"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";
import { env } from "@/lib/env";
import { isSuperAdminEmail } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  deleteAccountSchema,
  updateEmailSchema,
  updateProfileSchema,
} from "@/lib/validation/auth";
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

function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "That email already has an account.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Too many attempts — wait a minute and try again.";
  return "Something went wrong — please try again.";
}

// ---------- profile ------------------------------------------------------------------

export async function updateProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateProfileSchema.safeParse({
    full_name: stringField(formData, "full_name"),
    phone: stringField(formData, "phone"),
    bio: stringField(formData, "bio"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Your session expired — sign in again.");

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone === "" ? null : parsed.data.phone,
      bio: parsed.data.bio === "" ? null : parsed.data.bio,
    })
    .eq("id", user.id);

  if (error) return errorState("Could not save your profile — please try again.");

  revalidatePath("/settings");
  return successState("Profile saved.");
}

// ---------- avatar --------------------------------------------------------------------

export async function updateAvatarAction(publicUrl: string): Promise<ActionState> {
  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Your session expired — sign in again.");

  // Only accept URLs inside this project's public avatars bucket, under the
  // caller's own folder — never arbitrary remote URLs.
  const prefix = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/${user.id}/`;
  if (!publicUrl.startsWith(prefix) || publicUrl.includes("..")) {
    return errorState("That image URL is not allowed.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", user.id);
  if (error) return errorState("Could not save your photo — please try again.");

  revalidatePath("/settings");
  return successState("Photo updated.");
}

// ---------- email change ----------------------------------------------------------------

export async function updateEmailAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = updateEmailSchema.safeParse({ email: stringField(formData, "email") });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Your session expired — sign in again.");
  if (parsed.data.email === user.email?.toLowerCase()) {
    return errorState("That is already your email address.");
  }

  const { error } = await supabase.auth.updateUser({ email: parsed.data.email });
  if (error) return errorState(friendlyAuthError(error.message));

  return successState(
    `Confirmation links were sent to both your current and new address. The change completes when both are confirmed.`,
  );
}

// ---------- delete account ----------------------------------------------------------------

export async function deleteAccountAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = deleteAccountSchema.safeParse({
    current_password: stringField(formData, "current_password"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { supabase, user } = await getAuthContext();
  if (!user?.email) return errorState("Your session expired — sign in again.");

  if (isSuperAdminEmail(user.email)) {
    return errorState(
      "Super Admin accounts are protected and cannot be deleted this way.",
    );
  }

  // Re-authenticate before an irreversible action.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verifyError) {
    return errorState("That password is not correct.", {
      current_password: ["Wrong password"],
    });
  }

  const admin = createAdminClient();

  // Audit before the row (and actor) disappears.
  await admin.from("admin_audit_log").insert({
    actor_id: user.id,
    action: "user.self_delete",
    target_type: "user",
    target_id: user.id,
    details: { email: user.email },
  });

  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return errorState("Could not delete your account — please try again.");

  await supabase.auth.signOut().catch(() => undefined);
  redirect("/login?deleted=1");
}
