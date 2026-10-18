"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction, requireAdminContext } from "@/lib/admin";
import { paymentProvider } from "@/lib/payments/provider";
import { idRegex } from "@/lib/validation/admin";
import { errorState, successState, type ActionState } from "@/lib/validation/helpers";

function stringField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * Refund a succeeded sandbox payment. The provider seam handles the (mock)
 * money movement; the row then moves succeeded → refunded with a timestamp.
 * The deal itself is left untouched (its status reflects the completed
 * handover, not the money) — refunds are recorded, not reversed.
 */
export async function refundPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const paymentId = stringField(formData, "payment_id");
  if (!idRegex.test(paymentId)) return errorState("Unknown payment.");

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, transaction_id, amount_bdt")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment) return errorState("Payment not found.");
  if (payment.status !== "succeeded") {
    return errorState("Only succeeded payments can be refunded.");
  }

  const refunded = await paymentProvider.refund(payment.transaction_id);
  if (!refunded.ok) {
    return errorState("The provider refused the refund — try again.");
  }

  const { error } = await supabase
    .from("payments")
    .update({ status: "refunded", refunded_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) return errorState("Could not record the refund — try again.");

  await logAdminAction(supabase, {
    action: "payment.refund",
    targetType: "payment",
    targetId: paymentId,
    details: {
      transaction_id: payment.transaction_id,
      amount_bdt: payment.amount_bdt,
    },
  });

  revalidatePath("/admin/payments");
  return successState(
    `Refunded \u09f3${payment.amount_bdt.toLocaleString()} (${payment.transaction_id}).`,
  );
}
