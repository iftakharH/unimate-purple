"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction, requireAdminContext } from "@/lib/admin";
import { adminDealTargetSchema, idRegex } from "@/lib/validation/admin";
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
 * Admin override: cancel a stuck deal or mark it completed. Admins bypass
 * the per-actor state machine (the DB trigger returns early for is_admin()),
 * and completion still runs the normal side effects (stock decrement,
 * sold/sold_out flip, notifications, history row).
 */
export async function adminDealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const dealId = stringField(formData, "deal_id");
  if (!idRegex.test(dealId)) return errorState("Unknown deal.");

  const parsed = adminDealTargetSchema.safeParse({
    target: stringField(formData, "target"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("id, status, listings(title)")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return errorState("Deal not found.");
  if (deal.status === parsed.data.target) {
    return errorState("The deal is already in that state.");
  }

  const { error } = await supabase
    .from("deals")
    .update({
      status: parsed.data.target,
      cancel_reason:
        parsed.data.target === "cancelled" ? "Cancelled by an admin." : null,
    })
    .eq("id", dealId);
  if (error) return errorState("Could not update the deal — try again.");

  await logAdminAction(supabase, {
    action: parsed.data.target === "cancelled" ? "deal.cancel" : "deal.complete",
    targetType: "deal",
    targetId: dealId,
    details: {
      listing: deal.listings?.title ?? null,
      from: deal.status,
      to: parsed.data.target,
    },
  });

  revalidatePath("/admin/deals");
  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return successState(
    parsed.data.target === "cancelled"
      ? "Deal cancelled — both parties have been notified."
      : "Deal completed — stock and the listing status updated.",
  );
}
