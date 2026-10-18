"use server";

import { revalidatePath } from "next/cache";

import { logAdminAction, requireAdminContext } from "@/lib/admin";
import { adminReportDecisionSchema, idRegex } from "@/lib/validation/admin";
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

/** Mark a report reviewed or dismissed. */
export async function decideReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const reportId = stringField(formData, "report_id");
  if (!idRegex.test(reportId)) return errorState("Unknown report.");

  const parsed = adminReportDecisionSchema.safeParse({
    decision: stringField(formData, "decision"),
  });
  if (!parsed.success) {
    return errorState("Please fix the highlighted fields.", fieldErrorsOf(parsed.error));
  }

  const { data: report } = await supabase
    .from("reports")
    .select("id, status")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return errorState("Report not found.");

  const { error } = await supabase
    .from("reports")
    .update({
      status: parsed.data.decision,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return errorState("Could not update the report — try again.");

  await logAdminAction(supabase, {
    action: `report.${parsed.data.decision}`,
    targetType: "report",
    targetId: reportId,
    details: { from: report.status },
  });

  revalidatePath("/admin/reports");
  return successState(
    parsed.data.decision === "reviewed" ? "Report marked reviewed." : "Report dismissed.",
  );
}

/** One-click moderation: hide the reported listing and close the report. */
export async function hideReportedListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase, user } = auth;

  const reportId = stringField(formData, "report_id");
  const listingId = stringField(formData, "listing_id");
  if (!idRegex.test(reportId) || !idRegex.test(listingId)) {
    return errorState("Unknown report.");
  }

  const { data: listing } = await supabase
    .from("listings")
    .select("id, title")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing) return errorState("The listing no longer exists.");

  const { error: listingError } = await supabase
    .from("listings")
    .update({ status: "hidden" })
    .eq("id", listingId);
  if (listingError) return errorState("Could not hide the listing — try again.");

  const { error: reportError } = await supabase
    .from("reports")
    .update({
      status: "reviewed",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (reportError) return errorState("Listing hidden, but the report could not be closed — try again.");

  await logAdminAction(supabase, {
    action: "report.hide_listing",
    targetType: "listing",
    targetId: listingId,
    details: { report_id: reportId, title: listing.title },
  });

  revalidatePath("/admin/reports");
  revalidatePath("/admin/listings");
  revalidatePath("/browse");
  revalidatePath("/");
  revalidatePath(`/listing/${listingId}`);
  return successState(`"${listing.title}" is hidden and the report is closed.`);
}

export async function deleteReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const auth = await requireAdminContext();
  if (!auth.ok) return auth.state;
  const { supabase } = auth;

  const reportId = stringField(formData, "report_id");
  if (!idRegex.test(reportId)) return errorState("Unknown report.");

  const { data: report } = await supabase
    .from("reports")
    .select("id, target_type")
    .eq("id", reportId)
    .maybeSingle();
  if (!report) return errorState("Report not found.");

  const { error } = await supabase.from("reports").delete().eq("id", reportId);
  if (error) return errorState("Could not delete the report — try again.");

  await logAdminAction(supabase, {
    action: "report.delete",
    targetType: "report",
    targetId: reportId,
    details: { target_type: report.target_type },
  });

  revalidatePath("/admin/reports");
  return successState("Report deleted.");
}
