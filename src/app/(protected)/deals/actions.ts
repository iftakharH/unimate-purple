"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth";
import { paymentProvider, type PaymentMethod } from "@/lib/payments/provider";
import { cancelDealSchema, payDealSchema } from "@/lib/validation/deal";
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

/** The state machine speaks human — show its exact words, never a generic mask. */
function dealError(message: string): string {
  if (
    message.startsWith("Only the") ||
    message.startsWith("Invalid transition") ||
    message.startsWith("A ") ||
    message.startsWith("Payment records") ||
    message.includes("pay-on-campus")
  ) {
    return message;
  }
  return "That didn't work — refresh the page and try again.";
}

async function transitionDeal(
  formData: FormData,
  target: "accepted" | "rejected" | "handed_over" | "completed" | "cancelled",
  successMessage: string,
  extra: Record<string, unknown> = {},
): Promise<ActionState> {
  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Your session expired — sign in again.");

  const dealId = stringField(formData, "deal_id");
  if (!/^[0-9a-f-]{36}$/i.test(dealId)) return errorState("Unknown deal.");

  const { data: updated, error } = await supabase
    .from("deals")
    .update({ status: target, ...extra })
    .eq("id", dealId)
    .select("id");

  if (error) return errorState(dealError(error.message));
  if (!updated || updated.length === 0) return errorState("Deal not found.");

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return successState(successMessage);
}

export async function acceptDealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return transitionDeal(
    formData,
    "accepted",
    "Deal accepted — arrange the handover with the buyer.",
  );
}

export async function rejectDealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return transitionDeal(formData, "rejected", "Deal rejected.");
}

/** Campus path: the seller confirms the meet-up handover — done in one step. */
export async function confirmCampusHandoverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return transitionDeal(
    formData,
    "completed",
    "Handover confirmed — the deal is complete.",
  );
}

/** In-app path: seller confirms the handover after payment. */
export async function markHandedOverAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return transitionDeal(formData, "handed_over", "Marked as handed over.");
}

/** In-app path: buyer confirms receipt — completes the deal. */
export async function confirmReceiptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return transitionDeal(
    formData,
    "completed",
    "Receipt confirmed — the deal is complete.",
  );
}

export async function cancelDealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = cancelDealSchema.safeParse({
    reason: stringField(formData, "reason"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }
  return transitionDeal(formData, "cancelled", "Deal cancelled.", {
    cancel_reason: parsed.data.reason === "" ? null : parsed.data.reason,
  });
}

/**
 * Sandbox checkout (pay-in-app path). Flow: provider creates the intent →
 * payments row (pending) → provider confirms → row becomes succeeded → the
 * database flips the deal to `paid`. No card data is ever collected.
 */
export async function payDealAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user } = await getAuthContext();
  if (!user) return errorState("Your session expired — sign in again.");

  const dealId = stringField(formData, "deal_id");
  if (!/^[0-9a-f-]{36}$/i.test(dealId)) return errorState("Unknown deal.");

  const parsed = payDealSchema.safeParse({ method: stringField(formData, "method") });
  if (!parsed.success) {
    return errorState(parsed.error.issues[0]?.message ?? "Pick a payment method.");
  }

  const { data: deal } = await supabase
    .from("deals")
    .select("id, buyer_id, status, payment_mode, amount_bdt")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return errorState("Deal not found.");
  if (deal.buyer_id !== user.id) return errorState("Only the buyer can pay.");
  if (deal.payment_mode !== "pay_in_app") {
    return errorState("This deal is pay-on-campus — there is nothing to pay here.");
  }
  if (deal.status !== "accepted") {
    return errorState("This deal is not awaiting payment right now.");
  }

  const created = await paymentProvider.createPayment({
    amountBdt: deal.amount_bdt,
    method: parsed.data.method as PaymentMethod,
    dealId: deal.id,
  });

  const { error: insertError } = await supabase.from("payments").insert({
    deal_id: deal.id,
    payer_id: user.id,
    method: parsed.data.method,
    status: "pending",
    amount_bdt: deal.amount_bdt,
    transaction_id: created.transactionId,
  });
  if (insertError) return errorState("Could not start the payment — try again.");

  const confirmed = await paymentProvider.confirmPayment(created.transactionId);
  if (!confirmed.ok) {
    await supabase
      .from("payments")
      .update({ status: "failed", failure_reason: confirmed.failureReason })
      .eq("transaction_id", created.transactionId);
    return errorState(confirmed.failureReason);
  }

  const { error: confirmError } = await supabase
    .from("payments")
    .update({ status: "succeeded" })
    .eq("transaction_id", created.transactionId);
  if (confirmError) {
    return errorState("Payment recorded but confirmation failed — check Deals.");
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${dealId}`);
  return successState("Payment successful (sandbox) — meet up to complete the handover.");
}
