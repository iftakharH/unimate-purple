"use server";

import { redirect } from "next/navigation";

import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/urls";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/validation/auth";
import {
  errorState,
  fieldErrorsOf,
  successState,
  type ActionState,
} from "@/lib/validation/helpers";
import { sanitizeNextPath } from "@/lib/urls";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Map a few known Supabase auth errors to friendly copy. */
function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Wrong email or password.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for the link.";
  if (m.includes("user already registered")) return "That email already has an account — try signing in.";
  if (m.includes("rate limit") || m.includes("too many")) return "Too many attempts — wait a minute and try again.";
  if (m.includes("for security purposes")) return "A link was just sent — wait a minute before requesting another.";
  return "Something went wrong — please try again.";
}

// ---------- sign up ----------------------------------------------------------------

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = signUpSchema.safeParse({
    full_name: stringField(formData, "full_name"),
    email: stringField(formData, "email"),
    password: stringField(formData, "password"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return errorState(friendlyAuthError(error.message));
  }

  // Email confirmation disabled in the project -> an immediate session exists.
  if (data.session) {
    redirect("/");
  }

  return successState(
    `Almost there — we sent a confirmation link to ${parsed.data.email}. Check your inbox (and spam folder).`,
  );
}

// ---------- sign in ----------------------------------------------------------------

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const next = sanitizeNextPath(stringField(formData, "next"));

  const parsed = signInSchema.safeParse({
    email: stringField(formData, "email"),
    password: stringField(formData, "password"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return errorState(friendlyAuthError(error?.message ?? ""));
  }

  // Belt-and-braces super-admin bootstrap (no-op for everyone else).
  await supabase.rpc("ensure_super_admin");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_banned, must_change_password")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.is_banned) {
    await supabase.auth.signOut();
    return errorState("This account is suspended. Contact an admin if you think this is a mistake.");
  }

  if (profile?.must_change_password) {
    redirect("/change-password?forced=1");
  }

  redirect(next);
}

// ---------- sign out ----------------------------------------------------------------

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/** Invalidates every session of this user on every device. */
export async function signOutEverywhereAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

// ---------- email verification / recovery ------------------------------------------

export async function resendVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = stringField(formData, "email").trim().toLowerCase();
  if (!email) return errorState("Enter your email address.");

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error) return errorState(friendlyAuthError(error.message));

  return successState("Confirmation link sent — check your inbox (and spam folder).");
}

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: stringField(formData, "email") });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) return errorState(friendlyAuthError(error.message));

  // Always the same answer — never reveal whether an account exists.
  return successState(
    `If an account exists for ${parsed.data.email}, a reset link is on its way.`,
  );
}

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: stringField(formData, "password"),
    confirm: stringField(formData, "confirm"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { supabase, user } = await getAuthContext();
  if (!user) {
    return errorState("This reset link has expired — request a new one.");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return errorState(friendlyAuthError(error.message));

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  return successState("Password updated. You can now use it to sign in.");
}

// ---------- change password (settings + forced flow) ---------------------------------

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse({
    current: stringField(formData, "current"),
    password: stringField(formData, "password"),
    confirm: stringField(formData, "confirm"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { supabase, user } = await getAuthContext();
  if (!user?.email) {
    return errorState("Your session expired — sign in again.");
  }

  // Re-authenticate with the current password before changing it.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });
  if (verifyError) {
    return errorState("Your current password is not correct.", {
      current: ["Wrong password"],
    });
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return errorState(friendlyAuthError(error.message));

  await supabase
    .from("profiles")
    .update({ must_change_password: false })
    .eq("id", user.id);

  return successState("Password changed.");
}
