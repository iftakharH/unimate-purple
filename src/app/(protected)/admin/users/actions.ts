"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction, requireAdminContext } from "@/lib/admin";
import { isSuperAdminEmail } from "@/lib/env.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminUserRoleSchema, idRegex } from "@/lib/validation/admin";
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

/** The trigger speaks clearly — show its words, never a generic mask. */
function humanize(message: string): string {
  if (
    message.includes("Super Admin") ||
    message.includes("Only Super Admins") ||
    message.includes("Only admins")
  ) {
    return message;
  }
  return "That didn't work — refresh the page and try again.";
}

async function getTargetEmail(id: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(id);
  return data.user?.email ?? null;
}

export async function updateUserRoleAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const targetId = stringField(formData, "user_id");
  if (!idRegex.test(targetId)) return errorState("Unknown member.");

  const parsed = adminUserRoleSchema.safeParse({ role: stringField(formData, "role") });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const email = await getTargetEmail(targetId);
  if (!email) return errorState("Member not found.");

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return errorState("Member not found.");

  const viewerIsSuper = isSuperAdminEmail(user.email ?? "");
  if (isSuperAdminEmail(email) && !viewerIsSuper) {
    return errorState("Super Admin accounts can only be modified by Super Admins.");
  }
  if (!viewerIsSuper && (target.role === "admin" || parsed.data.role === "admin")) {
    return errorState("Only Super Admins can promote or demote admins.");
  }
  if (targetId === user.id) {
    return errorState("You cannot change your own role.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", targetId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: "user.role",
    targetType: "user",
    targetId,
    details: { email, from: target.role, to: parsed.data.role },
  });

  revalidatePath("/admin/users");
  return successState(`${email} is now ${parsed.data.role}.`);
}

export async function toggleBanAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const targetId = stringField(formData, "user_id");
  const next = stringField(formData, "next");
  if (!idRegex.test(targetId)) return errorState("Unknown member.");
  if (next !== "ban" && next !== "unban") return errorState("Unknown action.");

  if (targetId === user.id) {
    return errorState("You cannot ban your own account.");
  }

  const email = await getTargetEmail(targetId);
  if (!email) return errorState("Member not found.");

  const viewerIsSuper = isSuperAdminEmail(user.email ?? "");
  if (isSuperAdminEmail(email) && !viewerIsSuper) {
    return errorState("Super Admin accounts can only be modified by Super Admins.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_banned: next === "ban" })
    .eq("id", targetId);
  if (error) return errorState(humanize(error.message));

  await logAdminAction(supabase, {
    action: next === "ban" ? "user.ban" : "user.unban",
    targetType: "user",
    targetId,
    details: { email },
  });

  revalidatePath("/admin/users");
  return successState(
    next === "ban"
      ? `${email} is banned — they can sign in but cannot trade.`
      : `${email} is unbanned.`,
  );
}

export async function deleteUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const targetId = stringField(formData, "user_id");
  if (!idRegex.test(targetId)) return errorState("Unknown member.");
  if (targetId === user.id) return errorState("You cannot delete your own account here.");

  const email = await getTargetEmail(targetId);
  if (!email) return errorState("Member not found.");

  if (isSuperAdminEmail(email)) {
    return errorState("Super Admin accounts cannot be deleted.");
  }

  const viewerIsSuper = isSuperAdminEmail(user.email ?? "");
  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", targetId)
    .maybeSingle();
  if (target?.role === "admin" && !viewerIsSuper) {
    return errorState("Only Super Admins can delete admin accounts.");
  }

  // Full delete: auth user + profile + every owned row (FK cascades).
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    return errorState("Could not delete the account — try again.");
  }

  await logAdminAction(supabase, {
    action: "user.delete",
    targetType: "user",
    targetId,
    details: { email },
  });

  revalidatePath("/admin/users");
  return successState(`${email} and all of their data are deleted.`);
}
