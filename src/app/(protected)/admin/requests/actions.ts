"use server";

import { revalidatePath } from "next/cache";

import { getAuthContext } from "@/lib/auth";
import { reviewRequestSchema } from "@/lib/validation/seller";
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

export async function reviewSellerRequestAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase, user, profile } = await getAuthContext();
  if (!user || profile?.role !== "admin") {
    return errorState("Admins only.");
  }

  const parsed = reviewRequestSchema.safeParse({
    request_id: stringField(formData, "request_id"),
    decision: stringField(formData, "decision"),
    admin_note: stringField(formData, "admin_note"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  // The DB trigger performs the side effects on approval: role → seller,
  // store created (unique slug), requester notified. reviewed_by/reviewed_at
  // are stamped from this admin's session.
  const { data: updated, error } = await supabase
    .from("seller_requests")
    .update({
      status: parsed.data.decision,
      admin_note: parsed.data.admin_note === "" ? null : parsed.data.admin_note,
    })
    .eq("id", parsed.data.request_id)
    .eq("status", "pending")
    .select("id, business_name, user_id");

  if (error) return errorState("Could not save the decision — please try again.");
  if (!updated || updated.length === 0) {
    return errorState("This request was already reviewed.");
  }

  const request = updated[0];

  const { error: auditError } = await supabase.from("admin_audit_log").insert({
    action:
      parsed.data.decision === "approved" ? "seller_request.approve" : "seller_request.reject",
    target_type: "seller_request",
    target_id: request.id,
    details: {
      business_name: request.business_name,
      user_id: request.user_id,
      note: parsed.data.admin_note || null,
    },
  });
  void auditError;

  revalidatePath("/admin/requests");

  return successState(
    parsed.data.decision === "approved"
      ? `“${request.business_name}” is approved — the store is live and the seller was notified.`
      : `“${request.business_name}” was rejected and the applicant was notified.`,
  );
}
